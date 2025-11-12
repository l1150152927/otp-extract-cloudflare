import { BrowserMultiFormatReader } from '@zxing/library';

/**
 * 1. 内嵌网页 HTML（含前端交互逻辑）
 */
const WEB_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google OTP 二维码解码工具</title>
    <!-- 内嵌 Tailwind CSS（无需额外引入） -->
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        .upload-area {
            border: 2px dashed #d1d5db;
            transition: all 0.3s ease;
        }
        .upload-area.active {
            border-color: #3b82f6;
            background-color: #eff6ff;
        }
        .result-card {
            display: none;
        }
    </style>
</head>
<body class="min-h-screen bg-gray-50 flex flex-col items-center p-4 md:p-8">
    <div class="w-full max-w-2xl bg-white rounded-xl shadow-md p-6 md:p-8">
        <h1 class="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-6">Google OTP 二维码解码</h1>
        
        <!-- 上传区域 -->
        <div id="uploadArea" class="upload-area rounded-lg p-8 text-center mb-6 cursor-pointer">
            <svg class="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <p class="text-gray-600 mb-2">点击或拖拽上传 Google OTP 二维码图片</p>
            <p class="text-xs text-gray-400">支持 PNG/JPG/JPEG/GIF 格式</p>
            <input type="file" id="fileInput" accept="image/png,image/jpeg,image/gif" class="hidden">
        </div>

        <!-- 图片预览 -->
        <div id="previewContainer" class="mb-6 hidden">
            <h3 class="text-sm font-medium text-gray-700 mb-2">图片预览</h3>
            <img id="previewImage" class="w-full h-auto rounded-lg object-contain max-h-64 mx-auto" alt="预览图">
        </div>

        <!-- 解码按钮 -->
        <button id="decodeBtn" class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors mb-6 hidden">
            开始解码
        </button>

        <!-- 加载状态 -->
        <div id="loading" class="text-center py-4 mb-6 hidden">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p class="mt-2 text-gray-600">解码中...</p>
        </div>

        <!-- 结果展示 -->
        <div id="successCard" class="result-card bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-green-800 mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                解码成功
            </h3>
            <div class="space-y-3 text-gray-700">
                <div class="flex justify-between">
                    <span class="font-medium">发行方：</span>
                    <span id="resultIssuer" class="break-all"></span>
                </div>
                <div class="flex justify-between">
                    <span class="font-medium">关联账户：</span>
                    <span id="resultAccount" class="break-all"></span>
                </div>
                <div class="flex justify-between">
                    <span class="font-medium">OTP 密钥：</span>
                    <span id="resultSecret" class="break-all font-mono bg-gray-100 px-2 py-1 rounded"></span>
                </div>
            </div>
        </div>

        <div id="errorCard" class="result-card bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-red-800 mb-2 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                解码失败
            </h3>
            <p id="errorMsg" class="text-red-700"></p>
        </div>
    </div>

    <footer class="mt-auto text-center text-gray-400 text-sm py-4">
        <p>功能与 <a href="https://github.com/Kuingsmile/decodeGoogleOTP" target="_blank" class="text-blue-500 hover:underline">decodeGoogleOTP</a> 完全一致 | 基于 Cloudflare Workers 构建</p>
    </footer>

    <script>
        // DOM 元素
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const previewContainer = document.getElementById('previewContainer');
        const previewImage = document.getElementById('previewImage');
        const decodeBtn = document.getElementById('decodeBtn');
        const loading = document.getElementById('loading');
        const successCard = document.getElementById('successCard');
        const errorCard = document.getElementById('errorCard');
        const resultIssuer = document.getElementById('resultIssuer');
        const resultAccount = document.getElementById('resultAccount');
        const resultSecret = document.getElementById('resultSecret');
        const errorMsg = document.getElementById('errorMsg');

        // 上传区域点击触发文件选择
        uploadArea.addEventListener('click', () => fileInput.click());

        // 拖拽功能
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('active');
        });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('active'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('active');
            if (e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });

        // 文件选择回调
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        // 处理文件（预览+显示解码按钮）
        function handleFile(file) {
            // 校验文件类型
            const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                showError('不支持的文件格式，请上传 PNG/JPG/JPEG/GIF 图片');
                return;
            }

            // 预览图片
            const reader = new FileReader();
            reader.onload = (e) => {
                previewImage.src = e.target.result;
                previewContainer.classList.remove('hidden');
                decodeBtn.classList.remove('hidden');
                hideAllResults();
            };
            reader.readAsDataURL(file);
        }

        // 解码按钮点击事件
        decodeBtn.addEventListener('click', async () => {
            const imageSrc = previewImage.src;
            if (!imageSrc) return;

            // 显示加载状态，隐藏其他元素
            loading.classList.remove('hidden');
            decodeBtn.classList.add('hidden');
            hideAllResults();

            try {
                // 调用后端 API（使用 Base64 格式上传）
                const response = await fetch('/decode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64: imageSrc })
                });

                const data = await response.json();
                loading.classList.add('hidden');

                if (data.success) {
                    // 显示成功结果
                    resultIssuer.textContent = data.data.issuer;
                    resultAccount.textContent = data.data.account;
                    resultSecret.textContent = data.data.secret;
                    successCard.classList.remove('hidden');
                } else {
                    // 显示错误信息
                    showError(data.error || '解码失败，请重试');
                }
            } catch (err) {
                loading.classList.add('hidden');
                showError('网络错误，请检查连接后重试');
            }
        });

        // 工具函数：隐藏所有结果卡片
        function hideAllResults() {
            successCard.classList.add('hidden');
            errorCard.classList.add('hidden');
        }

        // 工具函数：显示错误信息
        function showError(msg) {
            errorMsg.textContent = msg;
            errorCard.classList.remove('hidden');
        }
    </script>
