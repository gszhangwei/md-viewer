/* md-viewer client.
 * Loads the file tree, renders documents, polls for live reload,
 * builds an active-section TOC, and supports in-document search.
 */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const fileTreeEl = $("#file-tree");
  const filterInput = $("#file-filter");
  const contentEl = $("#content");
  const tocEl = $("#toc");
  const tocPanel = $("#toc-panel");
  const layoutEl = $("#layout");
  const crumbsEl = $("#crumbs");
  const statusEl = $("#status");
  const contentSearch = $("#content-search");
  const toggleTocBtn = $("#toggle-toc");

  let currentPath = null;
  let currentMtime = null;
  let pollTimer = null;
  let scrollSpyObserver = null;

  /* -------------------- File tree -------------------- */

  function renderTree(nodes, container) {
    container.innerHTML = "";
    nodes.forEach((node) => container.appendChild(renderNode(node)));
  }

  function renderNode(node) {
    const wrap = document.createElement("div");
    const row = document.createElement("div");
    row.className = "tree-node " + node.type;
    row.dataset.path = node.path;
    row.dataset.name = node.name.toLowerCase();

    if (node.type === "dir") {
      const twisty = document.createElement("span");
      twisty.className = "twisty";
      twisty.textContent = "▾";
      row.appendChild(twisty);
      row.appendChild(document.createTextNode(node.name + "/"));

      const childWrap = document.createElement("div");
      childWrap.className = "tree-children";
      node.children.forEach((c) => childWrap.appendChild(renderNode(c)));

      row.addEventListener("click", (e) => {
        e.stopPropagation();
        row.classList.toggle("collapsed");
        childWrap.classList.toggle("hidden");
      });

      wrap.appendChild(row);
      wrap.appendChild(childWrap);
    } else {
      const twisty = document.createElement("span");
      twisty.className = "twisty";
      twisty.textContent = "·";
      row.appendChild(twisty);
      row.appendChild(document.createTextNode(node.name));
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        loadFile(node.path);
      });
      wrap.appendChild(row);
    }
    return wrap;
  }

  function highlightActive(path) {
    document.querySelectorAll(".tree-node.file").forEach((el) => {
      el.classList.toggle("active", el.dataset.path === path);
    });
  }

  /* -------------------- Filter -------------------- */

  function applyFilter(q) {
    const query = q.trim().toLowerCase();
    const allFiles = document.querySelectorAll(".tree-node.file");
    if (!query) {
      document.querySelectorAll(".tree-node, .tree-children").forEach((el) => {
        el.classList.remove("hidden-by-filter");
        if (el.classList.contains("tree-children")) el.classList.remove("hidden");
      });
      return;
    }
    // Hide all then reveal matches and ancestors
    document.querySelectorAll(".tree-node").forEach((el) => el.classList.add("hidden-by-filter"));
    document.querySelectorAll(".tree-children").forEach((el) => el.classList.add("hidden"));
    allFiles.forEach((file) => {
      if (file.dataset.name.includes(query) || file.dataset.path.toLowerCase().includes(query)) {
        // Reveal this file and walk up its parents
        let n = file;
        while (n && n !== fileTreeEl) {
          if (n.classList) {
            n.classList.remove("hidden-by-filter");
            n.classList.remove("hidden");
          }
          n = n.parentElement;
        }
      }
    });
  }

  /* -------------------- Load + render a file -------------------- */

  async function loadFile(path, opts = {}) {
    try {
      setStatus("loading…");
      const res = await fetch("/api/render?path=" + encodeURIComponent(path));
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${msg || res.statusText}`);
      }
      const data = await res.json();
      currentPath = path;
      currentMtime = data.mtime;
      renderDocument(data);
      highlightActive(path);
      updateUrl(path);
      crumbsEl.innerHTML = `<strong>${escapeHtml(path)}</strong> · ${formatSize(data.size)}`;
      setStatus(opts.reloaded ? "reloaded ✓" : "ready", true);
      schedulePoll();
    } catch (err) {
      console.error(err);
      contentEl.innerHTML = `<div class="empty"><h2>Failed to load</h2><p>${escapeHtml(err.message)}</p></div>`;
      setStatus("error");
    }
  }

  function renderDocument(data) {
    contentEl.innerHTML = data.html || "<p><em>(empty document)</em></p>";

    // Wire copy buttons on code blocks
    contentEl.querySelectorAll("pre").forEach((pre) => {
      const btn = document.createElement("button");
      btn.className = "copy-btn";
      btn.textContent = "copy";
      btn.addEventListener("click", () => {
        const code = pre.querySelector("code");
        const text = code ? code.innerText : pre.innerText;
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "copied!";
          btn.classList.add("copied");
          setTimeout(() => {
            btn.textContent = "copy";
            btn.classList.remove("copied");
          }, 1400);
        });
      });
      pre.appendChild(btn);
    });

    // Collapsible H2
    contentEl.querySelectorAll("h2").forEach((h) => {
      h.addEventListener("click", (e) => {
        if (e.target.tagName === "A") return; // permalink
        h.classList.toggle("collapsed");
        let n = h.nextElementSibling;
        while (n && n.tagName !== "H2" && n.tagName !== "H1") {
          n.style.display = h.classList.contains("collapsed") ? "none" : "";
          n = n.nextElementSibling;
        }
      });
    });

    // TOC
    tocEl.innerHTML = data.toc || '<p style="color:var(--text-faint);font-size:12px">No headings</p>';
    tocEl.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (href && href.startsWith("#")) {
          e.preventDefault();
          const target = document.getElementById(decodeURIComponent(href.slice(1)));
          if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
          history.replaceState(null, "", window.location.pathname + window.location.search + href);
        }
      });
    });

    // Scroll spy
    setupScrollSpy();
    // Reset scroll
    window.scrollTo(0, 0);
  }

  function setupScrollSpy() {
    if (scrollSpyObserver) scrollSpyObserver.disconnect();
    const headings = contentEl.querySelectorAll("h2[id], h3[id], h4[id]");
    if (!headings.length) return;
    const tocLinks = new Map();
    tocEl.querySelectorAll("a").forEach((a) => {
      const id = decodeURIComponent((a.getAttribute("href") || "").slice(1));
      if (id) tocLinks.set(id, a);
    });
    scrollSpyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.id;
          const link = tocLinks.get(id);
          if (!link) return;
          if (entry.isIntersecting) {
            tocEl.querySelectorAll("a.active").forEach((l) => l.classList.remove("active"));
            link.classList.add("active");
          }
        });
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    headings.forEach((h) => scrollSpyObserver.observe(h));
  }

  /* -------------------- Live reload (mtime poll) -------------------- */

  function schedulePoll() {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = setTimeout(checkMtime, 1500);
  }

  async function checkMtime() {
    if (!currentPath) return;
    try {
      const res = await fetch("/api/mtime?path=" + encodeURIComponent(currentPath));
      if (res.ok) {
        const { mtime } = await res.json();
        if (mtime && currentMtime && Math.abs(mtime - currentMtime) > 0.001) {
          loadFile(currentPath, { reloaded: true });
          return;
        }
      }
    } catch (e) {
      /* ignore network blips */
    }
    schedulePoll();
  }

  /* -------------------- In-document search -------------------- */

  let searchDebounce = null;
  function runContentSearch(query) {
    // First, undo previous highlights
    const marks = contentEl.querySelectorAll("mark.search-hit");
    marks.forEach((m) => {
      const parent = m.parentNode;
      parent.replaceChild(document.createTextNode(m.textContent), m);
      parent.normalize();
    });
    if (!query) return;
    const q = query.toLowerCase();
    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT, null);
    const ranges = [];
    let node;
    while ((node = walker.nextNode())) {
      if (!node.nodeValue || node.parentElement.tagName === "SCRIPT") continue;
      if (node.parentElement.closest("pre")) continue;
      const idx = node.nodeValue.toLowerCase().indexOf(q);
      if (idx >= 0) ranges.push({ node, idx, len: query.length });
    }
    ranges.forEach(({ node, idx, len }) => {
      const before = node.nodeValue.slice(0, idx);
      const hit = node.nodeValue.slice(idx, idx + len);
      const after = node.nodeValue.slice(idx + len);
      const frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      const mark = document.createElement("mark");
      mark.className = "search-hit";
      mark.textContent = hit;
      frag.appendChild(mark);
      if (after) frag.appendChild(document.createTextNode(after));
      node.parentNode.replaceChild(frag, node);
    });
    const first = contentEl.querySelector("mark.search-hit");
    if (first) first.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  contentSearch.addEventListener("input", (e) => {
    clearTimeout(searchDebounce);
    const v = e.target.value;
    searchDebounce = setTimeout(() => runContentSearch(v), 120);
  });

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      contentSearch.focus();
      contentSearch.select();
    } else if (e.key === "Escape" && document.activeElement === contentSearch) {
      contentSearch.value = "";
      runContentSearch("");
      contentSearch.blur();
    }
  });

  /* -------------------- TOC toggle -------------------- */

  toggleTocBtn.addEventListener("click", () => {
    layoutEl.classList.toggle("toc-hidden");
    toggleTocBtn.classList.toggle("active", !layoutEl.classList.contains("toc-hidden"));
  });
  toggleTocBtn.classList.add("active");

  filterInput.addEventListener("input", (e) => applyFilter(e.target.value));

  /* -------------------- URL state -------------------- */

  function updateUrl(path) {
    const url = new URL(window.location);
    url.searchParams.set("file", path);
    history.replaceState(null, "", url);
  }

  function readInitialFile() {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("file");
    if (fromUrl) return fromUrl;
    return document.body.dataset.initial || null;
  }

  /* -------------------- Boot -------------------- */

  function setStatus(text, flash = false) {
    statusEl.textContent = text;
    statusEl.classList.toggle("flash", flash);
    if (flash) setTimeout(() => statusEl.classList.remove("flash"), 1200);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function formatSize(n) {
    if (n == null) return "";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / 1024 / 1024).toFixed(1) + " MB";
  }

  async function boot() {
    try {
      const res = await fetch("/api/tree");
      const data = await res.json();
      renderTree(data.tree, fileTreeEl);
    } catch (e) {
      fileTreeEl.innerHTML = `<div style="padding:12px;color:var(--text-faint)">Failed to load file tree: ${escapeHtml(e.message)}</div>`;
    }
    const initial = readInitialFile();
    if (initial) loadFile(initial);
    else setStatus("ready");
  }

  boot();
})();
