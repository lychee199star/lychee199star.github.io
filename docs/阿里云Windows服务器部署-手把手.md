# 把博客挂到阿里云 Windows 服务器：手把手

> 目标：浏览器打开 `http://你的公网IP/` 就能看到博客，音乐也能播。
> 结论先说：你的博客是纯静态网站，**不需要装 Node.js**，用 Windows 自带的 IIS 托管最稳、最省内存，"弄个节点"这一步可以直接跳过。
>
> 你的实例是 **Windows Server 2025 Datacenter（Server Core，没有桌面）**，登录后看到的是黑底 SConfig 菜单——这完全没问题，后面全部用 PowerShell 敲命令，脚本已经按 Server Core 适配好了（自动跳过只有桌面版才有的 IIS 管理器）。
>
> 现在 `deploy\dist\blog-site.zip`（约 66.6MB）**已经帮你打好了**，没改过网站代码就可以直接上传；改过代码就按第 2 步重新打一次。

## 最短路径（只看这一段也能做完）

1. 阿里云控制台确认实例有**公网 IP**，安全组入方向放行 **3389**（来源填你自己的公网 IP）和 **80**（来源 `0.0.0.0/0`）。
2. 在你自己的电脑运行：

   ```powershell
   powershell -ExecutionPolicy Bypass -File D:\codex工作区\deploy\connect-server.ps1 -Package lite
   ```

   输入服务器公网 IP，脚本会打开已经配好驱动器重定向的远程桌面；用户名 `Administrator`，密码用你重置后的实例密码。
3. 连上服务器后，打开 `D:\codex工作区\deploy\服务器上粘贴这些命令.txt`，把「第一步」的三条命令复制到服务器的 PowerShell 里执行。
4. 在自己电脑浏览器打开 `http://你的公网IP/`。能看到博客，就说明 IIS、防火墙和安全组都通了。
5. 再把同一个文件里的「第二步」三条命令执行一次，换成完整包，音乐就有了。

> 轻量包只有 6.1MB，先传它；完整包 66.6MB，等页面通了再传，排错会轻松很多。

整体链路：

```
阿里云 ECS（Windows Server 2025 / Server Core）
        └─ IIS（80 端口）
             └─ C:\inetpub\wwwroot\index.html、friends.html、assets\...
```

需要准备：实例的**公网 IP**、**Administrator 密码**、阿里云控制台登录权限。

---

## 第 0 步：先确认两件事

1. **实例有没有公网 IP**：控制台 → 云服务器 ECS → 实例 → 看公网 IP 一列；没有就点「绑定弹性公网 IP」。
   没有公网 IP，网站只能在内网访问，外网打不开。
2. **安全组放行端口**：实例 → 安全组 → 配置规则 → 入方向 → 手动添加：

   | 端口 | 用途 | 授权对象 |
   | --- | --- | --- |
   | 3389 | 远程桌面（用本机 mstsc 登录时需要） | 建议填你本机公网 IP/32 |
   | 80 | 网站 | `0.0.0.0/0` |

   > 轻量应用服务器在「服务器」→「防火墙」里加，不叫安全组。

---

## 第 1 步：进入 PowerShell（从 SConfig 菜单出来）

你现在看到的黑色菜单是 Server Core 的初始配置工具 SConfig。**在这个窗口里直接输入数字再回车**：

```
输入数字以选择选项: 15
```

选 **15) 退出到命令行 (PowerShell)**，回车后就会看到 PowerShell 提示符，例如：

```
PS C:\Users\Administrator>
```

如果退出后是 `C:\Users\Administrator>` 的 cmd 提示符，再输入 `powershell` 回车即可。

> 小提示：SConfig 每次登录都会自动弹出来，关掉它或者选 15 就行。

进入 PowerShell 后，先跑一遍体检命令（复制整段粘贴，回车）：

```powershell
(Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').ProductName
(Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion').InstallationType
$env:COMPUTERNAME
foreach ($k in @('eipv4','public-ipv4')) {
  try { "$k = " + (Invoke-WebRequest "http://100.100.100.200/latest/meta-data/$k" -UseBasicParsing -TimeoutSec 5).Content.Trim() }
  catch { "$k = (无)" }
}
(Get-Service W3SVC -ErrorAction SilentlyContinue).Status
```

输出里重点看：

- `InstallationType` 是 `Server Core` → 确认无桌面，正常；
- `eipv4` 或 `public-ipv4` 有没有值 → 决定外网能不能访问；
- `W3SVC` 是空还是 `Running` → 空表示 IIS 还没装（下一步会装）。

