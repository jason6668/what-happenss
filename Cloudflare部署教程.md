# Cloudflare 部署教程

本项目《今日时事》完全支持部署到 Cloudflare Pages，享受免费、快速、全球CDN加速的服务。由于本项目是使用 Nuxt 4 构建的 SSR 应用，得益于 Nitro 引擎，我们可以无缝将其部署为 Cloudflare Pages。

## 一键部署

点击下方按钮，即可一键将项目部署到你的 Cloudflare 账户：

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/jason6668/what-happens)

> **注意：** 一键部署依赖于根目录下的 `wrangler.toml` 配置文件。Cloudflare 会根据此文件自动识别构建命令和输出目录。

---

## 手动部署指南 (Cloudflare Pages)

如果你希望通过 Cloudflare Pages 后台完全手动部署，可以按照以下步骤操作：

### 1. 前期准备
- 一个 [GitHub](https://github.com) 账号，并将本项目[克隆或 Fork](https://github.com/LYX9527/what-happen/fork) 到你的个人仓库。
- 一个 [Cloudflare](https://dash.cloudflare.com) 账号。

### 2. 创建 Cloudflare Pages 项目
1. 登录到 Cloudflare Dashboard。
2. 在左侧导航栏点击 **“Workers 和 Pages”** -> **“概述”**。
3. 点击 **“创建”** 按钮，然后选择 **“Pages”** 选项卡。
4. 点击 **“连接到 Git”** 按钮。
5. 连接你的 GitHub 账号，并选择你刚才 Fork 的 `what-happen` 仓库。
6. 点击 **“开始设置”**。

### 3. 配置构建设置
在“构建和部署”设置页面，进行如下配置：

- **框架预设 (Framework preset):** `Nuxt.js`
- **构建命令 (Build command):** `npm run build` (或者使用 `yarn build`)
- **构建输出目录 (Build output directory):** `.output/public` (对于Nuxt 3/4 SSR应用)
- **环境变量 (Environment variables):**
  - 如果你需要请求自己后端的接口，请在此处添加环境变量设置 API 地址：
  - **变量名称:** `VITE_API_BASE_URL` 或者是 `NUXT_PUBLIC_API_BASE_URL`
  - **值:** `你的后端API地址` (例如：`https://api.yourdomain.com`)

### 4. 部署与预览
1. 确认上述配置无误后，点击 **“保存并部署”**。
2. Cloudflare 将会自动拉取代码、安装依赖并执行构建过程。
3. 部署成功后，你会获得一个 `*.pages.dev` 的免费域名，点击即可预览此《今日时事》应用！

### 5. (可选) 绑定自定义域名
如果你有自己的域名，希望通过自定义域名访该项目：
1. 部署完成后，在项目页面选择 **“自定义域”** 选项卡。
2. 点击 **“设置自定义域”**，输入你受 Cloudflare 管理的域名。
3. Cloudflare 会自动为你处理 DNS 解析和 HTTPS 证书。

---

## 常见问题 (FAQ)

**1. 部署后发现接口请求报错？**
本项目是前后端分离的架构，如果你的新闻数据依赖后端 API (例如 10010 端口)，你需要确保后端也部署在公网能访问的地方，并在 Cloudflare 的环境变里正确配置了 `VITE_API_BASE_URL` 或者 `NUXT_PUBLIC_API_BASE_URL` 指向该公网接口。

**2. 可以部署为全静态页面吗？**
如果希望作为纯静态页面部署，可以将构建命令修改为 `npm run generate`，输出目录修改为 `dist`。但这会失去部分实时服务端渲染特性。由于本项目开启了 `ssr: true`，默认的 `npm run build` 在 Cloudflare 配合下是最佳选择。
