// 全局设置对象
let settings = {
  apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
  apiKey: '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',
  modelName: 'anthropic/claude-3-haiku',
  maxTokens: 1000,
  timeout: 15,
  contentLength: 5000,
  // Gemini API settings
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  temperature: 0.7,
  topP: 0.95,
  maxOutputTokens: 8192
};

// 在扩展启动时加载设置和创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  // 加载设置
  chrome.storage.sync.get('aiSettings', (data) => {
    if (data.aiSettings) {
      settings = data.aiSettings;
      console.log('已从存储加载设置');
    } else {
      // 如果没有存储的设置，保存默认设置
      chrome.storage.sync.set({ aiSettings: settings });
      console.log('已保存默认设置');
    }
  });
  
  // 创建右键菜单
  try {
    chrome.contextMenus.create({
      id: "openSidePanel",
      title: "打开AI助手侧边栏",
      contexts: ["page", "selection"]
    });
    console.log('右键菜单创建成功');
  } catch (error) {
    console.error('创建右键菜单失败:', error);
  }
});

// 监听设置更新消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateSettings') {
    settings = request.settings;
    console.log('设置已更新:', settings);
    sendResponse({ success: true });
    return true;
  }
});

// 处理右键菜单点击
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "openSidePanel" && tab) {
    toggleSidePanel(tab.id);
  }
});

// 检查URL是否可以注入脚本
function isValidUrl(url) {
  return url && 
         !url.startsWith('chrome://') && 
         !url.startsWith('edge://') &&
         !url.startsWith('chrome-extension://') &&
         !url.startsWith('about:') &&
         !url.startsWith('data:') &&
         !url.startsWith('file:');
}

// 切换侧边栏显示
async function toggleSidePanel(tabId) {
  try {
    // 获取标签页信息
    const tab = await chrome.tabs.get(tabId);
    
    // 检查URL是否有效
    if (!isValidUrl(tab.url)) {
      console.log('不支持在此类页面注入脚本:', tab.url);
      return;
    }

    console.log('尝试在标签页切换面板:', tabId, tab.url);

    try {
      // 先尝试发送消息给content script
      const response = await chrome.tabs.sendMessage(tabId, { 
        action: "togglePanel",
        tabId: tabId 
      });
      console.log('面板切换响应:', response);
    } catch (error) {
      // 如果content script未加载，尝试注入
      if (error.message.includes('Receiving end does not exist')) {
        console.log('Content script未找到，尝试注入...');
        
        try {
          // 注入content script
          await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          });
          console.log('Content script注入成功');

          // 注入CSS
          await chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['content-panel.css']
          });
          console.log('CSS样式注入成功');

          // 等待脚本初始化后重试
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // 重试发送消息
          await chrome.tabs.sendMessage(tabId, { 
            action: "togglePanel",
            tabId: tabId
          });
          console.log('面板切换成功');
        } catch (injectionError) {
          console.error('脚本注入失败:', injectionError);
          throw injectionError;
        }
      } else {
        console.error('切换面板失败:', error);
        throw error;
      }
    }
  } catch (error) {
    console.error('toggleSidePanel执行出错:', error);
  }
}