---

## 第 2 步：在你自己电脑上打包

打开 PowerShell（不用管理员），执行：

```powershell
cd D:\codex工作区
powershell -ExecutionPolicy Bypass -File deploy\build-site-package.ps1
```

产物：`deploy\dist\blog-site.zip`

- 大约 **67MB**（其中 61MB 是音乐；`.flac` 备份文件、tests、docs、旧页面都不会打进去）。
- **zip 里直接就是 `index.html`、`assets\`、`web.config`**，解压到 IIS 默认目录 `C:\inetpub\wwwroot` 就能访问，不用改任何站点配置。
- 包里的 `web.config` 负责让 IIS 认识 mp3（不然音乐放不了）。

**第一次不放心的话，先打个小包验证通路**（跳过 61MB 音频，只有 6MB 左右）：

```powershell
powershell -ExecutionPolicy Bypass -File deploy\build-site-package.ps1 -SkipAudio
```

小包能看到页面、只是音乐会报"无法播放"；确认 IIS 通了以后，再换完整包。

---

## 第 3 步：把 zip 传到服务器

Server Core 没有资源管理器，所以不能像普通 Windows 那样直接拖文件。按以下顺序选一种：

### 方式 A：云助手「发送文件」（不用开端口，最省事）

阿里云控制台 → 云服务器 ECS → **运维与监控 → 云助手**（有的版本在实例「更多」里）→ 找 **发送文件 / 发送文件到实例**：

- 目标实例：选你这台；
- 源文件：选本地的 `deploy\dist\blog-site.zip`；
- 目标路径：`C:\blog-site.zip`；
- 超时时间：默认即可。

> 如果你的控制台里没有「发送文件」，直接看方式 B 或 C。

### 方式 B：本机远程桌面 + 驱动器重定向（67MB 最快，推荐）

**省事做法**：在本机运行：

```powershell
cd D:\codex工作区
powershell -ExecutionPolicy Bypass -File deploy\connect-server.ps1
```

输入服务器公网 IP，它会自动生成并打开一个**已经配好驱动器重定向**的 `blog-server.rdp`。
连上后，直接把脚本打印的那条 `Copy-Item '\\tsclient\D\...' C:\blog-site.zip` 粘到服务器 PowerShell 里执行即可。

手动做法：

1. 安全组放行 3389，来源填你本机公网 IP。
2. `Win + R` → `mstsc` → 计算机填 `公网IP`，用户名 `Administrator`。
3. 连接前点「显示选项 → 本地资源 → 详细信息 → 驱动器」，勾上你的 D 盘，再连接。
4. 在服务器里（Server Core 没有资源管理器，用命令复制）：

   ```powershell
   Copy-Item '\\tsclient\D\codex工作区\deploy\dist\blog-site.zip' C:\blog-site.zip
   ```

   > `\\tsclient\D` 就是被重定向进来的本机 D 盘；路径里有中文没关系，用单引号包起来。

### 方式 C：开 OpenSSH，用 scp 上传

服务器 PowerShell 里执行（管理员）：

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
Start-Service sshd
Set-Service sshd -StartupType Automatic
New-NetFirewallRule -DisplayName 'OpenSSH 22' -Direction Inbound -Protocol TCP -LocalPort 22 -Action Allow
```

安全组放行 22，然后在你自己的电脑上：

```powershell
scp .\deploy\dist\blog-site.zip Administrator@你的公网IP:C:/blog-site.zip
```

> `Add-WindowsCapability` 需要服务器能访问 Windows Update；如果报错，用方式 A 或 B。

### 方式 D：OSS 中转

本地上传到阿里云 OSS（浏览器）→ 拿到文件地址 → 在服务器上：

```powershell
Invoke-WebRequest '文件的公网地址' -OutFile C:\blog-site.zip
```

最后确认服务器上有这个文件：

```powershell
Get-Item C:\blog-site.zip | Select-Object Name, Length
```

---

## 第 4 步：服务器上一键配置

1. 把 `deploy\server\setup-blog-site.ps1` 也传到服务器 `C:\setup-blog-site.ps1`（用第 3 步同样的方式）。

   > 文件很小（几 KB），也可以直接打开它，复制全部内容，在服务器 PowerShell 里粘贴执行。

2. 在服务器上执行：

```powershell
powershell -ExecutionPolicy Bypass -File C:\setup-blog-site.ps1
```

它会自动做完这些（重复运行也安全）：

