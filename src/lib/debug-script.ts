/**
 * Emergency debug script to diagnose critical rendering issues
 * This is used by the EmergencyDebug component
 */

export function getEmergencyDebugScript(envVars: {
  socketUrl?: string;
  supabaseUrl?: string;
}): string {
  return `
  (function() {
    try {
      // Make this run very early to catch potential issues
      console.log('🚨 Emergency debug running', new Date().toISOString());
      
      // Listen for load event to check if page correctly loads
      window.addEventListener('load', function() {
        console.log('🚨 Window loaded', document.readyState, new Date().toISOString());
        console.log('📄 HTML structure:', {
          documentElement: !!document.documentElement,
          head: !!document.head,
          body: !!document.body,
          bodyChildren: document.body ? document.body.children.length : 'N/A',
          title: document.title || 'No title',
          url: window.location.href
        });
        
        // Check for common issues
        if (document.body && document.body.children.length === 0) {
          console.error('🚨 CRITICAL: Document body has no children. This explains blank page.');
        }
        
        if (document.body && document.body.innerHTML.trim() === '') {
          console.error('🚨 CRITICAL: Document body has empty innerHTML. This explains blank page.');
        }
        
        // Check CSS loading
        const styleSheets = document.styleSheets;
        console.log('🎨 StyleSheets loaded:', styleSheets.length);
        
        // Check JS loading
        const scripts = document.scripts;
        console.log('📜 Scripts loaded:', scripts.length);
        
        // Dump environment information
        console.log('🌐 Navigator info:', {
          userAgent: navigator.userAgent,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
          vendor: navigator.vendor
        });
        
        // Check localStorage access
        try {
          localStorage.setItem('emergency-debug', new Date().toISOString());
          console.log('💾 LocalStorage is working');
        } catch (err) {
          console.warn('⚠️ LocalStorage error:', err);
        }
        
        // Check public env vars
        console.log('🔧 NEXT_PUBLIC_ env vars accessible:', {
          socketUrl: window.ENV_SOCKET_URL || '(not defined)',
          supabaseUrl: window.ENV_SUPABASE_URL || '(not defined)'
        });
        
        // Visual emergency debug output if nothing else renders
        if (document.body.children.length <= 1) {
          const debugDisplay = document.createElement('div');
          debugDisplay.style.cssText = 'position:fixed; top:0; left:0; right:0; padding:20px; background:#220000; color:white; z-index:99999; font-family:monospace;';
          debugDisplay.innerHTML = '<h2>Emergency Debug Output</h2><p>Page failed to render properly. Check console for detailed logs.</p>';
          
          const reloadBtn = document.createElement('button');
          reloadBtn.innerText = 'Reload Page';
          reloadBtn.style.cssText = 'padding:8px; margin:10px 0; background:#ff3333; color:white; border:none; cursor:pointer;';
          reloadBtn.onclick = function() { location.reload(); };
          
          debugDisplay.appendChild(reloadBtn);
          document.body.appendChild(debugDisplay);
        }
      });
      
      // Also check if DOMContentLoaded fires
      window.addEventListener('DOMContentLoaded', function() {
        console.log('🚨 DOMContentLoaded fired', document.readyState, new Date().toISOString());
      });
      
      // Assign key environment variables to window for inspection
      window.ENV_SOCKET_URL = '${envVars.socketUrl || ""}';
      window.ENV_SUPABASE_URL = '${envVars.supabaseUrl ? "FOUND_BUT_REDACTED" : ""}';
      
      // Check for React mounting issues
      setTimeout(function() {
        const reactRoot = document.getElementById('__next') || document.querySelector('[data-reactroot]');
        if (!reactRoot || reactRoot.children.length === 0) {
          console.error('🚨 CRITICAL: React root not found or empty after 2 seconds');
        } else {
          console.log('✅ React root found and has content');
        }
      }, 2000);
      
    } catch (err) {
      console.error('💥 Emergency debug error:', err);
    }
  })();
  `;
} 