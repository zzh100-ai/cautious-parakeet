// 检查CORS兼容性按钮事件监听
if (document.getElementById('checkCors')) {
    document.getElementById('checkCors').addEventListener('click', async () => {
        const corsResult = document.getElementById('corsResult');
        corsResult.innerHTML = '<div>正在检查CORS兼容性...</div>';
        
        try {
            // 获取当前设置
            const settings = await new Promise(resolve => {
                chrome.storage.sync.get('aiSettings', (data) => {
                    resolve(data.aiSettings || {});
                });
            });
            
            if (!settings.apiEndpoint) {
                throw new Error('未配置API端点，请先在设置中配置API端点');
            }
            
            // 检查URL是否可能有CORS问题
            let apiUrl = settings.apiEndpoint.trim();
            if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
                apiUrl = 'https://' + apiUrl;
            }
            
            // 使用ProxyTools检查CORS问题
            if (window.ProxyTools && window.ProxyTools.mightHaveCorsIssue) {
                const mightHaveIssue = window.ProxyTools.mightHaveCorsIssue(apiUrl);
                
                if (mightHaveIssue) {
                    const alternative = window.ProxyTools.getSuggestedAlternative(apiUrl);
                    
                    corsResult.innerHTML = `
                        <div class="test-result">
                            <p class="status-error">⚠️ 可能存在CORS问题</p>
                            <p>您当前使用的API端点 <strong>${apiUrl}</strong> 可能会受到浏览器的CORS策略限制。</p>
                            <p>推荐尝试以下解决方案:</p>
                            <ul>
                                <li>使用 <a href="https://openrouter.ai" target="_blank">OpenRouter</a> 作为中间服务，它配置了允许跨域请求的CORS头部</li>
                                <li>使用 <a href="https://console.groq.com" target="_blank">Groq API</a>，它通常有更宽松的CORS策略</li>
                                ${alternative ? `<li>尝试替代端点: <strong>${alternative.url}</strong> (${alternative.desc})</li>` : ''}
                            </ul>
                            <div class="cors-help">
                                <h3>什么是CORS问题?</h3>
                                <p>CORS (跨域资源共享) 是浏览器的安全机制，阻止网页直接从JavaScript访问不同域的资源。</p>
                                <p>当API服务器没有正确配置CORS头部时，浏览器扩展无法直接发送请求。</p>
                            </div>
                        </div>
                    `;
                } else {
                    corsResult.innerHTML = `
                        <div class="test-result">
                            <p class="status-ok">✅ 未检测到潜在CORS限制</p>
                            <p>您当前使用的API端点 <strong>${apiUrl}</strong> 不在已知的常见CORS限制列表中。</p>
                            <p>但这不保证不会有CORS问题，如果仍遇到API连接问题，请尝试使用OpenRouter或Groq API。</p>
                        </div>
                    `;
                }
            } else {
                // 如果ProxyTools未加载，进行简单检查
                const knownCorsIssues = ['api.openai.com', 'api.anthropic.com'];
                const urlObj = new URL(apiUrl);
                const domain = urlObj.hostname;
                
                if (knownCorsIssues.some(d => domain.includes(d))) {
                    corsResult.innerHTML = `
                        <div class="test-result">
                            <p class="status-error">⚠️ 可能存在CORS问题</p>
                            <p>您当前使用的API端点 <strong>${apiUrl}</strong> 可能会受到浏览器的CORS策略限制。</p>
                            <p>推荐尝试使用 <a href="https://openrouter.ai" target="_blank">OpenRouter</a> 或 <a href="https://console.groq.com" target="_blank">Groq API</a></p>
                        </div>
                    `;
                } else {
                    corsResult.innerHTML = `
                        <div class="test-result">
                            <p class="status-ok">✅ 未检测到明显的CORS问题</p>
                            <p>您当前使用的API端点 <strong>${apiUrl}</strong> 看起来没有明显的CORS限制风险。</p>
                        </div>
                    `;
                }
            }
        } catch (error) {
            corsResult.innerHTML = `
                <div class="test-result">
                    <p class="status-error">❌ CORS检查失败</p>
                    <p>${error.message}</p>
                </div>
            `;
        }
    });
}