- 解压 `C:\blog-site.zip` 到 `C:\inetpub\wwwroot`
- 安装 IIS 和静态站点需要的组件（Server Core 自动跳过图形管理器）
- 启动 W3SVC 和默认站点
- 给站点目录读权限、在 Windows 防火墙放行 80
- 自检首页和 mp3 的 MIME
- 打印 `http://localhost/` 和 `http://公网IP/`

成功的话最后会看到类似：

```
配置完成
  系统      : Windows Server 2025 Datacenter
  站点目录  : C:\inetpub\wwwroot
  本机自检  : http://localhost/
  公网访问  : http://47.x.x.x/
```

---

## 第 5 步：外网访问

在你自己的电脑浏览器打开：

```
http://你的公网IP/
```

打不开就按这个顺序查：

1. **安全组**是否放行 80（第 0 步）。
2. **公网 IP** 是否真的绑定了（第 1 步体检命令里的 `eipv4`/`public-ipv4`）。
3. **Windows 防火墙**：脚本已经加规则；手动确认 `Blog HTTP 80` 存在。
4. **本机自检**：脚本里 `首页状态码 200` 说明 IIS 没问题，问题只在网络。
5. **端口被拦**：换 8080 验证：

   ```powershell
   powershell -ExecutionPolicy Bypass -File C:\setup-blog-site.ps1 -Port 8080
   ```

   然后访问 `http://公网IP:8080/`，同时安全组放行 8080。

> 大陆地域服务器：**用 IP 直接访问一般没问题**；一旦要用域名访问 80/443，域名必须先完成 ICP 备案（见第 8 步）。

---

## 第 6 步：以后怎么更新网站

1. 本地改完代码，重新打包（第 2 步）。
2. 把新的 `blog-site.zip` 覆盖到服务器 `C:\blog-site.zip`。
3. 服务器 PowerShell 执行：

```powershell
powershell -ExecutionPolicy Bypass -File C:\update-blog-site.ps1
```

它会把旧的 html/css/js 备份到 `C:\blog-backup\时间戳\`，然后解压覆盖。浏览器按 `Ctrl + F5` 强刷即可。

> 注意：解压只覆盖同路径文件，**不会删除**服务器上多出来的旧文件；如果你删了某张图，服务器上旧图还在。要彻底干净就清空 `C:\inetpub\wwwroot` 再跑一次。

---

## 第 7 步（可选）：不想用 IIS，想用 Nginx

Windows 上完全可以用 Nginx，但 **IIS 和 Nginx 不能同时占 80 端口**，二选一。配置文件：`deploy\nginx\blog.conf`。

1. 下载 nginx/Windows 版，解压到 `C:\nginx`（官网 nginx.org → download → Windows）。
2. 把 `deploy\nginx\blog.conf` 放到 `C:\nginx\conf\`。
3. 在 `C:\nginx\conf\nginx.conf` 的 `http { ... }` 里加一行：

   ```nginx
   include blog.conf;
   ```

4. 站点文件仍然放 `C:\inetpub\wwwroot`（解压 `blog-site.zip`）。
5. 在 `C:\nginx` 目录执行：

   ```powershell
   .\nginx.exe            # 启动
   .\nginx.exe -s reload  # 改完配置后重载
   .\nginx.exe -s stop    # 停止
   ```

6. 如果 80 被 IIS 占着：先 `Stop-Service W3SVC`，或者卸载 IIS。

> 说实话：Windows 上 IIS 更省心（系统自带、开机自启、不用管进程），除非你熟悉 Nginx，否则建议就用 IIS。

---

## 第 8 步（以后）：绑域名 + HTTPS + 备案

1. **ICP 备案**：阿里云控制台 → **备案** → 提交。大陆地域服务器用域名提供网站服务前**必须**备案，否则域名会被拦截。
2. **域名解析**：域名控制台 → 解析 → 添加 A 记录，主机记录 `@` 和 `www`，记录值填服务器公网 IP。
3. **IIS 绑定主机名**（Server Core 没有 IIS 管理器，用 appcmd）：

   ```powershell
   & "$env:windir\system32\inetsrv\appcmd.exe" set site "Default Web Site" "/+bindings.[protocol='http',bindingInformation='*:80:www.你的域名']"
   ```

4. **HTTPS**：用 win-acme 或 Certify The Web 申请 Let's Encrypt 证书，再绑定 443。Server Core 上建议用 win-acme 的命令行模式。

> 没备案之前：老老实实用 `http://IP/` 访问，一样能看。

---

## 第 9 步：排错对照表

