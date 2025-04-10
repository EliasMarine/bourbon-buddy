import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  // Extract the code from the URL
  const code = req.query.code
  const redirectTo = req.query.redirectTo || '/'
  
  if (!code) {
    return res.redirect(302, redirectTo)
  }
  
  try {
    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
        }
      }
    )
    
    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return res.redirect(302, '/login?error=AuthError')
    }
    
    // Set the session cookies manually
    if (data?.session) {
      // Set access token cookie
      res.setHeader('Set-Cookie', [
        `sb-access-token=${data.session.access_token}; Path=/; HttpOnly; SameSite=Lax`,
        `sb-refresh-token=${data.session.refresh_token}; Path=/; HttpOnly; SameSite=Lax`
      ])
    }
    
    // Redirect back to the app
    return res.redirect(302, redirectTo)
  } catch (error) {
    console.error('Error in OAuth callback:', error)
    return res.redirect(302, '/login?error=AuthError')
  }
} 