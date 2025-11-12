import { BrowserMultiFormatReader } from '@zxing/library';

/**
 * 1. 内嵌网页 HTML（新增输出选项+报错优化）
 */
const WEB_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google OTP 二维码解码工具</title>
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
        .copy-btn {
            transition: all 0.2s ease;
        }
        .copy-btn:hover {
            background-color: #f3f4f6;
        }
        .download-btn-group {
            margin-top: 1rem;
            gap: 0.5rem;
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
            <p class="text-xs text-gray-400">支持 PNG/JPG/JPEG/GIF 格式 | 图片大小建议≤5MB</p>
            <input type="file" id="fileInput" accept="image/png,image/jpeg,image/gif" class="hidden">
        </div>

        <!-- 图片预览 -->
        <div id="previewContainer" class="mb-6 hidden">
            <h3 class="text-sm font-medium text-gray-700 mb-2">图片预览</h3>
            <img id="previewImage" class="w-full h-auto rounded-lg object-contain max-h-64 mx-auto" alt="预览图">
            <button id="removeImageBtn" class="mt-2 text-sm text-gray-500 hover:text-red-500">移除图片</button>
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

        <!-- 成功结果展示（新增复制+下载功能） -->
        <div id="successCard" class="result-card bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-green-800 mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                解码成功
            </h3>
            <div class="space-y-3 text-gray-700">
                <div class="flex justify-between items-center">
                    <span class="font-medium">发行方：</span>
                    <span id="resultIssuer" class="break-all"></span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="font-medium">关联账户：</span>
                    <span id="resultAccount" class="break-all"></span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="font-medium">OTP 密钥：</span>
                    <div class="flex items-center gap-2">
                        <span id="resultSecret" class="break-all font-mono bg-gray-100 px-2 py-1 rounded"></span>
                        <button id="copySecretBtn" class="copy-btn p-1.5 rounded-full" title="复制密钥">
                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            <!-- 下载按钮组 -->
            <div class="download-btn-group flex flex-wrap mt-4">
                <button id="downloadJsonBtn" class="bg-gray-100 text-gray-800 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    下载 JSON
                </button>
                <button id="downloadTxtBtn" class="bg-gray-100 text-gray-800 py-2 px-4 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    下载 TXT
                </button>
            </div>
        </div>

        <!-- 错误结果展示（优化报错信息） -->
        <div id="errorCard" class="result-card bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-red-800 mb-2 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                解码失败
            </h3>
            <p id="errorMsg" class="text-red-700 mb-3"></p>
            <p class="text-xs text-gray-500">常见原因：<br>1. 图片非 Google OTP 二维码<br>2. 图片模糊/被遮挡<br>3. 格式不支持（仅 PNG/JPG/JPEG/GIF）<br>4. 网络异常</p>
        </div>
    </div>

    <footer class="mt-auto text-center text-gray-400 text-sm py-4">
        <p>功能与 <a href="https://github.com/Kuingsmile/decodeGoogleOTP" target="_blank" class="text-blue-500 hover:underline">decodeGoogleOTP</a> 完全一致 | 基于 Cloudflare Workers 构建</p>
    </footer>

    <!-- 复制成功提示 -->
    <div id="copyToast" class="fixed bottom-4 right-4 bg-gray-800 text-white py-2 px-4 rounded-lg text-sm hidden">
        复制成功！
    </div>

    <script>
        // DOM 元素
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const previewContainer = document.getElementById('previewContainer');
        const previewImage = document.getElementById('previewImage');
        const removeImageBtn = document.getElementById('removeImageBtn');
        const decodeBtn = document.getElementById('decodeBtn');
        const loading = document.getElementById('loading');
        const successCard = document.getElementById('successCard');
        const errorCard = document.getElementById('errorCard');
        const resultIssuer = document.getElementById('resultIssuer');
        const resultAccount = document.getElementById('resultAccount');
        const resultSecret = document.getElementById('resultSecret');
        const copySecretBtn = document.getElementById('copySecretBtn');
        const downloadJsonBtn = document.getElementById('downloadJsonBtn');
        const downloadTxtBtn = document.getElementById('downloadTxtBtn');
        const errorMsg = document.getElementById('errorMsg');
        const copyToast = document.getElementById('copyToast');

        // 存储解码结果（用于下载）
        let decodedResult = null;

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

        // 移除图片
        removeImageBtn.addEventListener('click', () => {
            previewContainer.classList.add('hidden');
            decodeBtn.classList.add('hidden');
            hideAllResults();
            fileInput.value = '';
            decodedResult = null;
        });

        // 处理文件（预览+显示解码按钮）
        function handleFile(file) {
            // 校验文件大小（≤5MB）
            if (file.size > 5 * 1024 * 1024) {
                showError('图片过大，请上传≤5MB的图片');
                return;
            }

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
            reader.onerror = () => {
                showError('图片读取失败，请重新选择图片');
            };
            reader.readAsDataURL(file);
        }

        // 解码按钮点击事件（优化API调用逻辑）
        decodeBtn.addEventListener('click', async () => {
            const imageSrc = previewImage.src;
            if (!imageSrc) return;

            // 显示加载状态，隐藏其他元素
            loading.classList.remove('hidden');
            decodeBtn.classList.add('hidden');
            hideAllResults();

            try {
                // 优化：处理大图片Base64可能导致的问题
                const base64Str = imageSrc.split(',')[1];
                if (!base64Str) throw new Error('图片Base64编码失败');

                // 调用后端API（使用相对路径，避免跨域问题）
                const response = await fetch('/decode', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ base64: imageSrc }),
                    credentials: 'same-origin' // 避免跨域凭证问题
                });

                // 解析响应（兼容非JSON响应）
                let data;
                try {
                    data = await response.json();
                } catch (jsonErr) {
                    throw new Error(`服务端响应格式错误：${jsonErr.message}`);
                }

                loading.classList.add('hidden');

                if (response.ok && data.success) {
                    // 存储结果用于下载
                    decodedResult = data.data;
                    // 显示成功结果
                    resultIssuer.textContent = data.data.issuer || '未知';
                    resultAccount.textContent = data.data.account || '未知';
                    resultSecret.textContent = data.data.secret || '未知';
                    successCard.classList.remove('hidden');
                } else {
                    // 显示错误信息（优先取服务端错误，否则取HTTP状态）
                    const errMsg = data?.error || `服务端错误（状态码：${response.status}）`;
                    showError(errMsg);
                }
            } catch (err) {
                loading.classList.add('hidden');
                // 前端错误详细提示
                showError(`解码过程出错：${err instanceof Error ? err.message : '未知错误'}`);
                console.error('解码错误详情：', err);
            }
        });

        // 复制密钥功能
        copySecretBtn.addEventListener('click', () => {
            const secret = resultSecret.textContent || '';
            if (!secret) {
                showToast('无密钥可复制');
                return;
            }

            // 优化复制逻辑，兼容不同浏览器
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(secret)
                    .then(() => showToast('密钥复制成功！'))
                    .catch(() => copyWithFallback(secret));
            } else {
                copyWithFallback(secret);
            }
        });

        // 降级复制方案（兼容旧浏览器）
        function copyWithFallback(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('密钥复制成功！');
            } catch (err) {
                showToast('复制失败，请手动复制');
                console.error('复制失败：', err);
            } finally {
                document.body.removeChild(textarea);
            }
        }

        // 下载JSON结果
        downloadJsonBtn.addEventListener('click', () => {
            if (!decodedResult) {
                showToast('无解码结果可下载');
                return;
            }
            const jsonStr = JSON.stringify(decodedResult, null, 2);
            downloadFile(jsonStr, 'otp-decode-result.json', 'application/json');
        });

        // 下载TXT结果
        downloadTxtBtn.addEventListener('click', () => {
            if (!decodedResult) {
                showToast('无解码结果可下载');
                return;
            }
            const txtStr = [
                `Google OTP 解码结果`,
                `-------------------`,
                `发行方（Issuer）: ${decodedResult.issuer || '未知'}`,
                `关联账户（Account）: ${decodedResult.account || '未知'}`,
                `OTP 密钥（Secret）: ${decodedResult.secret || '未知'}`
            ].join('\n');
            downloadFile(txtStr, 'otp-decode-result.txt', 'text/plain');
        });

        // 文件下载工具函数
        function downloadFile(content, filename, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`文件已下载：${filename}`);
        }

        // 提示工具函数
        function showToast(msg) {
            copyToast.textContent = msg;
            copyToast.classList.remove('hidden');
            setTimeout(() => {
                copyToast.classList.add('hidden');
            }, 2000);
        }

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
 * 2. 核心解码逻辑（优化错误处理+日志输出）
 */
