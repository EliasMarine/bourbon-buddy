import { createClient } from '@/utils/supabase/server'
import { NextResponse, NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const formData = await request.formData()
    const password = String(formData.get('password'))
    const code = requestUrl.searchParams.get('code')
    
    if (!code) {
      return NextResponse.json(
        { error: 'No code provided in URL parameters' },
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Exchange the code for a session first
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (exchangeError) {
      return NextResponse.json(
        { error: exchangeError.message },
        { status: 500 }
      )
    }
    
    // Now update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })
    
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }
    
    return NextResponse.redirect(new URL('/login?reset=success', request.url), {
      status: 302,
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 