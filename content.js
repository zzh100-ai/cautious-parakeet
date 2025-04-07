// Global variables for panel state
let panelActive = false;
let panelWidth = 500; 
let resizing = false;
let startX, startWidth;

// Initialize panel on load
function initializeSidePanel() {
  // Check if panel already exists
  if (document.getElementById('pagetalk-panel-container')) {
    return;
  }

  // Create panel container
  const panelContainer = document.createElement('div');
  panelContainer.id = 'pagetalk-panel-container';
  panelContainer.style.zIndex = '9999';
  panelContainer.style.width = `${panelWidth}px`;
  
  // Create resizer
  const resizer = document.createElement('div');
  resizer.id = 'pagetalk-panel-resizer';
  
  // Create iframe to load panel content
  const iframe = document.createElement('iframe');
  iframe.id = 'pagetalk-panel-iframe';
  
  // Set iframe source to extension HTML file
  const extensionURL = chrome.runtime.getURL('sidepanel.html');
  iframe.src = extensionURL;
  
  // Assemble DOM structure
  panelContainer.appendChild(resizer);
  panelContainer.appendChild(iframe);
  document.body.appendChild(panelContainer);
  
  // Set up resize event listeners
  setupResizeEvents(resizer, panelContainer);
}

// Set up resize event listeners
function setupResizeEvents(resizer, panel) {
  resizer.addEventListener('mousedown', function(e) {
    e.preventDefault();
    
    // Mark as resizing
    resizing = true;
    
    // Record initial mouse position
    const initialX = e.clientX;
    const initialWidth = parseInt(window.getComputedStyle(panel).width, 10);
    
    // Get iframe element
    const iframe = document.getElementById('pagetalk-panel-iframe');
    
    // Disable iframe content reflow during drag
    if (iframe) {
      iframe.style.pointerEvents = 'none';
    }
    
    // Create mouse move event handler
    function onMouseMove(e) {
      if (resizing) {
        // Calculate new width - corrected calculation
        const diffX = initialX - e.clientX;
        const newWidth = initialWidth + diffX;
        
        // Limit min width to 200px, max width to 80% of window
        if (newWidth >= 200 && newWidth <= window.innerWidth * 0.8) {
          // Check if width has really changed
          if (panelWidth !== newWidth) {
            // Update panel width
            panelWidth = newWidth;
            panel.style.width = `${newWidth}px`;
            document.body.style.marginRight = `${newWidth}px`;

            // Notify iframe that panel width has changed
            const iframe = document.getElementById('pagetalk-panel-iframe');
            if (iframe && iframe.contentWindow) {
              requestAnimationFrame(() => {
                iframe.contentWindow.postMessage({
                  action: 'panelResized',
                  width: panelWidth
                }, '*');
              });
            }
          }
        }
      }
    }
    
    // Create mouse up event handler
    function onMouseUp() {
      // Stop resizing
      resizing = false;
      
      // Restore iframe content interaction
      if (iframe) {
        iframe.style.pointerEvents = 'auto';
        
        // Notify iframe content to reflow
        setTimeout(() => {
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({ 
              action: 'panelResized',
              width: panelWidth
            }, '*');
          }
        }, 100);
      }
      
      // Remove event listeners
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.userSelect = '';
    }
    
    // Add temporary event listeners
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    
    // Prevent text selection
    document.body.style.userSelect = 'none';
  });
}

// Show panel
function showPanel() {
  const panel = document.getElementById('pagetalk-panel-container');
  if (panel) {
    panel.style.display = 'block';
    panel.style.width = `${panelWidth}px`;
    document.body.classList.toggle('pagetalk-panel-open', true);
    document.body.style.marginRight = `${panelWidth}px`;
    panelActive = true;
    
    // Notify panel to extract page content
    setTimeout(() => {
      const iframe = document.getElementById('pagetalk-panel-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ action: 'pageContentLoaded' }, '*');
      }
    }, 500);

    // Notify iframe that panel is shown
    setTimeout(() => {
      const iframe = document.getElementById('pagetalk-panel-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ action: 'panelShown' }, '*');
      }
    }, 10);
  }
}

// Hide panel
function hidePanel() {
  const panel = document.getElementById('pagetalk-panel-container');
  if (panel) {
    panel.style.display = 'none';
    document.body.classList.toggle('pagetalk-panel-open', false);
    document.body.style.marginRight = '0';
    panelActive = false;
  }
}

// Toggle panel display
function togglePanel() {
  if (!document.getElementById('pagetalk-panel-container')) {
    initializeSidePanel();
  }
  
  if (panelActive) {
    hidePanel();
  } else {
    showPanel();
  }
}