function parseGoogleOTPUri(uri: string): {
  issuer: string;
  account: string;
  secret: string;
} {
  try {
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
      throw new Error(`非 Google OTP 二维码（issuer: ${issuer || '未知'}）`);
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
  } catch (err) {
    // 增加错误日志，方便排查
    console.error('URI解析错误：', err);
    throw err;
  }
}

async function decodeQrCode(imageData: Buffer | string): Promise<string> {
  const reader = new BrowserMultiFormatReader();
  try {
    let uint8Array: Uint8Array;

    if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
      const base64Str = imageData.split(',')[1];
      if (!base64Str) throw new Error('Base64 图片格式错误（缺少数据部分）');
      
      // 优化Base64解码兼容性
      const binaryStr = atob(base64Str.replace(/\s/g, '')); // 去除空格
      uint8Array = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        uint8Array[i] = binaryStr.charCodeAt(i);
      }
    } else if (imageData instanceof Buffer) {
      uint8Array = new Uint8Array(imageData);
    } else {
      throw new Error(`不支持的图片输入格式（类型：${typeof imageData}）`);
    }

    // 增加解码超时处理（5秒）
    const decodePromise = reader.decodeFromUint8Array(uint8Array);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('二维码解码超时（图片可能过大或模糊）')), 5000)
    );

    const result = await Promise.race([decodePromise, timeoutPromise]);
    if (!result) throw new Error('未识别到二维码内容');
    return result.getText();
  } catch (err) {
    console.error('二维码解码错误：', err);
    throw err;
  } finally {
    reader.reset();
  }
}