</body>
</html>
`;

/**
 * 2. 核心解码逻辑（与之前一致，新增 API 路由区分）
 */
function parseGoogleOTPUri(uri: string): {
  issuer: string;
  account: string;
  secret: string;
} {
  if (!uri.startsWith('otpauth://totp/')) {
    throw new Error('非 Google OTP 二维码（仅支持 totp 类型）');
  }

  const url = new URL(uri);
  const path = url.pathname.slice(1);
  let issuer = url.searchParams.get('issuer') || '';
  let account = '';

  if (path.includes(':')) {
    const [pathIssuer, ...accountParts] = path.split(':');
    account = accountParts.join(':').trim();
    if (!issuer) issuer = pathIssuer.trim();
  } else {
    account = path.trim();
  }

  if (!issuer || !issuer.toLowerCase().includes('google')) {
    throw new Error('非 Google OTP 二维码（issuer 不匹配）');
  }

  const secret = url.searchParams.get('secret');
  if (!secret || !/^[A-Za-z0-9]{16,}$/.test(secret)) {
    throw new Error('未提取到有效的 OTP 密钥（需为 Base32 格式，长度≥16）');
  }

  if (!account) {
    throw new Error('未从二维码中提取到关联账户（邮箱/用户名）');
  }

  return {
    issuer: issuer.trim(),
    account: account.trim(),
    secret: secret.trim().toUpperCase(),
  };
}

async function decodeQrCode(imageData: Buffer | string): Promise<string> {
  const reader = new BrowserMultiFormatReader();
  try {
    let uint8Array: Uint8Array;

    if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
      const base64Str = imageData.split(',')[1];
      if (!base64Str) throw new Error('Base64 图片格式错误');
      
      const binaryStr = atob(base64Str);
      uint8Array = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        uint8Array[i] = binaryStr.charCodeAt(i);
      }
    } else if (imageData instanceof Buffer) {
      uint8Array = new Uint8Array(imageData);
    } else {
      throw new Error('不支持的图片输入格式');
    }

    const result = await reader.decodeFromUint8Array(uint8Array);
    if (!result) throw new Error('二维码解码失败');
    return result.getText();
  } catch (err) {
    throw new Error(`二维码解码失败（可能是图片模糊、非二维码或格式不支持）: ${(err as Error).message}`);
  } finally {
    reader.reset();
  }
}

/**
 * 3. HTTP 服务入口（新增网页路由+API 路由区分）
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const responseHeaders = new Headers({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: responseHeaders });
    }

    // 路由 1：访问根路径（/）返回网页
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(WEB_HTML, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    // 路由 2：API 路由（/decode）处理解码请求（兼容原有 API 用法）
    if (url.pathname === '/decode') {
      try {
        let qrUri: string;

        // 场景 1：POST 上传图片文件（form-data）
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
            cf: { cacheTtl: 300 },
          });

          if (!imageResp.ok) throw new Error(`图片 URL 访问失败（状态码：${imageResp.status}`);
          const imageBuffer = await imageResp.arrayBuffer();
          qrUri = await decodeQrCode(Buffer.from(imageBuffer));
        }

        // 场景 3：POST 传入 Base64 图片（JSON）
        else if (request.method === 'POST') {
          const body = await request.json().catch(() => {
            throw new Error('POST 请求体需为 JSON 格式（Base64 场景）');
          });

          if (!body.base64 || !body.base64.startsWith('data:image/')) {
            throw new Error('Base64 图片格式错误（需包含 "data:image/" 前缀）');
          }

          qrUri = await decodeQrCode(body.base64);
        }

        else {
          throw new Error(`不支持的请求方式：${request.method}\n支持用法：\n1. POST 上传图片（form-data: image）\n2. GET ?url=图片URL\n3. POST JSON { "base64": "图片Base64" }`);
        }

        const otpInfo = parseGoogleOTPUri(qrUri);
        return new Response(JSON.stringify({
          success: true,
          data: otpInfo,
        }), { headers: responseHeaders });

      } catch (error: any) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message || '解码失败',
        }), {
          status: 400,
          headers: responseHeaders,
        });
      }
    }

    // 其他路由：返回 404
    return new Response(JSON.stringify({
      success: false,
      error: '路径不存在，请访问根路径（/）使用网页工具，或访问 /decode 调用 API',
    }), {
      status: 404,
      headers: responseHeaders,
    });
  },
};
