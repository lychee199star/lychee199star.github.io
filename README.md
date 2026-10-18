# 定南の 碎碎念 · 个人博客

这是一个原生 HTML / CSS / JavaScript 的静态博客，不需要安装 Node.js，也不需要构建。

## 本地预览

直接打开 `index.html`，或者在项目目录运行：

```powershell
python -m http.server 8765
```

然后访问 <http://localhost:8765/>。

## 页面与功能

- `index.html`：首页、文章、音乐播放器、猫村留言板和关于我
- `friends.html`：友链
- `assets/`：图片、音频、光标等站点资源
- `styles.css`、`script.js`、`music-player.js`、`guestbook.js`、`translation.js`：站点交互

留言板目前保存在浏览器本地，只对当前浏览器可见。

## 部署到阿里云

已经准备好两个压缩包：

- `deploy/dist/blog-site.zip`：完整包，约 66.6 MB，包含音乐
- `deploy/dist-lite/blog-site.zip`：轻量包，约 6.1 MB，不含音乐，适合先验证服务器通路

服务器是 Windows Server 时，用 IIS 托管即可。详细步骤见
[阿里云 Windows 服务器部署说明](docs/阿里云Windows服务器部署-手把手.md)。

最省事的顺序：先传轻量包确认页面能打开，再传完整包替换音频。
