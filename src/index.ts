import { BrowserMultiFormatReader } from '@zxing/library';

/**
 * 1. 内嵌网页 HTML（彻底修复引号冲突和语法错误）
 */
const WEB_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google OTP 二维码解码工具</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- 引入二维码生成库（备选CDN，稳定性更高） -->
    <script src="https://cdn.bootcdn.net/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
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
        .qrcode-container {
            margin: 1rem 0;
            display: flex;
            flex-direction: column;
            align-items: center;
        }
        .qrcode-preview {
            border: 4px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            border-radius: 8px;
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

        <!-- 成功结果展示（含二维码导出功能） -->
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

            <!-- 二维码导出区域 -->
            <div class="mt-6 pt-4 border-t border-green-100">
                <h4 class="font-medium text-gray-800 mb-3">导出二维码</h4>
                <div class="qrcode-container">
                    <!-- 二维码预览 -->
                    <canvas id="qrcodeCanvas" class="qrcode-preview w-48 h-48 md:w-64 md:h-64"></canvas>
                    <p class="text-xs text-gray-500 mt-2">扫码即可绑定 OTP 客户端</p>
                </div>
                <!-- 二维码下载按钮 -->
                <button id="downloadQrBtn" class="mt-3 bg-blue-50 text-blue-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                    <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    下载二维码图片
                </button>
            </div>

            <!-- 原有下载按钮组 -->
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

        <!-- 错误结果展示 -->
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

    <!-- 复制/操作成功提示 -->
    <div id="copyToast" class="fixed bottom-4 right-4 bg-gray-800 text-white py-2 px-4 rounded-lg text-sm hidden">
        操作成功！
    </div>

    <script>
        // 等待 DOM 完全加载（避免元素未找到）
        document.addEventListener('DOMContentLoaded', function() {
            // 1. 获取所有 DOM 元素（统一用单引号，避免冲突）
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
            const downloadQrBtn = document.getElementById('downloadQrBtn');
            const qrcodeCanvas = document.getElementById('qrcodeCanvas');
            const errorMsg = document.getElementById('errorMsg');
            const copyToast = document.getElementById('copyToast');

            // 全局变量（简化命名，避免冲突）
            let decodedResult = null;
            const qrCodeLoaded = typeof QRCode !== 'undefined'; // 二维码库加载状态

            // 2. 上传区域点击事件（核心：确保事件绑定无语法错误）
            if (uploadArea && fileInput) {
                uploadArea.addEventListener('click', function() {
                    fileInput.click();
                });
            }

            // 3. 拖拽功能（修复引号和拼接）
            if (uploadArea) {
                uploadArea.addEventListener('dragover', function(e) {
                    e.preventDefault();
                    uploadArea.classList.add('active');
                });

                uploadArea.addEventListener('dragleave', function() {
                    uploadArea.classList.remove('active');
                });

                uploadArea.addEventListener('drop', function(e) {
                    e.preventDefault();
                    uploadArea.classList.remove('active');
                    if (e.dataTransfer.files.length > 0) {
                        handleFile(e.dataTransfer.files[0]);
                    }
                });
            }

            // 4. 文件选择回调
            if (fileInput) {
                fileInput.addEventListener('change', function(e) {
                    if (e.target.files.length > 0) {
                        handleFile(e.target.files[0]);
                    }
                });
            }

            // 5. 移除图片按钮
            if (removeImageBtn && previewContainer && decodeBtn) {
                removeImageBtn.addEventListener('click', function() {
                    previewContainer.classList.add('hidden');
                    decodeBtn.classList.add('hidden');
                    hideAllResults();
                    if (fileInput) fileInput.value = '';
                    decodedResult = null;
                    // 清空二维码画布
                    if (qrcodeCanvas) {
                        const ctx = qrcodeCanvas.getContext('2d');
                        ctx.clearRect(0, 0, qrcodeCanvas.width, qrcodeCanvas.height);
                    }
                });
            }

            // 6. 解码按钮（核心功能，修复所有语法错误）
            if (decodeBtn && previewImage) {
                decodeBtn.addEventListener('click', async function() {
                    const imageSrc = previewImage.src;
                    if (!imageSrc) return;

                    // 显示加载状态
                    if (loading) loading.classList.remove('hidden');
                    decodeBtn.classList.add('hidden');
                    hideAllResults();

                    try {
                        // 处理 Base64 字符串（修复拼接语法）
                        const base64Parts = imageSrc.split(',');
                        if (base64Parts.length < 2) throw new Error('图片Base64编码失败');
                        const base64Str = base64Parts[1];

                        // 调用后端 API（修复请求体语法）
                        const response = await fetch('/decode', {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify({ base64: imageSrc }),
                            credentials: 'same-origin'
                        });

                        // 解析响应（修复错误提示字符串）
                        let data;
                        try {
                            data = await response.json();
                        } catch (jsonErr) {
                            throw new Error('服务端响应格式错误');
                        }

                        // 隐藏加载状态
                        if (loading) loading.classList.add('hidden');

                        if (response.ok && data.success) {
                            decodedResult = data.data;
                            // 显示解码结果（修复属性访问语法）
                            if (resultIssuer) resultIssuer.textContent = data.data.issuer || '未知';
                            if (resultAccount) resultAccount.textContent = data.data.account || '未知';
                            if (resultSecret) resultSecret.textContent = data.data.secret || '未知';
                            if (successCard) successCard.classList.remove('hidden');

                            // 生成二维码（容错处理）
                            if (qrCodeLoaded) {
                                await generateQrCode(data.data);
                            } else {
                                showToast('二维码库加载失败，无法生成二维码');
                            }
                        } else {
                            const errMsg = data?.error || '服务端错误';
                            showError(errMsg);
                        }
                    } catch (err) {
                        if (loading) loading.classList.add('hidden');
                        const errText = '解码过程出错：' + (err instanceof Error ? err.message : '未知错误');
                        showError(errText);
                        console.error(errText, err);
                    }
                });
            }

            // 7. 复制密钥功能（修复剪贴板语法）
            if (copySecretBtn && resultSecret) {
                copySecretBtn.addEventListener('click', function() {
                    const secret = resultSecret.textContent || '';
                    if (!secret) {
                        showToast('无密钥可复制');
                        return;
                    }

                    if (navigator.clipboard && window.isSecureContext) {
                        navigator.clipboard.writeText(secret)
                            .then(function() {
                                showToast('密钥复制成功！');
                            })
                            .catch(function() {
                                copyWithFallback(secret);
                            });
                    } else {
                        copyWithFallback(secret);
                    }
                });
            }

            // 8. 下载二维码（修复文件名拼接语法）
            if (downloadQrBtn && qrcodeCanvas) {
                downloadQrBtn.addEventListener('click', function() {
                    if (!decodedResult || !qrCodeLoaded) {
                        showToast('无解码结果或二维码库未加载');
                        return;
                    }

                    try {
                        const qrUrl = qrcodeCanvas.toDataURL('image/png');
                        const a = document.createElement('a');
                        a.href = qrUrl;
                        // 文件名拼接（彻底修复：避免引号冲突）
                        let filename = 'Google-OTP-';
                        filename += decodedResult.account ? decodedResult.account : 'unknown';
                        filename += '.png';
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(qrUrl);
                        showToast('二维码下载成功！');
                    } catch (err) {
                        showToast('二维码下载失败，请重试');
                        console.error('二维码下载失败：', err);
                    }
                });
            }

            // 9. 下载 JSON（修复字符串拼接）
            if (downloadJsonBtn) {
                downloadJsonBtn.addEventListener('click', function() {
                    if (!decodedResult) {
                        showToast('无解码结果可下载');
                        return;
                    }
                    const jsonStr = JSON.stringify(decodedResult, null, 2);
                    downloadFile(jsonStr, 'otp-decode-result.json', 'application/json');
                });
            }

            // 10. 下载 TXT（修复多行字符串拼接，避免语法错误）
            if (downloadTxtBtn) {
                downloadTxtBtn.addEventListener('click', function() {
                    if (!decodedResult) {
                        showToast('无解码结果可下载');
                        return;
                    }

                    // 逐行拼接，避免引号冲突和遗漏加号
                    let txtStr = 'Google OTP 解码结果\\n';
                    txtStr += '-------------------\\n';
                    txtStr += '发行方（Issuer）: ';
                    txtStr += decodedResult.issuer ? decodedResult.issuer : '未知';
                    txtStr += '\\n';
                    txtStr += '关联账户（Account）: ';
                    txtStr += decodedResult.account ? decodedResult.account : '未知';
                    txtStr += '\\n';
                    txtStr += 'OTP 密钥（Secret）: ';
                    txtStr += decodedResult.secret ? decodedResult.secret : '未知';
                    txtStr += '\\n';
                    // 二维码 URI 拼接（修复编码和引号）
                    const issuerEnc = encodeURIComponent(decodedResult.issuer || '');
                    const accountEnc = encodeURIComponent(decodedResult.account || '');
                    const secret = decodedResult.secret || '';
                    txtStr += '二维码URI: otpauth://totp/';
                    txtStr += issuerEnc;
                    txtStr += ':';
                    txtStr += accountEnc;
                    txtStr += '?secret=';
                    txtStr += secret;
                    txtStr += '&issuer=';
                    txtStr += issuerEnc;

                    downloadFile(txtStr, 'otp-decode-result.txt', 'text/plain');
                });
            }

            // 11. 处理文件预览（修复函数内部语法）
            function handleFile(file) {
                // 校验文件大小
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

                // 读取图片并预览
                const reader = new FileReader();
                reader.onload = function(e) {
                    if (previewImage) previewImage.src = e.target.result;
                    if (previewContainer) previewContainer.classList.remove('hidden');
                    if (decodeBtn) decodeBtn.classList.remove('hidden');
                    hideAllResults();
                };
                reader.onerror = function() {
                    showError('图片读取失败，请重新选择图片');
                };
                reader.readAsDataURL(file);
            }

            // 12. 生成二维码（修复 URI 拼接语法）
            async function generateQrCode(otpData) {
                try {
                    const otpUri = new URL('otpauth://totp/');
                    // 路径拼接（修复编码和引号）
                    const issuerEnc = encodeURIComponent(otpData.issuer || '');
                    const accountEnc = encodeURIComponent(otpData.account || '');
                    const path = issuerEnc + ':' + accountEnc;
                    otpUri.pathname = path;
                    // 设置参数（修复属性访问）
                    otpUri.searchParams.set('secret', otpData.secret || '');
                    otpUri.searchParams.set('issuer', otpData.issuer || '');
                    otpUri.searchParams.set('algorithm', 'SHA1');
                    otpUri.searchParams.set('digits', '6');
                    otpUri.searchParams.set('period', '30');

                    // 生成二维码（修复回调语法）
                    await QRCode.toCanvas(qrcodeCanvas, otpUri.toString(), {
                        width: 256,
                        margin: 1,
                        color: { dark: '#000000', light: '#ffffff' }
                    });
                } catch (err) {
                    showToast('二维码生成失败，请重试');
                    console.error('二维码生成失败：', err);
                    if (qrcodeCanvas) {
                        const ctx = qrcodeCanvas.getContext('2d');
                        ctx.clearRect(0, 0, qrcodeCanvas.width, qrcodeCanvas.height);
                    }
                }
            }

            // 13. 文件下载工具函数（修复 Blob 语法）
            function downloadFile(content, filename, mimeType) {
                try {
                    const blob = new Blob([content], { type: mimeType });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    showToast('文件已下载：' + filename);
                } catch (err) {
                    showToast('文件下载失败，请重试');
                    console.error('文件下载失败：', err);
                }
            }

            // 14. 降级复制方案（修复文本域语法）
            function copyWithFallback(text) {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px'; // 避免遮挡
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

            // 15. 提示工具函数（修复 DOM 操作语法）
            function showToast(msg) {
                if (copyToast) {
                    copyToast.textContent = msg;
                    copyToast.classList.remove('hidden');
                    setTimeout(function() {
                        copyToast.classList.add('hidden');
                    }, 2000);
                }
            }

            // 16. 隐藏所有结果卡片（修复 DOM 操作）
            function hideAllResults() {
                if (successCard) successCard.classList.add('hidden');
                if (errorCard) errorCard.classList.add('hidden');
            }

            // 17. 显示错误信息（修复 DOM 操作）
            function showError(msg) {
                if (errorMsg) errorMsg.textContent = msg;
                if (errorCard) errorCard.classList.remove('hidden');
            }

            // 初始化检查（可选：提示二维码库加载状态）
            if (!qrCodeLoaded) {
                console.warn('QRCode 库加载失败，二维码功能不可用');
            }
        });
    </script>
</body>
</html>
`;

/**
 * 2. 核心解码逻辑（无变更，保持稳定性）
 */
function parseGoogleOTPUri(uri: string): {
  issuer: string;
  account: string;
  secret: string;
} {
  try {
    if (!uri.startsWith('otpauth://totp/')) {
      throw new Error('Not a Google OTP QR code (only supports totp type)');
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
      throw new Error(`Not a Google OTP QR code (issuer: ${issuer || 'unknown'})`);
    }

    const secret = url.searchParams.get('secret');
    if (!secret || !/^[A-Za-z0-9]{16,}$/.test(secret)) {
      throw new Error('Valid OTP secret not found (must be Base32 format, length ≥16)');
    }

    if (!account) {
      throw new Error('Associated account (email/username) not found in QR code');
    }

    return {
      issuer: issuer.trim(),
      account: account.trim(),
      secret: secret.trim().toUpperCase(),
    };
  } catch (err) {
    console.error('URI parse error:', err);
    throw err;
  }
}

async function decodeQrCode(imageData: Buffer | string): Promise<string> {
  const reader = new BrowserMultiFormatReader();
  try {
    let uint8Array: Uint8Array;

    if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
      const base64Str = imageData.split(',')[1];
      if (!base64Str) throw new Error('Base64 image format error (missing data part)');
      
      const binaryStr = atob(base64Str.replace(/\s/g, ''));
      uint8Array = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        uint8Array[i] = binaryStr.charCodeAt(i);
      }
    } else if (imageData instanceof Buffer) {
      uint8Array = new Uint8Array(imageData);
    } else {
      throw new Error(`Unsupported image input format (type: ${typeof imageData})`);
    }

    const decodePromise = reader.decodeFromUint8Array(uint8Array);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('QR code decode timeout (image may be too large or blurry)')), 5000)
    );

    const result = await Promise.race([decodePromise, timeoutPromise]);
    if (!result) throw new Error('No QR code content detected');
    return result.getText();
  } catch (err) {
    console.error('QR code decode error:', err);
    throw err;
  } finally {
    reader.reset();
  }
}

/**
 * 3. HTTP 服务入口（无变更）
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const responseHeaders = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    });

    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        headers: responseHeaders,
        status: 204
      });
    }

    if (request.method === 'GET' && url.pathname === '/') {
      responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
      return new Response(WEB_HTML, { headers: responseHeaders });
    }

    if (url.pathname === '/decode') {
      responseHeaders.set('Content-Type', 'application/json');
      try {
        let qrUri: string;

        if (request.method === 'POST' && request.headers.get('Content-Type')?.includes('multipart/form-data')) {
          try {
            const formData = await request.formData();
            const file = formData.get('image') as File | null;
            if (!file) throw new Error('Please upload an image file (field name: image)');
            
            const fileBuffer = await file.arrayBuffer();
            qrUri = await decodeQrCode(Buffer.from(fileBuffer));
          } catch (err) {
            throw new Error(`Form upload failed: ${(err as Error).message}`);
          }
        }

        else if (request.method === 'GET' && url.searchParams.has('url')) {
          try {
            const imageUrl = url.searchParams.get('url')!;
            if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
              throw new Error('Invalid image URL format (must start with http/https)');
            }

            const imageResp = await fetch(imageUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Cloudflare Workers)' },
              cf: { cacheTtl: 300 },
              redirect: 'follow',
              timeout: 5000
            });

            if (!imageResp.ok) throw new Error(`Image URL request failed (status code: ${imageResp.status})`);
            const imageBuffer = await imageResp.arrayBuffer();
            qrUri = await decodeQrCode(Buffer.from(imageBuffer));
          } catch (err) {
            throw new Error(`URL image decode failed: ${(err as Error).message}`);
          }
        }

        else if (request.method === 'POST') {
          try {
            const body = await request.json();
            if (!body.base64 || !body.base64.startsWith('data:image/')) {
              throw new Error('Invalid Base64 image format (must include "data:image/" prefix)');
            }
            qrUri = await decodeQrCode(body.base64);
          } catch (err) {
            throw new Error(`Base64 decode failed: ${(err as Error).message}`);
          }
        }

        else {
          throw new Error(`Unsupported request method: ${request.method}\nSupported usages:\n1. POST image (form-data: image)\n2. GET ?url=image-url\n3. POST JSON { "base64": "image-base64" }`);
        }

        const otpInfo = parseGoogleOTPUri(qrUri);
        return new Response(JSON.stringify({
          success: true,
          data: otpInfo,
        }), { headers: responseHeaders });

      } catch (error: any) {
        const errMsg = error.message || 'Decode failed';
        console.error('API error:', errMsg, error.stack);
        return new Response(JSON.stringify({
          success: false,
          error: errMsg,
        }), {
          status: 400,
          headers: responseHeaders,
        });
      }
    }

    responseHeaders.set('Content-Type', 'application/json');
    return new Response(JSON.stringify({
      success: false,
      error: 'Path not found. Visit root path (/) for web tool, or /decode for API',
    }), {
      status: 404,
      headers: responseHeaders,
    });
  },
};