// 扩展状态检查
document.getElementById('checkStatus').addEventListener('click', async () => {
    const statusResult = document.getElementById('statusResult');
    statusResult.innerHTML = '<div>检查中...</div>';
    
    try {
        // 获取扩展当前设置和状态
        const settings = await new Promise(resolve => {
            chrome.storage.sync.get('aiSettings', (data) => {
                resolve(data.aiSettings || {});
            });
        });
        
        const manifest = chrome.runtime.getManifest();
        
        // 隐藏API密钥
        const secureSettings = { ...settings };
        if (secureSettings.apiKey) {
            secureSettings.apiKey = secureSettings.apiKey.substring(0, 5) + '...' + 
                                   secureSettings.apiKey.substring(secureSettings.apiKey.length - 4);
        }
        
        const statusHtml = `
            <div class="test-result">
                <p class="status-ok">✅ 扩展正常运行</p>
                <p><strong>版本:</strong> ${manifest.version}</p>
                <h3>当前设置:</h3>
                <pre>${JSON.stringify(secureSettings, null, 2)}</pre>
            </div>
        `;
        
        statusResult.innerHTML = statusHtml;
    } catch (error) {
        statusResult.innerHTML = `
            <div class="test-result">
                <p class="status-error">❌ 状态检查失败</p>
                <p>${error.message}</p>
            </div>
        `;
    }
});

// 内容脚本检查
document.getElementById('checkContent').addEventListener('click', async () => {
    const contentResult = document.getElementById('contentResult');
    contentResult.innerHTML = '<div>检查中...</div>';
    
    try {
        // 获取当前标签页
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        
        if (!activeTab) {
            throw new Error('找不到活动标签页');
        }
        
        // 检查URL是否受支持
        const url = activeTab.url;
        if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
            throw new Error('无法在浏览器内部页面上测试内容脚本 (chrome://, about:, 扩展页面等)');
        }
        
        // 尝试与内容脚本通信
        try {
            // 首先尝试 ping
            await chrome.tabs.sendMessage(activeTab.id, { action: 'ping' });
            contentResult.innerHTML = `
                <div class="test-result">
                    <p class="status-ok">✅ 内容脚本已正确加载</p>
                    <p>页面: ${activeTab.title}</p>
                </div>
            `;
        } catch (pingError) {
            // 如果 ping 失败，尝试注入内容脚本
            contentResult.innerHTML = `
                <div class="test-result">
                    <p>内容脚本未加载，正在尝试注入...</p>
                </div>
            `;
            
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    files: ['content.js']
                });
                
                // 等待脚本初始化
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // 再次尝试 ping
                await chrome.tabs.sendMessage(activeTab.id, { action: 'ping' });
                contentResult.innerHTML = `
                    <div class="test-result">
                        <p class="status-ok">✅ 内容脚本注入成功</p>
                        <p>页面: ${activeTab.title}</p>
                    </div>
                `;
            } catch (injectionError) {
                throw new Error(`内容脚本注入失败: ${injectionError.message}. 这可能是由于该网站的内容安全策略限制。`);
            }
        }
    } catch (error) {
        contentResult.innerHTML = `
            <div class="test-result">
                <p class="status-error">❌ 内容脚本检查失败</p>
                <p>${error.message}</p>
                <p>建议: 尝试使用普通网页(如百度、知乎等)进行测试，不要使用浏览器内部页面。</p>
            </div>
        `;
    }
});

