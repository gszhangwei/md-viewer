# md-viewer

一个本地 Markdown 预览工具：在浏览器里渲染任意目录下的 `.md` 文件，左侧文件树，右侧 TOC，文档保存后自动刷新。

通用工具，放在 `~/project/md-viewer/`，可对任何项目使用。

---

## 安装（一次性）

依赖通过 Origin 内部 Nexus pip proxy 安装。

```bash
~/project/md-viewer/install.sh
```

脚本会在 `~/project/md-viewer/.venv` 创建虚拟环境并装好依赖（Flask、Markdown、Pygments、pymdown-extensions）。

> 装好后建议把 `md-viewer` 加入 PATH：
> ```bash
> ln -s ~/project/md-viewer/md-viewer ~/bin/md-viewer    # 或者 /usr/local/bin
> ```

## 使用

```bash
# 浏览整个目录
md-viewer ~/.ssh/home-audit-microsite/.claude/plans

# 打开单个文件（以其父目录作为根）
md-viewer ~/.ssh/home-audit-microsite/.claude/plans/AS-IS-home-audit-microsite-2026-05-14.md

# 默认监听 127.0.0.1:4000；自动在浏览器中打开
md-viewer ./docs --port 5000 --host 0.0.0.0 --no-browser
```

启动后浏览器自动跳到 `http://127.0.0.1:4000/`。

## 功能

| 功能 | 说明 |
|---|---|
| 文件树 | 左侧递归列出 `.md` / `.markdown`，跳过 `node_modules/.venv/dist/build/__pycache__` 及大多数隐藏目录，但保留 `.claude/`（Claude Code plans 默认在这里）|
| TOC | 右侧自动生成目录，滚动时高亮当前章节，点击平滑跳转 |
| Live reload | 当前文件 mtime 改变时自动重新渲染（每 1.5s 轮询）|
| 文档内搜索 | 顶栏搜索框（`⌘K` / `Ctrl+K`）高亮命中处，`Esc` 清除 |
| 文件名过滤 | 左侧搜索框按文件名/路径过滤树 |
| H2 折叠 | 点击 `##` 标题折叠该段落 |
| 代码复制 | 每个代码块右上角 hover 出现 `copy` 按钮 |
| 暗色模式 | 跟随系统 `prefers-color-scheme` |
| 表格 / 任务列表 / 注释块 | 通过 `tables`、`pymdownx.tasklist`、`admonition` 扩展支持 |
| URL 状态 | `?file=xxx.md` 可直接深链到指定文档 |

## 命令行参数

```
md-viewer [PATH] [--port 4000] [--host 127.0.0.1] [--no-browser]
```

- `PATH` 缺省为当前目录；可为目录或单个 `.md` 文件
- 安全防护：所有路径请求会强制 resolve 在 PATH 下，禁止 `..` 逃逸

## 文件结构

```
md-viewer/
├── install.sh          # 用 Origin Nexus 装依赖到 .venv
├── md-viewer           # 入口 shell wrapper
├── md_viewer.py        # Flask app: /, /api/tree, /api/render, /api/mtime
├── requirements.txt
├── templates/
│   └── index.html
└── static/
    ├── style.css
    ├── pygments.css    # 代码高亮（安装后由 pygmentize 覆盖为完整 stylesheet）
    └── viewer.js
```

## 测试一下

打开一开始触发这个工具的 AS-IS 文档：

```bash
md-viewer ~/.ssh/home-audit-microsite/.claude/plans
# 浏览器里点 AS-IS-home-audit-microsite-2026-05-14.md
```

## 卸载

```bash
rm -rf ~/project/md-viewer
```