// Handle communication between popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 创建一个Promise来处理异步操作
  const handleRequest = async () => {
    try {
      console.log('收到消息:', request);
      
      // 更新设置
      if (request.action === 'updateSettings') {
        settings = request.settings;
        await chrome.storage.sync.set({ aiSettings: settings });
        return { success: true, message: '设置已更新' };
      }
      
      // 获取页面内容
      if (request.action === 'getPageContent') {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const activeTab = tabs[0];
        
        if (!isValidUrl(activeTab.url)) {
          throw new Error('不支持在此类页面提取内容');
        }
        
        // 确保content script已注入
        try {
          await ensureContentScriptInjected(activeTab.id);
        } catch (error) {
          console.error('注入content script失败:', error);
          throw new Error('无法注入内容提取脚本');
        }
        
        // 获取页面内容
        const response = await chrome.tabs.sendMessage(activeTab.id, { 
          action: 'extractContent' 
        });
        
        if (!response || !response.content) {
          throw new Error('无法获取页面内容');
        }
        
        const truncatedContent = truncateText(response.content, settings.contentLength);
        
        // 根据请求类型处理内容
        switch (request.type) {
          case 'summarize':
            const summary = await getAISummary(truncatedContent);
            return { success: true, summary };
            
          case 'answer':
            if (!request.question) {
              throw new Error('未提供问题');
            }
            const answer = await getAIAnswer(truncatedContent, request.question);
            return { success: true, answer };
            
          case 'answerQuestions':
            const answers = await answerAllQuestions(truncatedContent, response.questions);
            return { success: true, answers };
            
          case 'combined':
            const [combinedSummary, questionAnswers] = await Promise.all([
              getAISummary(truncatedContent),
              answerAllQuestions(truncatedContent, response.questions)
            ]);
            return { 
              success: true, 
              summary: combinedSummary,
              questionAnswers
            };
            
          default:
            throw new Error('未知的请求类型');
        }
      }
      
      throw new Error('未知的操作类型');
      
    } catch (error) {
      console.error('处理请求时出错:', error);
      return { 
        success: false, 
        error: error.message || '处理请求时发生未知错误'
      };
    }
  };
  
  // 处理异步响应
  handleRequest().then(sendResponse);
  return true; // 保持消息通道开放
});

// 确保content script已注入
async function ensureContentScriptInjected(tabId) {
  try {
    // 先尝试发送测试消息
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
    console.log('Content script已存在');
  } catch (error) {
    if (error.message.includes('Receiving end does not exist')) {
      console.log('注入content script...');
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content-panel.css']
      });
      // 等待脚本初始化
      await new Promise(resolve => setTimeout(resolve, 200));
    } else {
      throw error;
    }
  }
}

// 截断文本
function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
}

// 获取AI摘要
async function getAISummary(content) {
  try {
    if (!content) {
      throw new Error('没有要总结的内容');
    }
    
    const response = await fetch(settings.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.modelName,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的文本摘要助手。请对给定的文本进行简洁的总结，突出重要信息。'
          },
          {
            role: 'user',
            content: `请总结以下内容:\n\n${content}`
          }
        ],
        max_tokens: settings.maxTokens,
        temperature: settings.temperature,
        top_p: settings.topP
      }),
      signal: AbortSignal.timeout(settings.timeout * 1000)
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('获取AI摘要失败:', error);
    throw new Error('生成摘要失败: ' + error.message);
  }
}

// 获取AI回答
async function getAIAnswer(content, question) {
  try {
    if (!content || !question) {
      throw new Error('缺少内容或问题');
    }
    
    const response = await fetch(settings.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      body: JSON.stringify({
        model: settings.modelName,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的问答助手。请根据给定的内容回答问题，如果内容中没有相关信息，请明确指出。'
          },
          {
            role: 'user',
            content: `基于以下内容回答问题:\n\n${content}\n\n问题: ${question}`
          }
        ],
        max_tokens: settings.maxTokens,
        temperature: settings.temperature,
        top_p: settings.topP
      }),
      signal: AbortSignal.timeout(settings.timeout * 1000)
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
    
  } catch (error) {
    console.error('获取AI回答失败:', error);
    throw new Error('生成回答失败: ' + error.message);
  }
}

// 回答所有问题
async function answerAllQuestions(content, questions) {
  try {
    if (!content || !questions || !questions.length) {
      throw new Error('缺少内容或问题');
    }
    
    const answers = await Promise.all(
      questions.map(async (question) => {
        try {
          const answer = await getAIAnswer(content, question);
          return { question, answer, error: null };
        } catch (error) {
          return { 
            question, 
            answer: null, 
            error: error.message || '获取答案失败'
          };
        }
      })
    );
    
    return answers;
    
  } catch (error) {
    console.error('回答问题失败:', error);
    throw new Error('处理问题失败: ' + error.message);
  }
} 