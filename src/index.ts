import { BrowserMultiFormatReader } from '@zxing/library';

/**
 * 1. 内嵌网页 HTML（优化请求处理+错误展示）
 */
const WEB_HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google OTP 二维码解码工具</title>
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
        .error-tip {
            color: #ef4444;
            font-size: 0.875rem;
            margin-top: 0.5rem;
        }
        .notice-card {
            background-color: #f0f9ff;
            border: 1px solid #3b82f6;
            border-radius: 8px;
            padding: 1rem;
            margin-bottom: 1rem;
            color: #1e40af;
        }
    </style>
</head>
<body class="min-h-screen bg-gray-50 flex flex-col items-center p-4 md:p-8">
    <div class="w-full max-w-2xl bg-white rounded-xl shadow-md p-6 md:p-8">
        <!-- 直接访问 /decode 时的提示 -->
        <div id="directAccessNotice" class="notice-card hidden">
            <p>⚠️  该路径仅支持 API 调用，不支持直接访问</p>
            <p class="mt-1 text-sm">请访问 <a href="/" class="text-blue-600 hover:underline">首页</a> 使用网页工具，或通过 POST 请求调用 API</p>
        </div>

        <h1 class="text-2xl md:text-3xl font-bold text-center text-gray-800 mb-6">Google OTP 二维码解码工具</h1>
        
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

        <!-- 成功结果展示 -->
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
                    <canvas id="qrcodeCanvas" class="qrcode-preview w-48 h-48 md:w-64 md:h-64"></canvas>
                    <p class="text-xs text-gray-500 mt-2">扫码即可绑定 OTP 客户端</p>
                </div>
                <button id="downloadQrBtn" class="mt-3 bg-blue-50 text-blue-700 py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                    <svg class="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    下载二维码图片
                </button>
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

        <!-- 错误结果展示（增强具体原因） -->
        <div id="errorCard" class="result-card bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <h3 class="text-lg font-semibold text-red-800 mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
                解码失败
            </h3>
            <p id="errorMsg" class="text-red-700 mb-3"></p>
            <p class="error-tip">排查建议：</p>
            <ul class="error-tip list-disc pl-5 space-y-1">
                <li>确保图片是清晰、完整的 TOTP 类型二维码</li>
                <li>避免图片被裁剪、遮挡或压缩过度</li>
                <li>仅支持 PNG/JPG/JPEG/GIF 格式，大小≤5MB</li>
                <li>网络异常时请刷新页面重试</li>
            </ul>
        </div>
    </div>

    <footer class="mt-auto text-center text-gray-400 text-sm py-4">
        <p>功能与 <a href="https://github.com/Kuingsmile/decodeGoogleOTP" target="_blank" class="text-blue-500 hover:underline">decodeGoogleOTP</a> 完全一致 | 基于 Cloudflare Workers 构建</p>
    </footer>

    <!-- 操作提示 -->
    <div id="copyToast" class="fixed bottom-4 right-4 bg-gray-800 text-white py-2 px-4 rounded-lg text-sm hidden">
        操作成功！
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // 检测是否直接访问 /decode 路径
            const currentPath = window.location.pathname;
            const directAccessNotice = document.getElementById('directAccessNotice');
            const mainContent = document.querySelector('.upload-area');
            if (currentPath === '/decode' && directAccessNotice && mainContent) {
                directAccessNotice.classList.remove('hidden');
                mainContent.style.display = 'none'; // 隐藏上传区域，避免误导
            }

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
            const downloadQrBtn = document.getElementById('downloadQrBtn');
            const qrcodeCanvas = document.getElementById('qrcodeCanvas');
            const errorMsg = document.getElementById('errorMsg');
            const copyToast = document.getElementById('copyToast');

            // 全局变量
            let decodedResult = null;
            const qrCodeLoaded = typeof QRCode !== 'undefined';

            // 上传区域点击
            if (uploadArea && fileInput) {
                uploadArea.addEventListener('click', function() {
                    fileInput.click();
                });
            }

            // 拖拽功能
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

            // 文件选择回调
            if (fileInput) {
                fileInput.addEventListener('change', function(e) {
                    if (e.target.files.length > 0) {
                        handleFile(e.target.files[0]);
                    }
                });
            }

            // 移除图片
            if (removeImageBtn && previewContainer && decodeBtn) {
                removeImageBtn.addEventListener('click', function() {
                    previewContainer.classList.add('hidden');
                    decodeBtn.classList.add('hidden');
                    hideAllResults();
                    if (fileInput) fileInput.value = '';
                    decodedResult = null;
                    if (qrcodeCanvas) {
                        const ctx = qrcodeCanvas.getContext('2d');
                        ctx.clearRect(0, 0, qrcodeCanvas.width, qrcodeCanvas.height);
                    }
                });
            }

            // 解码按钮（核心修复：Base64 处理+错误透传）
            if (decodeBtn && previewImage) {
                decodeBtn.addEventListener('click', async function() {
                    const imageSrc = previewImage.src;
                    if (!imageSrc) return;

                    // 显示加载状态
                    if (loading) loading.classList.remove('hidden');
                    decodeBtn.classList.add('hidden');
                    hideAllResults();

                    try {
                        // 修复1：严格处理 Base64（确保无前缀+无无效字符）
                        const base64Match = imageSrc.match(/^data:image\\/(png|jpeg|jpg|gif);base64,(.+)$/i);
                        if (!base64Match || base64Match.length < 3) {
                            throw new Error('图片格式无效：仅支持 Base64 编码的 PNG/JPG/JPEG/GIF 图片');
                        }
                        let base64Str = base64Match[2].replace(/\\s|\\n|\\r/g, ''); // 移除所有空白字符和换行

                        // 修复2：构造标准 JSON 请求体
                        let requestBody;
                        try {
                            requestBody = JSON.stringify({ base64: base64Str });
                        } catch (jsonErr) {
                            throw new Error('请求体构造失败：Base64 字符串包含无效字符');
                        }

                        // 发送请求
                        const response = await fetch('/decode', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json; charset=utf-8',
                                'Accept': 'application/json'
                            },
                            body: requestBody,
                            credentials: 'same-origin'
                        });

                        // 修复3：完整解析响应（含非 200 状态）
                        let data;
                        try {
                            data = await response.json();
                        } catch (jsonErr) {
                            const errText = await response.text().catch(() => '服务端返回非 JSON 响应');
                            throw new Error('服务端响应异常：' + errText);
                        }

                        // 隐藏加载状态
                        if (loading) loading.classList.add('hidden');

                        if (response.ok && data.success) {
                            decodedResult = data.data;
                            // 显示结果
                            if (resultIssuer) resultIssuer.textContent = data.data.issuer || '未知';
                            if (resultAccount) resultAccount.textContent = data.data.account || '未知';
                            if (resultSecret) resultSecret.textContent = data.data.secret || '未知';
                            if (successCard) successCard.classList.remove('hidden');

                            // 生成二维码
                            if (qrCodeLoaded) {
                                await generateQrCode(data.data);
                            } else {
                                showToast('二维码库加载失败，无法生成二维码');
                            }
                        } else {
                            // 修复4：透传后端具体错误信息
                            const errDetail = data?.error || `状态码：${response.status}，无详细信息`;
                            showError('请求失败：' + errDetail);
                        }
                    } catch (err) {
                        if (loading) loading.classList.add('hidden');
                        const errText = err instanceof Error ? err.message : '未知错误';
                        showError('解码失败：' + errText);
                        console.error('解码错误详情：', err);
                    }
                });
            }

            // 复制密钥
            if (copySecretBtn && resultSecret) {
                copySecretBtn.addEventListener('click', function() {
                    const secret = resultSecret.textContent || '';
                    if (!secret) {
                        showToast('无密钥可复制');
                        return;
                    }

                    if (navigator.clipboard && window.isSecureContext) {
                        navigator.clipboard.writeText(secret)
                            .then(() => showToast('密钥复制成功！'))
                            .catch(() => copyWithFallback(secret));
                    } else {
                        copyWithFallback(secret);
                    }
                });
            }

            // 下载二维码
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

            // 下载 JSON
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

            // 下载 TXT
            if (downloadTxtBtn) {
                downloadTxtBtn.addEventListener('click', function() {
                    if (!decodedResult) {
                        showToast('无解码结果可下载');
                        return;
                    }

                    let txtStr = 'Google OTP 解码结果\\n';
                    txtStr += '-------------------\\n';
                    txtStr += '发行方（Issuer）: ' + (decodedResult.issuer || '未知') + '\\n';
                    txtStr += '关联账户（Account）: ' + (decodedResult.account || '未知') + '\\n';
                    txtStr += 'OTP 密钥（Secret）: ' + (decodedResult.secret || '未知') + '\\n';
                    const issuerEnc = encodeURIComponent(decodedResult.issuer || '');
                    const accountEnc = encodeURIComponent(decodedResult.account || '');
                    const secret = decodedResult.secret || '';
                    txtStr += '二维码URI: otpauth://totp/' + issuerEnc + ':' + accountEnc + '?secret=' + secret + '&issuer=' + issuerEnc;

                    downloadFile(txtStr, 'otp-decode-result.txt', 'text/plain');
                });
            }

            // 处理文件预览
            function handleFile(file) {
                if (file.size > 5 * 1024 * 1024) {
                    showError('图片过大：请上传≤5MB的图片');
                    return;
                }

                const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
                if (!allowedTypes.includes(file.type)) {
                    showError('格式不支持：仅支持 PNG/JPG/JPEG/GIF 图片');
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    if (previewImage) previewImage.src = e.target.result;
                    if (previewContainer) previewContainer.classList.remove('hidden');
                    if (decodeBtn) decodeBtn.classList.remove('hidden');
                    hideAllResults();
                };
                reader.onerror = function() {
                    showError('图片读取失败：请选择完整、未损坏的图片');
                };
                reader.readAsDataURL(file);
            }

            // 生成二维码
            async function generateQrCode(otpData) {
                try {
                    const otpUri = new URL('otpauth://totp/');
                    const issuerEnc = encodeURIComponent(otpData.issuer || '');
                    const accountEnc = encodeURIComponent(otpData.account || '');
                    const path = issuerEnc + ':' + accountEnc;
                    otpUri.pathname = path;
                    otpUri.searchParams.set('secret', otpData.secret || '');
                    otpUri.searchParams.set('issuer', otpData.issuer || '');
                    otpUri.searchParams.set('algorithm', 'SHA1');
                    otpUri.searchParams.set('digits', '6');
                    otpUri.searchParams.set('period', '30');

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

            // 文件下载工具函数
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

            // 降级复制方案
            function copyWithFallback(text) {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
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

            // 提示工具函数
            function showToast(msg) {
                if (copyToast) {
                    copyToast.textContent = msg;
                    copyToast.classList.remove('hidden');
                    setTimeout(() => {
                        copyToast.classList.add('hidden');
                    }, 2000);
                }
            }

            // 隐藏所有结果卡片
            function hideAllResults() {
                if (successCard) successCard.classList.add('hidden');
                if (errorCard) errorCard.classList.add('hidden');
            }

            // 显示错误信息
            function showError(msg) {
                if (errorMsg) errorMsg.textContent = msg;
                if (errorCard) errorCard.classList.remove('hidden');
            }

            // 初始化检查
            if (!qrCodeLoaded) {
                console.warn('QR Code library loaded failed, QR Code function unavailable');
            }
        });
    </script>
</body>
</html>
`;

/**
 * 2. 核心解码逻辑（优化参数校验+错误信息）
 */
function parseGoogleOTPUri(uri: string): {
  issuer: string;
  account: string;
  secret: string;
} {
  try {
    if (!uri.startsWith('otpauth://totp/')) {
      throw new Error('仅支持 TOTP 类型 OTP 二维码，不支持其他类型');
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

    const secret = url.searchParams.get('secret') || '';
    if (!secret) {
      throw new Error('二维码中未找到 OTP 密钥字段');
    }
    if (!/^[A-Za-z0-9+/=]{16,}$/.test(secret)) {
      throw new Error('OTP 密钥格式无效（应为 Base32 编码，长度≥16）');
    }

    if (!account) {
      throw new Error('二维码中未找到关联账户信息');
    }

    return {
      issuer: issuer.trim(),
      account: account.trim(),
      secret: secret.trim().toUpperCase(),
    };
  } catch (err) {
    console.error('URI 解析错误:', err);
    throw err;
  }
}

async function decodeQrCode(base64Str: string): Promise<string> {
  try {
    const reader = new BrowserMultiFormatReader();
    // 校验 Base64 有效性
    try {
      atob(base64Str); // 验证 Base64 格式
    } catch (base64Err) {
      throw new Error('Base64 编码无效：无法解码为二进制数据');
    }
    const uint8Array = Uint8Array.from(atob(base64Str), c => c.charCodeAt(0));

    const decodePromise = reader.decodeFromUint8Array(uint8Array);
    const timeoutPromise = new Promise<string>((_, reject) => 
      setTimeout(() => reject(new Error('解码超时（8秒）：图片可能过大、模糊或非二维码')), 8000)
    );

    const result = await Promise.race([decodePromise, timeoutPromise]);
    if (!result || !result.getText()) {
      throw new Error('未识别到二维码内容：图片可能损坏或不是标准二维码');
    }

    return result.getText();
  } catch (err) {
    console.error('二维码解码错误:', err);
    throw err;
  }
}

/**
 * 3. HTTP 服务入口（优化跨域+请求校验+错误响应）
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const responseHeaders = new Headers({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json; charset=utf-8',
    });

    // 处理 OPTIONS 预检请求（修复跨域）
    if (request.method === 'OPTIONS') {
      return new Response(JSON.stringify({ success: true, message: 'Preflight allowed' }), {
        headers: responseHeaders,
        status: 200
      });
    }

    // 首页：返回网页
    if (request.method === 'GET' && url.pathname === '/') {
      responseHeaders.set('Content-Type', 'text/html; charset=utf-8');
      return new Response(WEB_HTML, { headers: responseHeaders });
    }

    // 解码接口（仅支持 POST）
    if (url.pathname === '/decode') {
      // 处理 GET 请求（直接访问 /decode）
      if (request.method === 'GET') {
        return new Response(JSON.stringify({
          success: false,
          error: '该接口仅支持 POST 请求，请勿直接访问。请访问 / 使用网页工具。'
        }), { headers: responseHeaders, status: 405 }); // 405 方法不允许
      }

      // 处理 POST 请求
      if (request.method === 'POST') {
        try {
          // 1. 校验 Content-Type
          const contentType = request.headers.get('Content-Type');
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('请求头错误：Content-Type 必须为 application/json');
          }

          // 2. 解析请求体
          const body = await request.json().catch(() => {
            throw new Error('请求体格式错误：应为合法 JSON，包含 "base64" 字段');
          });

          // 3. 校验 base64 参数
          if (!body.base64 || typeof body.base64 !== 'string' || body.base64.trim() === '') {
            throw new Error('参数错误："base64" 应为非空字符串');
          }

          // 4. 解码流程
          const qrContent = await decodeQrCode(body.base64.trim());
          const otpInfo = await parseGoogleOTPUri(qrContent);

          // 成功响应
          return new Response(JSON.stringify({
            success: true,
            data: otpInfo
          }), { headers: responseHeaders, status: 200 });

        } catch (error: any) {
          // 错误响应：返回具体原因
          const errMsg = error.message || '解码失败：未知错误';
          console.error('服务端错误:', errMsg);
          return new Response(JSON.stringify({
            success: false,
            error: errMsg
          }), { headers: responseHeaders, status: 400 });
        }
      }

      // 其他请求方法
      return new Response(JSON.stringify({
        success: false,
        error: '仅支持 GET（访问首页）和 POST（调用接口）请求'
      }), { headers: responseHeaders, status: 405 });
    }

    // 404 路由
    return new Response(JSON.stringify({
      success: false,
      error: '路径不存在：请访问 / 使用网页工具，或通过 POST /decode 调用 API'
    }), { headers: responseHeaders, status: 404 });
  },
};
