# StickyTodo 打包记录

**日期**: 2026-08-29  
**版本**: 2.0.0  
**产物**: `StickyTodo-Portable-2.0.0.exe` (74.7 MB)  
**路径**: `D:\PEGAAi_Opencode\projects\stickytodo_20260820\dist\StickyTodo-Portable-2.0.0.exe`

---

## 打包命令

```powershell
# 1. 关闭正在运行的 Electron（避免文件锁定）
Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. 设置代理（公司环境三件套）
$env:HTTP_PROXY = "http://localhost:3128"
$env:HTTPS_PROXY = "http://localhost:3128"
$env:NO_PROXY = ""

# 3. 关键：绕过公司代理的自签名证书
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"

# 4. 执行打包
Set-Location 'D:\PEGAAi_Opencode\projects\stickytodo_20260820'
npm run build
```

---

## 遇到的问题

### 问题 1: self-signed certificate in certificate chain

**现象**: electron-builder 下载 Electron 二进制时 SSL 握手失败  
**原因**: 公司代理使用自签名证书，Node.js 默认拒绝  
**解决**: `$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"`  
**注意**: 这会禁用所有 TLS 证书验证，仅在打包时使用，不要用于生产运行

### 问题 2: 通过 electron.cmd 启动应用，关闭命令窗口应用就退出

**现象**: 用 `node_modules\.bin\electron.cmd` 启动，关闭 cmd 窗口后应用被杀  
**原因**: electron.cmd 是批处理脚本，cmd 窗口是父进程，关闭父进程终止子进程  
**解决**: 直接用 `electron.exe` 启动，不经过 cmd:
```powershell
Start-Process 'D:\PEGAAi_Opencode\projects\stickytodo_20260820\node_modules\electron\dist\electron.exe' -ArgumentList '.' -WorkingDirectory 'D:\PEGAAi_Opencode\projects\stickytodo_20260820'
```

---

## package.json 打包配置

```json
{
  "scripts": {
    "build": "electron-builder",
    "pack": "electron-builder --dir"
  },
  "build": {
    "appId": "com.stickytodo.app",
    "productName": "StickyTodo",
    "icon": "icon.ico",
    "directories": { "output": "dist" },
    "files": [
      "main.js", "preload.js", "db.js", "index.html", "style.css", "app.js",
      "vue.global.prod.js", "icon.ico", "package.json",
      "pet.html", "pet.js", "pet-renderer.js", "pet-window.js", "pet-style.css",
      "three.min.js", "GLTFLoader.js", "pet-renderer-3d.js",
      "node_modules/**/*"
    ],
    "win": {
      "target": [{ "target": "portable", "arch": ["x64"] }],
      "artifactName": "StickyTodo-Portable-${version}.${ext}"
    },
    "portable": {
      "artifactName": "StickyTodo-Portable-${version}.${ext}"
    },
    "asar": true
  }
}
```

---

## 打包类型

- **portable**: 单个 exe 文件，解压即用，无需安装（当前使用）
- 如需安装版（带安装向导），改 target 为 `nsis`

## 分发方式

- 直接把 `StickyTodo-Portable-2.0.0.exe` 发给同事
- 双击运行，无需安装、无需 Node.js、无需其他依赖
- 首次运行 Windows 可能提示"未知发布者"（无代码签名证书），点"仍要运行"即可

---

## 打包前检查清单

1. ✅ 所有代码改动已 `node --check` 验证
2. ✅ git commit + push 到 GitHub
3. ✅ 关闭正在运行的 Electron 进程
4. ✅ 设置代理 + `NODE_TLS_REJECT_UNAUTHORIZED=0`
5. ✅ `npm run build` 成功
6. ✅ 检查 `dist/` 目录下生成 exe 文件