// API连接测试
document.getElementById('testAPI').addEventListener('click', async () => {
    const apiResult = document.getElementById('apiResult');
    apiResult.innerHTML = '<div>测试中...</div>';
    
    try {
        // 获取当前设置
        const settings = await new Promise(resolve => {
            chrome.storage.sync.get('aiSettings', (data) => {
                resolve(data.aiSettings || {});
            });
        });
        
        if (!settings.apiEndpoint || !settings.apiKey) {
            throw new Error('API设置不完整，请先在扩展设置中配置API端点和API密钥');
        }
        
        // 构建简单的测试消息
        const testMessage = '你好，这是一条测试消息。请简短回复。';
        
        // 设置超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 增加超时时间到15秒
        
        // 添加请求调试信息
        apiResult.innerHTML = `
            <div class="test-result">
                <p>正在连接 ${settings.apiEndpoint}...</p>
                <p>模型: ${settings.modelName}</p>
                <p>请求详情:</p>
                <pre>
{
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${settings.apiKey.substring(0, 3)}...${settings.apiKey.substring(settings.apiKey.length - 3)}"
  },
  "body": {
    "model": "${settings.modelName}",
    "messages": [{"role": "user", "content": "${testMessage}"}],
    "max_tokens": 20
  }
}
                </pre>
                <p>请稍候...</p>
            </div>
        `;
        
        // 根据不同API类型构建请求
        let response;
        let responseData;
        
        try {
            // 检查和解析API端点
            let url = settings.apiEndpoint.trim();
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            
            // 检查是否有潜在CORS问题
            let mightHaveCorsIssue = false;
            let corsMessage = '';
            
            if (window.ProxyTools && window.ProxyTools.mightHaveCorsIssue) {
                mightHaveCorsIssue = window.ProxyTools.mightHaveCorsIssue(url);
                if (mightHaveCorsIssue) {
                    const alternative = window.ProxyTools.getSuggestedAlternative(url);
                    corsMessage = `
                        <div class="cors-help">
                            <h3>⚠️ CORS兼容性警告</h3>
                            <p>您当前使用的API端点 <strong>${url}</strong> 可能会受到浏览器的CORS策略限制。</p>
                            <p>如果测试失败，请考虑尝试:</p>
                            <ul>
                                <li>使用 <a href="https://openrouter.ai" target="_blank">OpenRouter</a> 作为中间服务</li>
                                <li>使用 <a href="https://console.groq.com" target="_blank">Groq API</a></li>
                                ${alternative ? `<li>尝试替代端点: <strong>${alternative.url}</strong></li>` : ''}
                            </ul>
                        </div>
                    `;
                    
                    // 在测试前显示CORS警告
                    apiResult.innerHTML += corsMessage;
                }
            }
            
            // 选择性地增强请求头以减少CORS问题
            let headers = {};
            
            if (url.includes('openai.com')) {
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                };
            } 
            else if (url.includes('anthropic.com')) {
                headers = {
                    'Content-Type': 'application/json',
                    'x-api-key': settings.apiKey,
                    'anthropic-version': '2023-06-01'
                };
            }
            else if (url.includes('groq.com')) {
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`
                };
            }
            else {
                // 默认使用OpenRouter格式
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.apiKey}`,
                    'HTTP-Referer': 'https://github.com/web-ai-summarizer',
                    'X-Title': 'Web AI Summarizer'
                };
            }
            
            // 使用ProxyTools增强请求头以减少CORS问题
            if (window.ProxyTools && window.ProxyTools.enhanceHeaders) {
                headers = window.ProxyTools.enhanceHeaders(headers);
            }
            
            // 构建统一的请求配置
            let requestConfig = {
                method: 'POST',
                signal: controller.signal,
                headers: headers
            };
            
            // 构建请求体
            let requestBody = {};
            
            if (url.includes('anthropic.com')) {
                requestBody = {
                    model: settings.modelName,
                    messages: [{ role: "user", content: testMessage }],
                    max_tokens: 20
                };
            } else {
                requestBody = {
                    model: settings.modelName,
                    messages: [{ role: "user", content: testMessage }],
                    max_tokens: 20
                };
            }
            
            requestConfig.body = JSON.stringify(requestBody);
            
            // 尝试发送请求
            response = await fetch(url, requestConfig);
            
            clearTimeout(timeoutId);
            
            // 尝试读取响应文本
            const responseText = await response.text();
            
            // 显示原始响应文本，以便调试
            let statusText = '';
            let responseContent = '';
            
            try {
                // 尝试解析JSON
                responseData = JSON.parse(responseText);
                
                if (!response.ok) {
                    const errorMessage = responseData.error?.message || 
                                        responseData.error?.type || 
                                        `HTTP状态码: ${response.status} ${response.statusText}`;
                    throw new Error(`API请求失败: ${errorMessage}`);
                }
                
                // 尝试提取响应文本
                if (url.includes('anthropic.com')) {
                    responseContent = responseData.content?.[0]?.text || '无法获取响应内容';
                } else {
                    responseContent = responseData.choices?.[0]?.message?.content || '无法获取响应内容';
                }
                
                statusText = `<p class="status-ok">✅ API连接成功</p>`;
            } catch (jsonError) {
                // JSON解析失败，显示原始响应
                statusText = `<p class="status-error">❌ 响应解析失败</p>`;
                responseContent = '无法解析JSON响应: ' + jsonError.message;
            }
            
            apiResult.innerHTML = `
                <div class="test-result">
                    ${statusText}
                    <p><strong>端点:</strong> ${url}</p>
                    <p><strong>模型:</strong> ${settings.modelName}</p>
                    <p><strong>HTTP状态:</strong> ${response.status} ${response.statusText}</p>
                    <p><strong>响应内容:</strong></p>
                    <p>${responseContent}</p>
                    <details>
                        <summary>查看完整响应</summary>
                        <pre>${JSON.stringify(responseData || responseText, null, 2)}</pre>
                    </details>
                </div>
            `;
            
            // 如果成功，检查是否需要显示CORS信息
            if (response.ok && mightHaveCorsIssue) {
                apiResult.innerHTML += `
                    <div class="cors-help">
                        <h3>✅ 连接成功，但请注意</h3>
                        <p>尽管API测试成功，您的API端点仍可能有CORS限制。在实际使用中可能会遇到问题。</p>
                        <p>如果之后出现问题，请考虑使用OpenRouter或Groq API进行连接。</p>
                    </div>
                `;
            }
            
        } catch (fetchError) {
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
                throw new Error('API请求超时，请检查网络连接或增加超时设置');
            }
            
            // 检查常见的网络错误
            if (fetchError.message.includes('Failed to fetch') || 
                fetchError.message.includes('NetworkError') || 
                fetchError.message.includes('CORS')) {
                
                // 如果是CORS错误，提供更多帮助
                if (fetchError.message.includes('CORS') && window.ProxyTools) {
                    const corsHelp = window.ProxyTools.getCorsHelp();
                    apiResult.innerHTML = `
                        <div class="test-result">
                            <p class="status-error">❌ API连接失败: CORS限制</p>
                            <p>检测到跨域资源共享(CORS)问题，这是浏览器的安全机制阻止了API请求。</p>
                            ${corsHelp}
                        </div>
                    `;
                    return;
                }
                
                throw new Error(`网络请求失败: 可能是CORS策略或网络连接问题. 详细信息: ${fetchError.message}`);
            }
            
            throw fetchError;
        }
    } catch (error) {
        apiResult.innerHTML = `
            <div class="test-result">
                <p class="status-error">❌ API连接失败</p>
                <p>${error.message}</p>
                <p>建议: </p>
                <ul>
                    <li>检查API密钥是否正确</li>
                    <li>确认API端点格式(完整URL, 包含https://)</li>
                    <li>检查模型名称是否有效</li>
                    <li>尝试使用其他API提供商(如Groq或OpenRouter)</li>
                    <li>确保您的网络连接正常</li>
                </ul>
            </div>
        `;
        
        // 如果错误信息中包含CORS或网络错误相关内容，添加代理工具建议
        if (error.message.includes('CORS') || 
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError')) {
            
            // 如果ProxyTools可用，使用其帮助信息
            if (window.ProxyTools) {
                apiResult.innerHTML += window.ProxyTools.getCorsHelp();
            } else {
                apiResult.innerHTML += `
                    <div class="cors-help">
                        <h3>API连接问题诊断</h3>
                        <p>您可能遇到了跨域资源共享(CORS)限制，这是浏览器的安全机制。</p>
                        <p>建议尝试使用:</p>
                        <ul>
                            <li><a href="https://openrouter.ai" target="_blank">OpenRouter</a> - 已配置允许跨域请求</li>
                            <li><a href="https://console.groq.com" target="_blank">Groq API</a> - 通常有更宽松的CORS策略</li>
                        </ul>
                    </div>
                `;
            }
        }
    }
}); 