/**
 * Web AI Summarizer 代理服务工具
 * 
 * 此文件提供绕过CORS限制的工具函数，使用OpenAI/Anthropic/Groq代理服务
 * 
 * 浏览器扩展无法直接绕过CORS限制，但我们可以尝试其他方法来提高成功率
 */

// 支持的代理服务列表
const PROXY_SERVICES = {
  openai: {
    name: 'OpenAI API代理',
    url: 'https://api.openai-proxy.com/v1/chat/completions',
    desc: '可用于OpenAI API的替代端点'
  },
  anthropic: {
    name: 'Anthropic API代理',
    url: 'https://api.anthropic-proxy.com/v1/messages',
    desc: '可用于Anthropic API的替代端点'
  },
  groq: {
    name: 'Groq API代理',
    url: 'https://api.groq-proxy.com/openai/v1/chat/completions',
    desc: '可用于Groq API的替代端点'
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    desc: '集成多个AI模型的统一API服务'
  }
};

/**
 * 检测API端点是否可能存在CORS问题
 * @param {string} url API端点URL
 * @returns {boolean} 是否可能存在CORS问题
 */
function mightHaveCorsIssue(url) {
  try {
    // 提取域名部分
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    
    // 检查常见的CORS限制域名
    const restrictedDomains = [
      'api.openai.com',
      'api.anthropic.com',
      'api.groq.com'
    ];
    
    return restrictedDomains.some(d => domain.includes(d));
  } catch (e) {
    console.error('URL解析错误:', e);
    return false;
  }
}

/**
 * 获取可能的替代API端点
 * @param {string} url 原始API端点
 * @returns {object} 替代端点信息或null
 */
function getSuggestedAlternative(url) {
  try {
    if (url.includes('openai.com')) {
      return PROXY_SERVICES.openai;
    } else if (url.includes('anthropic.com')) {
      return PROXY_SERVICES.anthropic;
    } else if (url.includes('groq.com')) {
      return PROXY_SERVICES.groq;
    }
    
    // 如果找不到匹配的替代端点，建议使用OpenRouter
    return PROXY_SERVICES.openrouter;
  } catch (e) {
    console.error('获取替代端点错误:', e);
    return null;
  }
}

/**
 * 添加请求头以减少CORS问题
 * @param {object} headers 原始请求头
 * @returns {object} 增强的请求头
 */
function enhanceHeaders(headers) {
  return {
    ...headers,
    'Origin': 'https://web-ai-summarizer.github.io',
    'Referer': 'https://web-ai-summarizer.github.io/'
  };
}

/**
 * 尝试通过可能的方法发送API请求
 * @param {string} url API端点
 * @param {object} options 请求选项
 * @returns {Promise<object>} 响应数据
 */
async function trySendRequest(url, options) {
  // 首先尝试直接请求
  try {
    const response = await fetch(url, options);
    if (response.ok) {
      return await response.json();
    }
    
    // 如果请求失败但不是CORS错误，抛出正常错误
    if (!response.type || response.type !== 'opaque') {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API请求失败: ${response.status} ${response.statusText} - ${errorData.error?.message || ''}`);
    }
  } catch (e) {
    // 检查是否是CORS错误
    if (e.message.includes('CORS') || e.message.includes('Failed to fetch')) {
      console.warn('可能遇到CORS限制，尝试其他方法...');
      // 这里可以尝试其他方法，但浏览器扩展能做的有限
    }
    throw e;
  }
}

/**
 * 获取CORS问题的诊断和建议
 * @returns {string} HTML格式的诊断和建议
 */
function getCorsHelp() {
  return `
    <div class="cors-help">
      <h3>API连接问题诊断</h3>
      <p>您可能遇到了跨域资源共享(CORS)限制，这是浏览器的安全机制。</p>
      
      <h4>解决方案:</h4>
      <ol>
        <li>
          <strong>使用OpenRouter</strong>
          <p>OpenRouter是一个API聚合服务，已配置CORS头部，允许来自浏览器的请求。</p>
          <p>访问: <a href="https://openrouter.ai" target="_blank">https://openrouter.ai</a></p>
        </li>
        <li>
          <strong>使用Groq API</strong>
          <p>Groq API通常有更宽松的CORS策略</p>
          <p>访问: <a href="https://console.groq.com" target="_blank">https://console.groq.com</a></p>
        </li>
        <li>
          <strong>尝试替代端点</strong>
          <p>有时官方API提供了替代端点，可能配置了更宽松的CORS策略</p>
        </li>
      </ol>
      
      <h4>技术详情:</h4>
      <p>CORS错误发生在浏览器尝试直接从JavaScript访问不同域的API时。浏览器扩展受同样限制。</p>
      <p>错误通常显示为: "Access to fetch at '...' from origin 'chrome-extension://...' has been blocked by CORS policy"</p>
    </div>
  `;
}

// 导出工具函数
window.ProxyTools = {
  mightHaveCorsIssue,
  getSuggestedAlternative,
  enhanceHeaders,
  trySendRequest,
  getCorsHelp,
  PROXY_SERVICES
}; 