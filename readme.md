# otp-extract-cloudflare

 🌐 基于 Cloudflare Workers 的在线 Google OTP 二维码解码工具  
 🔍 功能与 [decodeGoogleOTP](httpsgithub.comKuingsmiledecodeGoogleOTP) 11 对齐，仅运行形态为「无服务器在线服务」

## 项目介绍
本项目是 `decodeGoogleOTP`（Go 语言本地命令行工具）的在线适配版，基于 Cloudflare Workers 开发，无需本地安装任何软件，通过 API 或网页即可快速解码 Google OTP 二维码，提取核心认证信息。适合临时使用、无本地编译环境或需要在线集成 OTP 解码功能的场景。

## 核心特性（与 decodeGoogleOTP 完全一致）
✅ 精准解码：仅支持 Google OTP（TOTP 类型），非目标类型直接返回明确错误  
✅ 多输入支持：兼容 PNGJPGJPEGGIF 格式，支持 3 种输入方式（文件上传、图片 URL、Base64 编码）  
✅ 极简输出：仅返回 3 个核心字段（`issuer``account``secret`），无冗余信息  
✅ 错误同步：报错场景与提示文案和本地工具完全一致，降低用户认知成本  
✅ 轻量化部署：基于 Cloudflare Workers 运行，免费额度足够日常使用，无需服务器维护

## 快速使用（部署后直接调用）
### 前提
已完成 Cloudflare Workers 部署，获取部署后的访问域名（如 `httpsotp-extract.你的用户名.workers.dev`）

### 三种调用方式（任选其一）
#### 1. 上传本地图片（form-data 格式）
```bash
# 替换为你的 Worker 域名和本地图片路径
curl -X POST https你的-worker域名 
  -F image=@.google-otp.png 
  -H Content-Type multipartform-data