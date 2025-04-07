document.addEventListener('DOMContentLoaded', () => {
  // 获取导航标签
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // 初始化默认设置
  const defaultSettings = {
    apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: '',
    modelName: 'anthropic/claude-3-haiku',
    maxTokens: 1000,
    timeout: 15,
    contentLength: 5000,
    retryCount: 2,
    geminiApiKey: '',
    geminiModel: 'gemini-2.0-flash',
    geminiTemperature: 0.7,
    geminiMaxTokens: 8192,
    geminiTopP: 0.95,
    geminiAutoExtract: true,
    geminiEnableImageUpload: true
  };
  
  // 获取设置相关元素
  const apiProviderSelect = document.getElementById('api-provider');
  const apiEndpointInput = document.getElementById('api-endpoint');
  const apiKeyInput = document.getElementById('api-key');
  const modelNameInput = document.getElementById('model-name');
  const maxTokensInput = document.getElementById('max-tokens');
  const timeoutInput = document.getElementById('timeout');
  const contentLengthInput = document.getElementById('content-length');
  const retryCountInput = document.getElementById('retry-count');
  const saveSettingsButton = document.getElementById('save-settings');
  const resetSettingsButton = document.getElementById('reset-settings');
  const testApiButton = document.getElementById('test-api');
  const settingsStatus = document.getElementById('settings-status');
  const modelPresets = document.querySelectorAll('.model-preset');
  const geminiApiKey = document.getElementById('gemini-api-key');
  const geminiModel = document.getElementById('gemini-model');
  const geminiTemperature = document.getElementById('gemini-temperature');
  const geminiTemperatureValue = document.getElementById('gemini-temperature-value');
  const geminiMaxTokens = document.getElementById('gemini-max-tokens');
  const geminiTopP = document.getElementById('gemini-top-p');
  const geminiTopPValue = document.getElementById('gemini-top-p-value');
  const geminiAutoExtract = document.getElementById('gemini-auto-extract');
  const geminiEnableImageUpload = document.getElementById('gemini-enable-image-upload');
  const testGeminiApi = document.getElementById('test-gemini-api');
  const geminiConnectionStatus = document.getElementById('gemini-connection-status');
  
  // 标签页切换
  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 移除所有活动类
      navTabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // 添加活动类到当前标签
      tab.classList.add('active');
      const tabId = `${tab.dataset.tab}-tab`;
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // 加载设置
  function loadSettings() {
    chrome.storage.sync.get('aiSettings', (data) => {
      const settings = data.aiSettings || defaultSettings;
      
      // 设置API提供商下拉框
      if (settings.apiEndpoint.includes('openai.com')) {
        apiProviderSelect.value = 'openai';
      } else if (settings.apiEndpoint.includes('anthropic.com')) {
        apiProviderSelect.value = 'anthropic';
      } else if (settings.apiEndpoint.includes('groq.com')) {
        apiProviderSelect.value = 'groq';
      } else if (settings.apiEndpoint.includes('openrouter.ai')) {
        apiProviderSelect.value = 'openrouter';
      } else if (settings.apiEndpoint.includes('generativelanguage.googleapis.com')) {
        apiProviderSelect.value = 'gemini';
      } else {
        apiProviderSelect.value = 'custom';
      }
      
      // 填充表单
      apiEndpointInput.value = settings.apiEndpoint || '';
      apiKeyInput.value = settings.apiKey || '';
      modelNameInput.value = settings.modelName || '';
      maxTokensInput.value = settings.maxTokens || 1000;
      timeoutInput.value = settings.timeout || 15;
      contentLengthInput.value = settings.contentLength || 5000;
      retryCountInput.value = settings.retryCount || 2;
      
      // 高亮匹配的模型预设
      highlightMatchingPreset(settings.modelName);
      
      // Fill Gemini settings if they exist
      if (geminiApiKey) {
        geminiApiKey.value = settings.geminiApiKey || '';
      }
      
      if (geminiModel) {
        geminiModel.value = settings.geminiModel || 'gemini-2.0-flash';
      }
      
      if (geminiTemperature) {
        geminiTemperature.value = settings.geminiTemperature || 0.7;
        geminiTemperatureValue.textContent = settings.geminiTemperature || 0.7;
      }
      
      if (geminiMaxTokens) {
        geminiMaxTokens.value = settings.geminiMaxTokens || 8192;
      }
      
      if (geminiTopP) {
        geminiTopP.value = settings.geminiTopP || 0.95;
        geminiTopPValue.textContent = settings.geminiTopP || 0.95;
      }
      
      if (geminiAutoExtract) {
        geminiAutoExtract.checked = settings.geminiAutoExtract !== false;
      }
      
      if (geminiEnableImageUpload) {
        geminiEnableImageUpload.checked = settings.geminiEnableImageUpload !== false;
      }
    });
  }
  
  // 保存设置
  saveSettingsButton.addEventListener('click', async () => {
    try {
      const newSettings = {
        apiEndpoint: apiEndpointInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        modelName: modelNameInput.value.trim(),
        maxTokens: parseInt(maxTokensInput.value) || defaultSettings.maxTokens,
        timeout: parseInt(timeoutInput.value) || defaultSettings.timeout,
        contentLength: parseInt(contentLengthInput.value) || defaultSettings.contentLength,
        retryCount: parseInt(retryCountInput.value) || defaultSettings.retryCount,
        geminiApiKey: geminiApiKey ? geminiApiKey.value : '',
        geminiModel: geminiModel ? geminiModel.value : 'gemini-2.0-flash',
        geminiTemperature: geminiTemperature ? parseFloat(geminiTemperature.value) : 0.7,
        geminiMaxTokens: geminiMaxTokens ? parseInt(geminiMaxTokens.value) : 8192,
        geminiTopP: geminiTopP ? parseFloat(geminiTopP.value) : 0.95,
        geminiAutoExtract: geminiAutoExtract ? geminiAutoExtract.checked : true,
        geminiEnableImageUpload: geminiEnableImageUpload ? geminiEnableImageUpload.checked : true
      };

      // 验证设置
      if (!newSettings.apiEndpoint) {
        showStatus('API端点不能为空', 'error');
        return;
      }

      if (!newSettings.apiKey) {
        showStatus('API密钥不能为空', 'error');
        return;
      }

      if (!newSettings.modelName) {
        showStatus('AI模型不能为空', 'error');
        return;
      }

      // 保存设置
      await chrome.storage.sync.set({ aiSettings: newSettings });

      // 通知background.js更新设置
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: newSettings
      });

      showStatus('设置已保存', 'success');
    } catch (error) {
      showStatus('保存设置失败: ' + error.message, 'error');
    }
  });
  
  // 重置设置
  resetSettingsButton.addEventListener('click', async () => {
    try {
      // 使用默认设置
      await chrome.storage.sync.set({ aiSettings: defaultSettings });

      // 更新输入框
      loadSettings();

      // 通知background.js更新设置
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: defaultSettings
      });

      showStatus('设置已重置为默认值', 'success');
    } catch (error) {
      showStatus('重置设置失败: ' + error.message, 'error');
    }
  });
  
  // API提供商变更
  apiProviderSelect.addEventListener('change', () => {
    const provider = apiProviderSelect.value;
    
    switch (provider) {
      case 'openai':
        apiEndpointInput.value = 'https://api.openai.com/v1/chat/completions';
        modelNameInput.value = 'gpt-3.5-turbo';
        break;
      case 'anthropic':
        apiEndpointInput.value = 'https://api.anthropic.com/v1/messages';
        modelNameInput.value = 'claude-3-haiku';
        break;
      case 'groq':
        apiEndpointInput.value = 'https://api.groq.com/openai/v1/chat/completions';
        modelNameInput.value = 'llama3-70b-8192';
        break;
      case 'openrouter':
        apiEndpointInput.value = 'https://openrouter.ai/api/v1/chat/completions';
        modelNameInput.value = 'anthropic/claude-3-haiku';
        break;
      case 'gemini':
        apiEndpointInput.value = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent';
        modelNameInput.value = 'gemini-2.0-flash';
        break;
      case 'custom':
        // 保持当前值
        break;
    }
    
    // 高亮匹配的模型预设
    highlightMatchingPreset(modelNameInput.value);
  });
  
  // 添加模型预设点击事件
  modelPresets.forEach(preset => {
    preset.addEventListener('click', () => {
      modelNameInput.value = preset.textContent;
      
      // 取消所有预设的高亮
      modelPresets.forEach(p => p.classList.remove('active'));
      
      // 高亮当前预设
      preset.classList.add('active');
    });
  });
  
  // 高亮匹配的模型预设
  function highlightMatchingPreset(modelName) {
    // 取消所有预设的高亮
    modelPresets.forEach(p => p.classList.remove('active'));
    
    // 寻找匹配的预设
    const matchingPreset = Array.from(modelPresets).find(p => 
      p.textContent === modelName || 
      modelName.includes(p.textContent)
    );
    
    if (matchingPreset) {
      matchingPreset.classList.add('active');
    }
  }
  
  // 显示状态消息
  function showStatus(message, type = '') {
    settingsStatus.textContent = message;
    settingsStatus.style.display = 'block';
    settingsStatus.className = 'settings-status';
    if (type) {
      settingsStatus.classList.add(type);
    }

    // 3秒后隐藏消息
    setTimeout(() => {
      settingsStatus.style.display = 'none';
    }, 3000);
  }
  
  // 测试API连接
  testApiButton.addEventListener('click', async () => {
    try {
      const settings = {
        apiEndpoint: apiEndpointInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        modelName: modelNameInput.value.trim()
      };

      if (!settings.apiEndpoint || !settings.apiKey || !settings.modelName) {
        showStatus('请填写完整的API设置', 'error');
        return;
      }

      testApiButton.disabled = true;
      testApiButton.textContent = '正在测试...';
      showStatus('正在测试API连接...', '');

      const response = await testApiConnection(settings);
      if (response.success) {
        showStatus('API连接测试成功！', 'success');
      } else {
        showStatus('API连接测试失败: ' + response.error, 'error');
      }
    } catch (error) {
      showStatus('测试出错: ' + error.message, 'error');
    } finally {
      testApiButton.disabled = false;
      testApiButton.textContent = '测试连接';
    }
  });
  
  // 测试API连接函数
  async function testApiConnection(settings) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(settings.apiEndpoint, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
          'HTTP-Referer': 'https://github.com/web-ai-summarizer',
          'X-Title': 'Web AI Summarizer'
        },
        body: JSON.stringify({
          model: settings.modelName,
          messages: [
            { role: "user", content: "Hello" }
          ],
          max_tokens: 5
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API返回错误 ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('API连接测试失败:', error);
      if (error.name === 'AbortError') {
        return { success: false, error: '连接超时，请检查API端点是否正确' };
      }
      return { success: false, error: error.message };
    }
  }
  
  // 添加 Gemini event listeners
  function setupGeminiEventListeners() {
    if (geminiTemperature) {
      geminiTemperature.addEventListener('input', () => {
        const value = parseFloat(geminiTemperature.value);
        geminiTemperatureValue.textContent = value;
      });
    }
    
    if (geminiTopP) {
      geminiTopP.addEventListener('input', () => {
        const value = parseFloat(geminiTopP.value);
        geminiTopPValue.textContent = value;
      });
    }
    
    if (testGeminiApi) {
      testGeminiApi.addEventListener('click', testGeminiApiConnection);
    }
  }
  
  // Test Gemini API connection
  async function testGeminiApiConnection() {
    if (!geminiApiKey || !geminiModel || !geminiConnectionStatus) {
      return;
    }
    
    const apiKey = geminiApiKey.value.trim();
    const model = geminiModel.value;
    
    if (!apiKey) {
      showGeminiConnectionStatus('请输入 Gemini API Key', 'error');
      return;
    }
    
    // Show testing message
    testGeminiApi.disabled = true;
    testGeminiApi.textContent = '正在测试...';
    showGeminiConnectionStatus('正在测试连接...', 'info');
    
    try {
      // Gemini API endpoint
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      
      // Test request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: 'Hello, this is a test message. Please reply with a short greeting.' }]
            }
          ],
          generationConfig: {
            maxOutputTokens: 50,
            temperature: 0.5
          }
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        const replyText = data.candidates[0].content.parts[0].text;
        showGeminiConnectionStatus(`连接成功！AI回复: "${replyText.substring(0, 100)}"`, 'success');
      } else if (data.error) {
        showGeminiConnectionStatus(`错误: ${data.error.message || '未知错误'}`, 'error');
      } else {
        showGeminiConnectionStatus('连接错误，请检查API密钥和模型设置', 'error');
      }
    } catch (error) {
      showGeminiConnectionStatus(`测试失败: ${error.message}`, 'error');
    } finally {
      testGeminiApi.disabled = false;
      testGeminiApi.textContent = '测试 Gemini 连接';
    }
  }
  
  // Show Gemini connection status
  function showGeminiConnectionStatus(message, type = 'info') {
    if (!geminiConnectionStatus) return;
    
    geminiConnectionStatus.textContent = message;
    geminiConnectionStatus.className = 'connection-status';
    
    if (type === 'error') {
      geminiConnectionStatus.classList.add('status-error');
    } else if (type === 'success') {
      geminiConnectionStatus.classList.add('status-success');
    }
  }
  
  // 初始化加载设置
  loadSettings();
  
  // Set up Gemini event listeners
  setupGeminiEventListeners();
}); 