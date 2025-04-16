/**
 * Client-side utility functions for diagnosing authentication issues
 */

/**
 * Get storage data related to authentication
 */
export function getStorageAuthData() {
  if (typeof window === 'undefined') return null
  
  try {
    // Check for Supabase storage keys
    const storageKeys = Object.keys(localStorage).filter(
      key => key.startsWith('sb-') || key.includes('supabase')
    )
    
    // Get basic info about each key (not the full values for security)
    const storageData = storageKeys.reduce<Record<string, { exists: boolean; length?: number }>>(
      (acc, key) => {
        const value = localStorage.getItem(key)
        acc[key] = {
          exists: !!value,
          length: value?.length
        }
        return acc
      },
      {}
    )
    
    return {
      storageData,
      hasAuthKeys: storageKeys.some(key => key.includes('auth')),
      hasRefreshToken: storageKeys.some(key => key.includes('refresh')),
      hasAccessToken: storageKeys.some(key => key.includes('access')),
      keyCount: storageKeys.length,
      browserInfo: getBrowserInfo()
    }
  } catch (error) {
    console.error('Error accessing localStorage:', error)
    return { error: 'Failed to access localStorage', browserInfo: getBrowserInfo() }
  }
}

/**
 * Check CORS configuration by making a test request
 */
export async function testCorsConfiguration() {
  try {
    const response = await fetch('/api/auth/debug', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`)
    }
    
    return {
      success: true,
      status: response.status,
      data: await response.json()
    }
  } catch (error) {
    console.error('CORS test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      browserInfo: getBrowserInfo()
    }
  }
}

/**
 * Get browser information
 */
function getBrowserInfo() {
  if (typeof navigator === 'undefined') return { unknown: true }
  
  const userAgent = navigator.userAgent
  const browsers = {
    chrome: /chrome/i.test(userAgent) && !/edge|opr|opera/i.test(userAgent),
    firefox: /firefox/i.test(userAgent),
    safari: /safari/i.test(userAgent) && !/chrome|opera/i.test(userAgent),
    edge: /edg/i.test(userAgent),
    opera: /opr|opera/i.test(userAgent)
  }
  
  return {
    userAgent,
    ...browsers,
    isMobile: /mobile/i.test(userAgent),
    isIOS: /iphone|ipad|ipod/i.test(userAgent),
    isMacOS: /macintosh/i.test(userAgent)
  }
} 