// Extract page content when requested
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 添加对ping消息的响应，用于检测content script是否已加载
  if (request.action === 'ping') {
    sendResponse({ status: 'ok' });
    return true;
  }
  
  // Handle panel toggle request
  if (request.action === 'togglePanel') {
    togglePanel();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'extractContent') {
    try {
      const pageContent = {
        url: window.location.href,
        title: document.title,
        content: extractMainContent(),
        questions: extractQuestions()
      };
      
      // Send extracted content to background script for storage
      chrome.runtime.sendMessage({
        action: "pageContentExtracted",
        content: pageContent.content
      });
      
      sendResponse(pageContent);
    } catch (error) {
      console.error('内容提取错误:', error);
      sendResponse({ 
        url: window.location.href,
        title: document.title,
        content: '提取内容时发生错误: ' + error.message,
        questions: []
      });
    }
  }
  return true; // Indicates async response
});

// Function to extract the main content from a webpage
function extractMainContent() {
  try {
    // 1. Try to find article content first
    const articleContent = document.querySelector('article');
    if (articleContent) {
      return cleanText(articleContent.innerText);
    }
    
    // 2. Try to find main content area
    const mainContent = document.querySelector('main');
    if (mainContent) {
      return cleanText(mainContent.innerText);
    }
    
    // 3. Try to find content by common class names and IDs
    const commonSelectors = [
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      '#content',
      '#main-content',
      '.main-content',
      '.article',
      '.post',
      '.entry'
    ];
    
    for (const selector of commonSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        return cleanText(element.innerText);
      }
    }
    
    // 4. If no specific content area found, try to identify the largest text block
    const paragraphs = Array.from(document.getElementsByTagName('p'));
    if (paragraphs.length > 0) {
      // Find the paragraph with the most text content
      const largestParagraph = paragraphs.reduce((largest, current) => {
        return current.innerText.length > largest.innerText.length ? current : largest;
      });
      
      // Get the closest parent that likely contains the full article
      const articleContainer = findArticleContainer(largestParagraph);
      if (articleContainer) {
        return cleanText(articleContainer.innerText);
      }
    }
    
    // 5. Last resort: clean up the body content
    return cleanText(document.body.innerText);
  } catch (error) {
    console.error('提取内容时出错:', error);
    return '无法提取页面内容: ' + error.message;
  }
}

// Helper function to find the likely article container
function findArticleContainer(element) {
  let current = element;
  let lastGoodContainer = current;
  
  while (current && current !== document.body) {
    const parent = current.parentElement;
    if (!parent) break;
    
    // Check if this is a good container
    if (isLikelyArticleContainer(parent)) {
      lastGoodContainer = parent;
    }
    
    current = parent;
  }
  
  return lastGoodContainer;
}

// Helper function to identify likely article containers
function isLikelyArticleContainer(element) {
  // Check element type
  const tagName = element.tagName.toLowerCase();
  if (['article', 'main', 'section', 'div'].includes(tagName)) {
    // Check class and ID names for content-related terms
    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();
    const contentTerms = ['content', 'article', 'post', 'entry', 'text', 'body'];
    
    return contentTerms.some(term => 
      className.includes(term) || id.includes(term)
    );
  }
  return false;
}

// Helper function to clean up extracted text
function cleanText(text) {
  return text
    // Remove multiple spaces
    .replace(/\s+/g, ' ')
    // Remove multiple newlines
    .replace(/\n+/g, '\n')
    // Remove leading/trailing whitespace
    .trim()
    // Remove common UI text patterns
    .replace(/^(Share|Print|Email|Save|Follow|Like|Comment|Subscribe)(\s*\|?\s*)+/gim, '')
    // Remove URLs
    .replace(/https?:\/\/\S+/g, '')
    // Remove remaining special characters
    .replace(/[^\S\n]+/g, ' ');
}

// Function to extract questions from the page
function extractQuestions() {
  try {
    const questions = [];
    
    // 1. Look for elements that end with question marks
    const textNodes = document.evaluate(
      '//text()[contains(., "?")]',
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );
    
    for (let i = 0; i < textNodes.snapshotLength; i++) {
      const node = textNodes.snapshotItem(i);
      const text = node.textContent.trim();
      
      // Split text into sentences and find questions
      const sentences = text.split(/[.!?]+/).map(s => s.trim());
      sentences.forEach(sentence => {
        if (sentence.endsWith('?') && sentence.length > 10) {
          questions.push(sentence);
        }
      });
    }
    
    // 2. Look for common question containers
    const questionSelectors = [
      '.question',
      '.faq-question',
      '.quiz-question',
      '[class*="question"]',
      '[id*="question"]'
    ];
    
    questionSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const text = element.innerText.trim();
        if (text.endsWith('?') && text.length > 10) {
          questions.push(text);
        }
      });
    });
    
    // Remove duplicates and limit to 10 questions
    return [...new Set(questions)].slice(0, 10);
  } catch (error) {
    console.error('提取问题时出错:', error);
    return [];
  }
} 