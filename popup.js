document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const allInOneTab = document.getElementById('all-in-one-tab');
  const summarizeTab = document.getElementById('summarize-tab');
  const qaTab = document.getElementById('qa-tab');
  const questionsTab = document.getElementById('questions-tab');
  const settingsTab = document.getElementById('settings-tab');
  
  const allInOnePanel = document.getElementById('all-in-one-panel');
  const summarizePanel = document.getElementById('summarize-panel');
  const qaPanel = document.getElementById('qa-panel');
  const questionsPanel = document.getElementById('questions-panel');
  const settingsPanel = document.getElementById('settings-panel');
  
  const analyzeAllButton = document.getElementById('analyze-all');
  const getSummaryButton = document.getElementById('get-summary');
  const getAnswerButton = document.getElementById('get-answer');
  const getQuestionsButton = document.getElementById('get-questions');
  const askCombinedQuestionButton = document.getElementById('ask-combined-question');
  
  const combinedSummary = document.getElementById('combined-summary');
  const combinedQuestions = document.getElementById('combined-questions');
  const combinedAnswer = document.getElementById('combined-answer');
  const combinedQuestionInput = document.getElementById('combined-question-input');
  
  const summaryResult = document.getElementById('summary-result');
  const answerResult = document.getElementById('answer-result');
  const questionsResult = document.getElementById('questions-result');
  const questionInput = document.getElementById('question-input');
  const statusMessage = document.getElementById('status-message');
  
  // 设置相关元素
  const apiEndpointInput = document.getElementById('api-endpoint');
  const apiKeyInput = document.getElementById('api-key');
  const modelNameInput = document.getElementById('model-name');
  const maxTokensInput = document.getElementById('max-tokens');
  const timeoutInput = document.getElementById('timeout');
  const contentLengthInput = document.getElementById('content-length');
  const saveSettingsButton = document.getElementById('save-settings');
  const resetSettingsButton = document.getElementById('reset-settings');
  const settingsStatus = document.getElementById('settings-status');
  
  // 新增诊断工具按钮
  const diagnosticButton = document.getElementById('diagnostic-button');
  const settingsButton = document.getElementById('settings-button');
  
  // 默认设置
  const defaultSettings = {
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    modelName: 'gpt-3.5-turbo',
    maxTokens: 1000,
    timeout: 30,
    contentLength: 4000
  };
  
  // 在页面加载时加载设置
  loadSettings();
  
  // 添加模型预设选择功能
  setupModelPresets();
  
  // Tab switching
  allInOneTab.addEventListener('click', () => {
    allInOneTab.classList.add('active');
    summarizeTab.classList.remove('active');
    qaTab.classList.remove('active');
    questionsTab.classList.remove('active');
    settingsTab.classList.remove('active');
    
    allInOnePanel.classList.add('active');
    summarizePanel.classList.remove('active');
    qaPanel.classList.remove('active');
    questionsPanel.classList.remove('active');
    settingsPanel.classList.remove('active');
  });
  
  summarizeTab.addEventListener('click', () => {
    summarizeTab.classList.add('active');
    allInOneTab.classList.remove('active');
    qaTab.classList.remove('active');
    questionsTab.classList.remove('active');
    settingsTab.classList.remove('active');
    
    summarizePanel.classList.add('active');
    allInOnePanel.classList.remove('active');
    qaPanel.classList.remove('active');
    questionsPanel.classList.remove('active');
    settingsPanel.classList.remove('active');
  });
  
  qaTab.addEventListener('click', () => {
    qaTab.classList.add('active');
    allInOneTab.classList.remove('active');
    summarizeTab.classList.remove('active');
    questionsTab.classList.remove('active');
    settingsTab.classList.remove('active');
    
    qaPanel.classList.add('active');
    allInOnePanel.classList.remove('active');
    summarizePanel.classList.remove('active');
    questionsPanel.classList.remove('active');
    settingsPanel.classList.remove('active');
  });

  questionsTab.addEventListener('click', () => {
    questionsTab.classList.add('active');
    allInOneTab.classList.remove('active');
    summarizeTab.classList.remove('active');
    qaTab.classList.remove('active');
    settingsTab.classList.remove('active');
    
    questionsPanel.classList.add('active');
    allInOnePanel.classList.remove('active');
    summarizePanel.classList.remove('active');
    qaPanel.classList.remove('active');
    settingsPanel.classList.remove('active');
  });
  
  settingsTab.addEventListener('click', () => {
    settingsTab.classList.add('active');
    allInOneTab.classList.remove('active');
    summarizeTab.classList.remove('active');
    qaTab.classList.remove('active');
    questionsTab.classList.remove('active');
    
    settingsPanel.classList.add('active');
    allInOnePanel.classList.remove('active');
    summarizePanel.classList.remove('active');
    qaPanel.classList.remove('active');
    questionsPanel.classList.remove('active');
  });
  
  // 显示状态信息
  function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.display = 'block';
    statusMessage.className = isError ? 'status-message error' : 'status-message';
    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 3000);
  }
  
  // 获取当前标签页
  async function getCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }
  
  // 一键分析功能
  if (analyzeAllButton) {
    analyzeAllButton.addEventListener('click', async () => {
      try {
        analyzeAllButton.disabled = true;
        combinedSummary.innerHTML = '<div class="loading"></div> 正在分析...';
        combinedQuestions.innerHTML = '<div class="loading"></div> 正在分析...';

        const response = await chrome.runtime.sendMessage({
          action: 'getPageContent',
          type: 'combined'
        });

        if (response.success) {
          combinedSummary.innerHTML = response.summary || '未能获取摘要';
          if (response.questionAnswers && response.questionAnswers.length > 0) {
            const formattedAnswers = response.questionAnswers.map((item, index) => `
              <div class="question-answer">
                <div class="question">${index + 1}. ${item.question}</div>
                <div class="answer">${item.answer}</div>
              </div>
            `).join('<hr>');
            combinedQuestions.innerHTML = formattedAnswers;
          } else {
            combinedQuestions.innerHTML = '未在页面中找到题目';
          }
          showStatus('分析完成');
        } else {
          combinedSummary.innerHTML = '分析失败: ' + (response.error || '未知错误');
          combinedQuestions.innerHTML = '';
          showStatus('分析失败', true);
        }
      } catch (error) {
        combinedSummary.innerHTML = '错误: ' + error.message;
        combinedQuestions.innerHTML = '';
        showStatus('发生错误', true);
      } finally {
        analyzeAllButton.disabled = false;
      }
    });
  }
  
  // 问答功能
  if (askCombinedQuestionButton && combinedQuestionInput) {
    askCombinedQuestionButton.addEventListener('click', async () => {
      try {
        const question = combinedQuestionInput.value.trim();
        if (!question) {
          showStatus('请输入问题', true);
          return;
        }

        askCombinedQuestionButton.disabled = true;
        combinedAnswer.innerHTML = '<div class="loading"></div> 正在思考...';

        const response = await chrome.runtime.sendMessage({
          action: 'getPageContent',
          type: 'answer',
          question: question
        });

        if (response.success) {
          combinedAnswer.innerHTML = response.answer;
          showStatus('回答完成');
        } else {
          combinedAnswer.innerHTML = '获取回答失败: ' + (response.error || '未知错误');
          showStatus('回答失败', true);
        }
      } catch (error) {
        combinedAnswer.innerHTML = '错误: ' + error.message;
        showStatus('发生错误', true);
      } finally {
        askCombinedQuestionButton.disabled = false;
      }
    });
  }
  
  // 摘要功能
  if (getSummaryButton) {
    getSummaryButton.addEventListener('click', async () => {
      try {
        getSummaryButton.disabled = true;
        summaryResult.innerHTML = '<div class="loading"></div> 正在生成摘要...';

        const response = await chrome.runtime.sendMessage({
          action: 'getPageContent',
          type: 'summarize'
        });

        if (response.success) {
          summaryResult.innerHTML = response.summary;
          showStatus('摘要生成完成');
        } else {
          summaryResult.innerHTML = '获取摘要失败: ' + (response.error || '未知错误');
          showStatus('摘要生成失败', true);
        }
      } catch (error) {
        summaryResult.innerHTML = '错误: ' + error.message;
        showStatus('发生错误', true);
      } finally {
        getSummaryButton.disabled = false;
      }
    });
  }
  
  // 问答面板功能
  if (getAnswerButton && questionInput) {
    getAnswerButton.addEventListener('click', async () => {
      try {
        const question = questionInput.value.trim();
        if (!question) {
          showStatus('请输入问题', true);
          return;
        }

        getAnswerButton.disabled = true;
        answerResult.innerHTML = '<div class="loading"></div> 正在思考...';

        const response = await chrome.runtime.sendMessage({
          action: 'getPageContent',
          type: 'answer',
          question: question
        });

        if (response.success) {
          answerResult.innerHTML = response.answer;
          showStatus('回答完成');
        } else {
          answerResult.innerHTML = '获取回答失败: ' + (response.error || '未知错误');
          showStatus('回答失败', true);
        }
      } catch (error) {
        answerResult.innerHTML = '错误: ' + error.message;
        showStatus('发生错误', true);
      } finally {
        getAnswerButton.disabled = false;
      }
    });
  }
  
  // 题目功能
  if (getQuestionsButton) {
    getQuestionsButton.addEventListener('click', async () => {
      try {
        getQuestionsButton.disabled = true;
        questionsResult.innerHTML = '<div class="loading"></div> 正在识别并解答题目...';

        const response = await chrome.runtime.sendMessage({
          action: 'getPageContent',
          type: 'answerQuestions'
        });

        if (response.success) {
          if (response.answers && response.answers.length > 0) {
            const formattedAnswers = response.answers.map((item, index) => `
              <div class="question-answer">
                <div class="question">${index + 1}. ${item.question}</div>
                <div class="answer">${item.answer}</div>
              </div>
            `).join('<hr>');
            questionsResult.innerHTML = formattedAnswers;
            showStatus(`已解答 ${response.answers.length} 道题目`);
          } else {
            questionsResult.innerHTML = '未在页面中找到题目';
            showStatus('未找到题目');
          }
        } else {
          questionsResult.innerHTML = '获取题目解答失败: ' + (response.error || '未知错误');
          showStatus('题目解答失败', true);
        }
      } catch (error) {
        questionsResult.innerHTML = '错误: ' + error.message;
        showStatus('发生错误', true);
      } finally {
        getQuestionsButton.disabled = false;
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
        contentLength: parseInt(contentLengthInput.value) || defaultSettings.contentLength
      };
      
      // 验证设置
      if (!newSettings.apiEndpoint) {
        showSettingsMessage('API端点不能为空', 'error');
        return;
      }
      
      if (!newSettings.apiKey) {
        showSettingsMessage('API密钥不能为空', 'error');
        return;
      }
      
      if (!newSettings.modelName) {
        showSettingsMessage('AI模型不能为空', 'error');
        return;
      }
      
      // 保存设置到chrome.storage
      await chrome.storage.sync.set({ aiSettings: newSettings });
      
      // 向background.js发送消息以更新设置
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: newSettings
      });
      
      showSettingsMessage('设置已保存', 'success');
    } catch (error) {
      showSettingsMessage('保存设置失败: ' + error.message, 'error');
    }
  });
  
  // 重置设置
  resetSettingsButton.addEventListener('click', async () => {
    try {
      // 使用默认设置
      await chrome.storage.sync.set({ aiSettings: defaultSettings });
      
      // 更新UI
      apiEndpointInput.value = defaultSettings.apiEndpoint;
      apiKeyInput.value = defaultSettings.apiKey;
      modelNameInput.value = defaultSettings.modelName;
      maxTokensInput.value = defaultSettings.maxTokens;
      timeoutInput.value = defaultSettings.timeout;
      contentLengthInput.value = defaultSettings.contentLength;
      
      // 向background.js发送消息以更新设置
      chrome.runtime.sendMessage({
        action: 'updateSettings',
        settings: defaultSettings
      });
      
      showSettingsMessage('设置已重置为默认值', 'success');
    } catch (error) {
      showSettingsMessage('重置设置失败: ' + error.message, 'error');
    }
  });
  
  // 加载设置
  async function loadSettings() {
    try {
      const data = await chrome.storage.sync.get('aiSettings');
      const settings = data.aiSettings || defaultSettings;
      
      // 更新UI
      apiEndpointInput.value = settings.apiEndpoint;
      apiKeyInput.value = settings.apiKey;
      modelNameInput.value = settings.modelName;
      maxTokensInput.value = settings.maxTokens;
      timeoutInput.value = settings.timeout;
      contentLengthInput.value = settings.contentLength;
    } catch (error) {
      console.error('加载设置失败:', error);
      // 使用默认设置
      apiEndpointInput.value = defaultSettings.apiEndpoint;
      apiKeyInput.value = defaultSettings.apiKey;
      modelNameInput.value = defaultSettings.modelName;
      maxTokensInput.value = defaultSettings.maxTokens;
      timeoutInput.value = defaultSettings.timeout;
      contentLengthInput.value = defaultSettings.contentLength;
    }
  }
  
  // 显示设置消息
  function showSettingsMessage(message, type) {
    settingsStatus.textContent = message;
    settingsStatus.className = 'settings-status';
    
    if (type) {
      settingsStatus.classList.add(type);
    }
    
    // 3秒后清除消息
    setTimeout(() => {
      settingsStatus.textContent = '';
      settingsStatus.className = 'settings-status';
    }, 3000);
  }
  
  // 诊断工具按钮点击事件
  if (diagnosticButton) {
    diagnosticButton.addEventListener('click', () => {
      chrome.tabs.create({ url: 'debug.html' });
    });
  }
  
  // 设置按钮点击事件
  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // 添加模型预设选择功能
  function setupModelPresets() {
    // 创建元素
    const modelPresetsDiv = document.createElement('div');
    modelPresetsDiv.className = 'setting-item';
    modelPresetsDiv.innerHTML = `
      <label for="api-type">API类型</label>
      <select id="api-type" class="select-input">
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic</option>
        <option value="openrouter">OpenRouter</option>
        <option value="groq">Groq (Llama)</option>
        <option value="custom">自定义</option>
      </select>
    `;
    
    // 找到API端点输入框前面的元素
    const apiEndpointContainer = document.querySelector('label[for="api-endpoint"]').parentElement;
    
    // 将新元素插入到API端点输入框前面
    apiEndpointContainer.parentElement.insertBefore(modelPresetsDiv, apiEndpointContainer);
    
    // 添加事件监听器
    const apiTypeSelect = document.getElementById('api-type');
    apiTypeSelect.addEventListener('change', () => {
      const selectedType = apiTypeSelect.value;
      
      switch(selectedType) {
        case 'openai':
          apiEndpointInput.value = 'https://api.openai.com/v1/chat/completions';
          modelNameInput.value = 'gpt-3.5-turbo';
          break;
        case 'anthropic':
          apiEndpointInput.value = 'https://api.anthropic.com/v1/messages';
          modelNameInput.value = 'claude-3-haiku-20240307';
          break;
        case 'openrouter':
          apiEndpointInput.value = 'https://openrouter.ai/api/v1/chat/completions';
          modelNameInput.value = 'google/gemini-pro';
          // 添加模型推荐选项
          showModelRecommendations('openrouter');
          break;
        case 'groq':
          apiEndpointInput.value = 'https://api.groq.com/openai/v1/chat/completions';
          modelNameInput.value = 'llama3-70b-8192';
          // 添加模型推荐选项
          showModelRecommendations('groq');
          break;
        case 'custom':
          // 不修改现有值
          break;
      }
    });
    
    // 根据当前API端点设置初始选择
    const currentEndpoint = apiEndpointInput.value;
    if (currentEndpoint.includes('openai.com')) {
      apiTypeSelect.value = 'openai';
    } else if (currentEndpoint.includes('anthropic.com')) {
      apiTypeSelect.value = 'anthropic';
    } else if (currentEndpoint.includes('openrouter.ai')) {
      apiTypeSelect.value = 'openrouter';
    } else if (currentEndpoint.includes('groq.com')) {
      apiTypeSelect.value = 'groq';
    } else {
      apiTypeSelect.value = 'custom';
    }
  }
  
  // 显示模型推荐选项
  function showModelRecommendations(apiType) {
    // 创建或获取推荐容器
    let recommendationsDiv = document.getElementById('model-recommendations');
    if (!recommendationsDiv) {
      recommendationsDiv = document.createElement('div');
      recommendationsDiv.id = 'model-recommendations';
      recommendationsDiv.className = 'setting-item model-recommendations';
      
      // 将推荐容器插入到模型输入框后面
      const modelNameContainer = document.querySelector('label[for="model-name"]').parentElement;
      modelNameContainer.parentElement.insertBefore(recommendationsDiv, modelNameContainer.nextSibling);
    }
    
    // 根据API类型设置不同的推荐选项
    let recommendationsHTML = '<label>推荐模型</label><div class="model-buttons">';
    
    if (apiType === 'openrouter') {
      recommendationsHTML += `
        <button class="model-button" data-model="google/gemini-pro">Gemini Pro</button>
        <button class="model-button" data-model="anthropic/claude-3-haiku">Claude Haiku</button>
        <button class="model-button" data-model="meta-llama/llama-3-8b-instruct">Llama 3</button>
        <button class="model-button" data-model="mistralai/mistral-7b-instruct">Mistral</button>
      `;
    } else if (apiType === 'groq') {
      recommendationsHTML += `
        <button class="model-button" data-model="llama3-70b-8192">Llama3 70B</button>
        <button class="model-button" data-model="llama3-8b-8192">Llama3 8B</button>
        <button class="model-button" data-model="mixtral-8x7b-32768">Mixtral 8x7B</button>
        <button class="model-button" data-model="gemma-7b-it">Gemma 7B</button>
      `;
    }
    
    recommendationsHTML += '</div>';
    recommendationsDiv.innerHTML = recommendationsHTML;
    
    // 添加按钮事件监听器
    const modelButtons = recommendationsDiv.querySelectorAll('.model-button');
    modelButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        modelNameInput.value = button.getAttribute('data-model');
        
        // 移除其他按钮的active类
        modelButtons.forEach(btn => btn.classList.remove('active'));
        // 添加当前按钮的active类
        button.classList.add('active');
      });
      
      // 如果当前模型匹配按钮的模型，添加active类
      if (modelNameInput.value === button.getAttribute('data-model')) {
        button.classList.add('active');
      }
    });
  }
  
  // 测试API连接
  const testApiButton = document.getElementById('test-api');
  testApiButton.addEventListener('click', async () => {
    try {
      const testSettings = {
        apiEndpoint: apiEndpointInput.value.trim(),
        apiKey: apiKeyInput.value.trim(),
        modelName: modelNameInput.value.trim()
      };
      
      // 验证基本设置
      if (!testSettings.apiEndpoint || !testSettings.apiKey || !testSettings.modelName) {
        showSettingsMessage('请先填写API端点、密钥和模型名称', 'error');
        return;
      }
      
      // 显示加载状态
      testApiButton.disabled = true;
      testApiButton.textContent = '正在测试...';
      showSettingsMessage('正在测试API连接...', '');
      
      // 发送测试请求
      const result = await testApiConnection(testSettings);
      
      if (result.success) {
        showSettingsMessage(`连接成功! 模型: ${result.model || testSettings.modelName}`, 'success');
      } else {
        showSettingsMessage(`连接失败: ${result.error}`, 'error');
      }
    } catch (error) {
      showSettingsMessage(`测试出错: ${error.message}`, 'error');
    } finally {
      // 恢复按钮状态
      testApiButton.disabled = false;
      testApiButton.textContent = '测试连接';
    }
  });

  // 测试API连接
  async function testApiConnection(settings) {
    try {
      // 超时控制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
      
      let response, data;
      
      // 检查API类型并使用相应的请求格式
      if (settings.apiEndpoint.includes('openai.com')) {
        // OpenAI API
        response = await fetch(settings.apiEndpoint, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify({
            model: settings.modelName,
            messages: [
              { role: "user", content: "Hello" }
            ],
            max_tokens: 5
          })
        });
      } 
      else if (settings.apiEndpoint.includes('anthropic.com')) {
        // Anthropic API
        response = await fetch(settings.apiEndpoint, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': settings.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: settings.modelName,
            messages: [
              { role: "user", content: "Hello" }
            ],
            max_tokens: 5
          })
        });
      }
      else if (settings.apiEndpoint.includes('groq.com')) {
        // Groq API - 与OpenAI兼容的格式
        response = await fetch(settings.apiEndpoint, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
          },
          body: JSON.stringify({
            model: settings.modelName,
            messages: [
              { role: "user", content: "Hello" }
            ],
            max_tokens: 5
          })
        });
      }
      else {
        // OpenRouter or other API
        response = await fetch(settings.apiEndpoint, {
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
      }
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API测试错误:', errorData);
        return { 
          success: false, 
          error: `服务器返回错误 ${response.status}: ${errorData.error?.message || response.statusText}` 
        };
      }
      
      data = await response.json();
      // 不同API返回不同的模型标识
      let modelInfo = data.model || settings.modelName;
      if (data.choices && data.choices[0] && data.choices[0].message) {
        // 获取响应的一部分，显示确实工作了
        modelInfo += ` (响应: "${data.choices[0].message.content.substring(0, 15)}...")`;
      }
      
      return { success: true, model: modelInfo };
    } catch (error) {
      console.error('API连接测试失败:', error);
      if (error.name === 'AbortError') {
        return { success: false, error: '连接超时，请检查API端点是否正确' };
      }
      return { success: false, error: error.message };
    }
  }
}); 