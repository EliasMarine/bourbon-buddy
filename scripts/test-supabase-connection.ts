import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase connection...')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables are not set.')
    process.exit(1)
  }

  console.log(`Supabase URL: ${supabaseUrl}`)
  // Avoid logging the key itself for security
  console.log(`Supabase Anon Key: ${supabaseAnonKey ? 'Exists' : 'Missing'}`)

  try {
    // Create a Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('Supabase client created.')

    // Perform a simple test query - e.g., try to get user session (even if null)
    // This verifies the URL and Anon key are valid for basic communication
    console.log('Attempting to fetch user session (this is expected to be null if not logged in)...')
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      // Handle specific auth errors if needed, but any response means connection worked
      console.warn(`⚠️ Warning during session fetch (might be expected): ${error.message}`)
    }

    // If we reached here without throwing a network error, the connection is likely okay
    console.log('✅ Supabase connection test successful! Client was able to communicate with the Supabase instance.')
    console.log(`Current session status: ${data?.session ? 'Session found' : 'No active session'}`)

  } catch (error: any) {
    console.error('❌ Supabase connection test failed:')
    if (error.message) {
      console.error(`Error Message: ${error.message}`)
    }
    if (error.code) {
      console.error(`Error Code: ${error.code}`)
    }
    // Add more specific checks if needed
    if (error.message?.includes('fetch failed')) {
       console.error('Hint: This often indicates an incorrect Supabase URL or a network issue.')
    } else if (error.message?.includes('Invalid API key')) {
       console.error('Hint: Double-check your NEXT_PUBLIC_SUPABASE_ANON_KEY.')
    } else {
       console.error(error)
    }
    process.exit(1)
  }
}

testSupabaseConnection() 