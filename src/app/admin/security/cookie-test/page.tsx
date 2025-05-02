import { cookies } from 'next/headers'
import { getCsrfCookieName } from '@/lib/csrf'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface CookieInfo {
  name: string
  value: string
  hasSamePrefix: boolean
}

export default async function CookieTestPage() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  const csrfCookieName = getCsrfCookieName()
  const hasCsrfCookie = cookieStore.has(csrfCookieName)
  
  const cookieList: CookieInfo[] = allCookies.map(cookie => ({
    name: cookie.name,
    value: cookie.name.includes('csrf') || cookie.name.includes('token') 
      ? `${cookie.value.substring(0, 15)}...` 
      : '[hidden]',
    hasSamePrefix: cookie.name.startsWith('__Host-') || cookie.name.startsWith('__Secure-'),
  }))
  
  const setPrefixedCookieTest = async () => {
    'use server'
    const cookieStore = await cookies()
    
    // Set a __Host- prefixed cookie for testing
    cookieStore.set('__Host-test-cookie', 'test-value', {
      path: '/',
      secure: true,
      httpOnly: true,
    })
    
    // Set a __Secure- prefixed cookie for testing
    cookieStore.set('__Secure-test-cookie', 'test-value', {
      path: '/',
      secure: true,
      httpOnly: true,
    })
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Cookie Security Test</h1>
      
      <div className="mb-8 bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="text-xl font-semibold mb-4">Server Cookie Diagnostics</h2>
          
          <div className="mb-4">
            <p className="font-medium">Environment: <span className="font-normal">{process.env.NODE_ENV}</span></p>
            <p className="font-medium">Expected CSRF Cookie Name: <span className="font-normal">{csrfCookieName}</span></p>
            <p className="font-medium">Has CSRF Cookie: <span className="font-normal">{hasCsrfCookie ? 'Yes' : 'No'}</span></p>
            <p className="font-medium">Cookie Count: <span className="font-normal">{allCookies.length}</span></p>
          </div>
          
          <h3 className="text-lg font-medium mb-2">Available Cookies</h3>
          <div className="bg-gray-50 p-4 rounded border overflow-auto max-h-96">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Partial Value</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prefixed</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cookieList.map((cookie: CookieInfo, index: number) => (
                  <tr key={index} className={cookie.hasSamePrefix ? 'bg-yellow-50' : ''}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
                      {cookie.name}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{cookie.value}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {cookie.hasSamePrefix ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Yes
                        </span>
                      ) : (
                        <span>No</span>
                      )}
                    </td>
                  </tr>
                ))}
                
                {cookieList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-center text-sm text-gray-500">
                      No cookies found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <h3 className="text-lg font-medium mt-6 mb-2">Cookie Requirements for Prefixed Cookies</h3>
          <div className="bg-gray-50 p-4 rounded border">
            <ul className="list-disc pl-5 space-y-2 text-sm">
              <li>
                <strong>__Host- prefix:</strong> The cookie must be set with <code>Secure</code>, must be from a secure origin (HTTPS), must not have a Domain attribute, and the Path must be "/".
              </li>
              <li>
                <strong>__Secure- prefix:</strong> The cookie must be set with <code>Secure</code> and must be from a secure origin (HTTPS).
              </li>
            </ul>
          </div>
          
          <form action={setPrefixedCookieTest} className="mt-6">
            <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
              Set Test Cookies
            </button>
          </form>
        </div>
      </div>
    </div>
  )
} 