import { BrowserMultiFormatReader } from '@zxing/library';

/**
 * 解析 Google OTP URI（与 decodeGoogleOTP 的 core/flow.go 逻辑1:1对齐）
 * 仅支持 otpauth://totp/ 协议，且 issuer 包含 "Google"
 */
function parseGoogleOTPUri(uri: string): {
  issuer: string;
  account: string;
  secret: string;
} {
  // 1. 校验是否为 TOTP 类型（Google OTP 仅支持 TOTP）
  if (!uri.startsWith('otpauth://totp/')) {
    throw new Error('非 Google OTP 二维码（仅支持 totp 类型）');
  }

  const url = new URL(uri);
  const path = url.pathname.slice(1); // 移除路径前缀 "/"，得到 "Issuer:Account" 格式字符串

  // 2. 解析 Issuer 和 Account（兼容两种格式：path 中包含或仅 query 中包含）
  let issuer = url.searchParams.get('issuer') || '';
  let account = '';

  if (path.includes(':')) {
    const [pathIssuer, ...accountParts] = path.split(':');
    account = accountParts.join(':').trim(); // 处理账号中包含 ":" 的场景
    if (!issuer) issuer = pathIssuer.trim(); // 若 query 中无 issuer，取 path 中的前缀
  } else {
    account = path.trim(); // 极端情况：仅账号无 issuer，后续校验会失败
  }

  // 3. 严格校验 Google 标识（与 decodeGoogleOTP 一致，仅允许 Google  issuer）
  if (!issuer || !issuer.toLowerCase().includes('google')) {
    throw new Error('非 Google OTP 二维码（issuer 不匹配）');
  }

  // 4. 提取 Base32 格式的 OTP 密钥（核心字段）
  const secret = url.searchParams.get('secret');
  if (!secret || !/^[A-Za-z0-9]{16,}$/.test(secret)) { // 符合 Google OTP 密钥长度规范
    throw new Error('未提取到有效的 OTP 密钥（需为 Base32 格式，长度≥16）');
  }

  // 5. 校验账号不为空
  if (!account) {
    throw new Error('未从二维码中提取到关联账户（邮箱/用户名）');
  }

  return {
    issuer: issuer.trim(),
    account: account.trim(),
    secret: secret.trim().toUpperCase(), // 统一转为大写，与 decodeGoogleOTP 输出一致
  };
}

/**
 * 从图片数据解码二维码（适配多种输入格式，与 decodeGoogleOTP 的 gozxing 支持范围对齐）
 */
async function decodeQrCode(imageData: Buffer | string): Promise<string> {
  const reader = new BrowserMultiFormatReader();
  try {
    let uint8Array: Uint8Array;

    // 适配 Base64 图片输入（如 "data:image/png;base64,xxx"）
    if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
      const base64Str = imageData.split(',')[1];
      if (!base64Str) throw new Error('Base64 图片格式错误');
      
      const binaryStr = atob(base64Str);
      uint8Array = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        uint8Array[i] = binaryStr.charCodeAt(i);
      }
    }

    // 适配 Buffer 输入（文件上传/URL 下载的图片）
    else if (imageData instanceof Buffer) {
      uint8Array = new Uint8Array(imageData);
    }

    else {
      throw new Error('不支持的图片输入格式');
    }

    // 解码二维码（支持 PNG/JPG/JPEG/GIF，与 decodeGoogleOTP 兼容）
    const result = await reader.decodeFromUint8Array(uint8Array);
    if (!result) throw new Error('二维码解码失败');
    return result.getText();
  } catch (err) {
    throw new Error(`二维码解码失败（可能是图片模糊、非二维码或格式不支持）: ${(err as Error).message}`);
  } finally {
    reader.reset(); // 释放资源
  }
}

/**
 * Cloudflare Workers HTTP 服务入口（支持 3 种输入方式，保留在线服务特性）
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*', // 允许跨域（网页/API 调用）
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: responseHeaders });
    }

    try {
      const url = new URL(request.url);
      let qrUri: string;

      // 场景 1：POST 上传图片文件（form-data 格式，字段名 image）
      if (request.method === 'POST' && request.headers.get('Content-Type')?.includes('multipart/form-data')) {
        const formData = await request.formData();
        const file = formData.get('image') as File | null;
        if (!file) throw new Error('请上传图片文件（字段名：image）');
        
        const fileBuffer = await file.arrayBuffer();
        qrUri = await decodeQrCode(Buffer.from(fileBuffer));
      }

      // 场景 2：GET 请求传入图片 URL（query 参数：url）
      else if (request.method === 'GET' && url.searchParams.has('url')) {
        const imageUrl = url.searchParams.get('url')!;
        const imageResp = await fetch(imageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Cloudflare Workers)' },
          cf: { cacheTtl: 300 }, // 缓存图片 5 分钟，优化性能
        });

        if (!imageResp.ok) throw new Error(`图片 URL 访问失败（状态码：${imageResp.status}`);
        const imageBuffer = await imageResp.arrayBuffer();
        qrUri = await decodeQrCode(Buffer.from(imageBuffer));
      }

      // 场景 3：POST 传入 Base64 图片（JSON 格式：{ "base64": "data:image/xxx;base64,xxx" }）
      else if (request.method === 'POST') {
        const body = await request.json().catch(() => {
          throw new Error('POST 请求体需为 JSON 格式（Base64 场景）');
        });

        if (!body.base64 || !body.base64.startsWith('data:image/')) {
          throw new Error('Base64 图片格式错误（需包含 "data:image/" 前缀）');
        }

        qrUri = await decodeQrCode(body.base64);
      }

      // 不支持的请求方式
      else {
        throw new Error(`不支持的请求方式：${request.method}\n支持用法：\n1. POST 上传图片（form-data: image）\n2. GET ?url=图片URL\n3. POST JSON { "base64": "图片Base64" }`);
      }

      // 解析 Google OTP 核心信息
      const otpInfo = parseGoogleOTPUri(qrUri);
      return new Response(JSON.stringify({
        success: true,
        data: otpInfo, // 仅输出 3 个核心字段，与 decodeGoogleOTP 完全对齐
      }), { headers: responseHeaders });

    } catch (error: any) {
      // 错误信息与 decodeGoogleOTP 保持一致，提升用户体验
      return new Response(JSON.stringify({
        success: false,
        error: error.message || '解码失败',
      }), {
        status: 400,
        headers: responseHeaders,
      });
    }
  },
};
