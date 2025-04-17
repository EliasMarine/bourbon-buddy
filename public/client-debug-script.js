/**
 * Client debug script
 * This script contains the debugging logic previously in the ClientDebug component
 * Moved to an external file to comply with Content Security Policy
 */

(function() {
  try {
    // Log startup
    console.log('🔍 Client debug script running', new Date().toISOString())
    
    // Basic environment info
    const envInfo = {
      loaded: true,
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      userAgent: window.navigator.userAgent,
      href: window.location.href,
      pathname: window.location.pathname,
      supportsLocalStorage: typeof localStorage !== 'undefined',
      timestamp: new Date().toISOString(),
      isDev: false // Can't access process.env in external script
    }
    
    console.log('🌍 Environment info:', envInfo)

    // Document structure
    console.log('📄 Document structure:', {
      title: document.title,
      headChildrenCount: document.head.children.length,
      bodyChildrenCount: document.body.children.length,
      hasHtml: !!document.documentElement,
      hasBody: !!document.body
    })

    // Check for common errors
    if (document.body.children.length === 0) {
      console.warn('⚠️ Body has no children - possible blank page issue')
    }

    // Store debug info in localStorage for easier retrieval
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('debugInfo', JSON.stringify(envInfo))
      localStorage.setItem('debugTimestamp', new Date().toISOString())
    }

    // Optional: Create debug display for development
    if (window.location.hostname === 'localhost') {
      const debugDisplay = document.createElement('div')
      debugDisplay.style.cssText = 'position: fixed; bottom: 0; right: 0; z-index: 9999; padding: 8px; background: rgba(0,0,0,0.8); color: lime; font-size: 12px; max-width: 300px; max-height: 200px; overflow: auto; border: 1px solid lime; border-radius: 4px;'
      
      const pre = document.createElement('pre')
      pre.textContent = JSON.stringify(envInfo, null, 2)
      
      debugDisplay.appendChild(pre)
      document.body.appendChild(debugDisplay)
    }
  } catch (err) {
    console.error('🔥 Client debug error:', err)
  }
})(); 