/**
 * 3. HTTP 服务入口（优化跨域+错误处理）
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const responseHeaders = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400', // 跨域缓存1天
    });

    // 处理 OPTIONS 预检请求（优化跨域配置）
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        headers: responseHeaders,
        status: 204
      });
    }

    // 路由 1：访问根路径（/）返回网页
    if (request.method === 'GET' && url.pathname === '/') {
      responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
      responseHeaders.delete('Content-Type'); // 清除JSON类型
      responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
      return new Response(WEB_HTML, { headers: responseHeaders });
    }

    // 路由 2：API 路由（/decode）处理解码请求
    if (url.pathname === '/decode') {
      responseHeaders.set('Content-Type', 'application/json');
      try {
        let qrUri: string;

        // 场景 1：POST 上传图片文件（form-data）
        if (request.method === 'POST' && request.headers.get('Content-Type')?.includes('multipart/form-data')) {
          try {
            const formData = await request.formData();
            const file = formData.get('image') as File | null;
            if (!file) throw new Error('请上传图片文件（字段名：image）');
            
            const fileBuffer = await file.arrayBuffer();
            qrUri = await decodeQrCode(Buffer.from(fileBuffer));
          } catch (err) {
            throw new Error(`表单上传失败：${(err as Error).message}`);
          }
        }

        // 场景 2：GET 请求传入图片 URL（query 参数：url）
        else if (request.method === 'GET' && url.searchParams.has('url')) {
          try {
            const imageUrl = url.searchParams.get('url')!;
            // 校验URL格式
            if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
              throw new Error('图片URL格式错误（需以 http/https 开头）');
            }

            const imageResp = await fetch(imageUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Cloudflare Workers)' },
              cf: { cacheTtl: 300 },
              redirect: 'follow', // 跟随重定向
              timeout: 5000 // 5秒超时
            });

            if (!imageResp.ok) throw new Error(`图片URL访问失败（状态码：${imageResp.status}）`);
            const imageBuffer = await imageResp.arrayBuffer();
            qrUri = await decodeQrCode(Buffer.from(imageBuffer));
          } catch (err) {
            throw new Error(`URL图片解码失败：${(err as Error).message}`);
          }
        }

        // 场景 3：POST 传入 Base64 图片（JSON）
        else if (request.method === 'POST') {
          try {
            const body = await request.json();
            if (!body.base64 || !body.base64.startsWith('data:image/')) {
              throw new Error('Base64 图片格式错误（需包含 "data:image/" 前缀）');
            }
            qrUri = await decodeQrCode(body.base64);
          } catch (err) {
            throw new Error(`Base64解码失败：${(err as Error).message}`);
          }
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
        const errMsg = error.message || '解码失败';
        console.error('API错误：', errMsg, error.stack);
        return new Response(JSON.stringify({
          success: false,
          error: errMsg,
        }), {
          status: 400,
          headers: responseHeaders,
        });
      }
    }

    // 其他路由：返回 404
    responseHeaders.set('Content-Type', 'application/json');
    return new Response(JSON.stringify({
      success: false,
      error: '路径不存在，请访问根路径（/）使用网页工具，或访问 /decode 调用 API',
    }), {
      status: 404,
      headers: responseHeaders,
    });
  },
};
