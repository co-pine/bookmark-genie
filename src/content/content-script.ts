// 内容脚本 - 用于页面信息提取
console.log('AI书签管理器内容脚本已加载');

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((request: any, _: any, sendResponse: any) => {
  if (request.action === 'getPageInfo') {
    const pageInfo = {
      title: document.title,
      description: getPageDescription(),
      keywords: getPageKeywords(),
      favicon: getFaviconUrl()
    };
    sendResponse(pageInfo);
  }
});

function getPageDescription(): string {
  const metaDescription = document.querySelector('meta[name="description"]') as HTMLMetaElement;
  const ogDescription = document.querySelector('meta[property="og:description"]') as HTMLMetaElement;
  
  return metaDescription?.content || 
         ogDescription?.content || 
         document.title || '';
}

function getPageKeywords(): string[] {
  const metaKeywords = document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
  if (metaKeywords?.content) {
    return metaKeywords.content.split(',').map(k => k.trim());
  }
  return [];
}

function getFaviconUrl(): string {
  const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement ||
                  document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
  
  if (favicon) {
    return new URL(favicon.href, window.location.origin).href;
  }
  
  return `${window.location.origin}/favicon.ico`;
}