| 现象 | 多半是 | 怎么办 |
| --- | --- | --- |
| 打开是 IIS 蓝色欢迎页 | `C:\inetpub\wwwroot` 里没有 `index.html` | 检查解压路径；`Get-ChildItem C:\inetpub\wwwroot` 看看 |
| 403.14 禁止目录浏览 | 同上，根目录没有默认文档 | 确认 `index.html` 在根目录，不是 `wwwroot\blog\index.html` |
| 404 找不到文件 | 文件没传全 | 重新解压 `blog-site.zip`，确认 `wwwroot\assets\...` 存在 |
| 500.19 配置错误 | `web.config` 语法/重复键 | 先把 `web.config` 改名，能打开就说明是它；内容发我 |
| 页面能开但没样式 | css/js 没上传 | 看 `C:\inetpub\wwwroot\styles.css` 是否存在 |
| 音乐不播、404.3 | IIS 不认识 mp3 | 确认 `web.config` 在站点根目录 |
| 音乐能播但一直缓冲 | 服务器带宽太小 | 见下面「带宽」；把音频放 OSS+CDN |
| 本机能开、外网打不开 | 安全组 / 公网 IP | 放行 80；确认 `eipv4` 有值 |
| 远程桌面连不上 | 3389 / 密码 | 安全组放行 3389；重置密码后重启 |
| 浏览器提示「不安全」 | 没有 HTTPS | 先 IP 用着，备案后上证书 |

常用检查命令（服务器 PowerShell）：

```powershell
Get-Service W3SVC
Get-ChildItem C:\inetpub\wwwroot | Select-Object -First 10 Name
Get-NetFirewallRule -DisplayName 'Blog HTTP*' | Format-Table DisplayName, Enabled, Direction
Test-NetConnection -ComputerName 127.0.0.1 -Port 80
(Invoke-WebRequest http://localhost/ -UseBasicParsing).StatusCode
```

---

## 第 10 步：带宽和成本（音乐站要特别注意）

- 纯静态博客 **1 核 1G / 2G 内存**足够，IIS 占用很低。
- 但 `assets/audio` 有 **61MB**：
  - 1Mbps 带宽 ≈ 128KB/s，一首 6MB 的歌要 **40 秒以上**才缓冲完，体验很差。
  - 建议带宽 **3Mbps 起步**，或者把 `assets/audio` 放到 **OSS + CDN**，页面里的 `src` 改成 OSS 地址。
- 按量付费实例注意流量费用；长期跑建议买带宽包或流量包。
- 定期给实例做**快照**，改坏了能回滚。

---

## 第 11 步：安全（别省这几步）

- 3389 的授权对象尽量限制成你自己的 IP，不要长期 `0.0.0.0/0`。
- Administrator 用强密码；有条件就改 RDP 端口。
- 只放行需要的端口（80/443，临时 3389），不要开 3306、6379 这类。
- 不要运行来源不明的"一键脚本"。

---

## 我为你准备好的文件

| 文件 | 在哪运行 | 作用 |
| --- | --- | --- |
| `deploy\build-site-package.ps1` | 你的电脑 | 打包出 `blog-site.zip`（`-SkipAudio` 出小包，`-IncludeLegacyPages` 带上旧页面） |
| `deploy\server\setup-blog-site.ps1` | 服务器（管理员） | 首次部署：解压到 wwwroot + 装 IIS + 启动 + 权限 + 防火墙 + 自检 |
| `deploy\server\update-blog-site.ps1` | 服务器（管理员） | 以后更新：备份旧页面 + 解压覆盖 |
| `deploy\site\web.config` | 随 zip 部署 | 让 IIS 认识 mp3/flac/json/svg/webp/woff2 等 MIME |
| `deploy\nginx\blog.conf` | 可选 | 想用 Nginx 时的站点配置 |

---

## 卡住了怎么找我

我不能直接远程登录你的服务器（没有你的密码，也不建议把密码发出来），但你可以把下面这些贴给我，我按报错带你排查：

1. 卡在第几步；
2. **完整的报错文字或截图**；
3. 服务器上这几条命令的输出：

   ```powershell
   Get-Service W3SVC
   Get-ChildItem C:\inetpub\wwwroot | Select-Object -First 10 Name
   Test-NetConnection -ComputerName 127.0.0.1 -Port 80
   ```

4. 第 1 步体检命令的输出（公网 IP 可以打码，只要告诉我有没有值）。

把「第 1 步」的输出丢给我，我直接告诉你下一步点哪里。
