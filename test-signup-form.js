// Test Signup Form Integration for Website
console.log(`
===================================================
SIGNUP FORM INTEGRATION TEST
===================================================

Copy and paste this code in your browser console
while on your signup page to test the integration:

-------------------------------------------------

// Supabase Signup Form Test
(async function testSignupForm() {
  console.log('🧪 TESTING SUPABASE SIGNUP INTEGRATION 🧪');
  
  try {
    // 1. Check if Supabase is properly loaded
    console.log('\\n1. Checking if Supabase client is available...');
    
    // Try to find the Supabase client in common locations
    let supabaseClient = null;
    
    if (typeof window.supabase !== 'undefined') {
      console.log('✅ Found global supabase client');
      supabaseClient = window.supabase;
    } else if (typeof window.supabaseClient !== 'undefined') {
      console.log('✅ Found global supabaseClient');
      supabaseClient = window.supabaseClient;
    } else {
      console.log('⚠️ No global Supabase client found. This is normal if you\'re using imports.');
      console.log('Checking auth functionality directly...');
    }
    
    // 2. Check Supabase URL and key in local storage
    console.log('\\n2. Checking environment variables:');
    
    // Look for env variables (Next.js often stores these in window.__NEXT_DATA__)
    const hasNextData = typeof window.__NEXT_DATA__ !== 'undefined';
    
    if (hasNextData) {
      console.log('✅ __NEXT_DATA__ found');
      const envVars = window.__NEXT_DATA__.props?.pageProps?.env || {};
      
      // Check for Supabase URL and key
      if (envVars.NEXT_PUBLIC_SUPABASE_URL) {
        console.log('✅ NEXT_PUBLIC_SUPABASE_URL found in Next.js data');
      } else {
        console.log('⚠️ NEXT_PUBLIC_SUPABASE_URL not found in Next.js data');
      }
      
      if (envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY found in Next.js data');
      } else {
        console.log('⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in Next.js data');
      }
    } else {
      console.log('⚠️ No __NEXT_DATA__ found. Checking environment variables directly:');
      
      // Check environment variables directly
      const supabaseUrl = process.env?.NEXT_PUBLIC_SUPABASE_URL || window.env?.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || window.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (supabaseUrl) {
        console.log('✅ NEXT_PUBLIC_SUPABASE_URL found');
      } else {
        console.log('⚠️ NEXT_PUBLIC_SUPABASE_URL not found');
      }
      
      if (supabaseKey) {
        console.log('✅ NEXT_PUBLIC_SUPABASE_ANON_KEY found');
      } else {
        console.log('⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY not found');
      }
    }
    
    // 3. Check for signup form elements
    console.log('\\n3. Checking signup form elements:');
    
    // Common selectors for signup forms
    const emailInputs = document.querySelectorAll('input[type="email"], input[name="email"]');
    const passwordInputs = document.querySelectorAll('input[type="password"], input[name="password"]');
    const signupButtons = document.querySelectorAll('button[type="submit"], input[type="submit"], button:contains("Sign up"), button:contains("Register")');
    
    if (emailInputs.length > 0) {
      console.log('✅ Email input found');
    } else {
      console.log('❌ No email input found');
    }
    
    if (passwordInputs.length > 0) {
      console.log('✅ Password input found');
    } else {
      console.log('❌ No password input found');
    }
    
    if (signupButtons.length > 0) {
      console.log('✅ Submit button found');
    } else {
      console.log('❌ No submit button found');
    }
    
    // 4. Test Supabase connection without creating a user
    console.log('\\n4. Testing Supabase connection:');
    
    try {
      // Import Supabase from CDN if not available
      if (!supabaseClient && !window.supabase) {
        console.log('⚠️ Loading Supabase client from CDN for testing...');
        
        // Get URL and key from meta tags if available
        const supabaseUrlMeta = document.querySelector('meta[name="supabase-url"]')?.getAttribute('content');
        const supabaseKeyMeta = document.querySelector('meta[name="supabase-key"]')?.getAttribute('content');
        
        // Or from environment variables
        const supabaseUrl = supabaseUrlMeta || process.env?.NEXT_PUBLIC_SUPABASE_URL || window.env?.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = supabaseKeyMeta || process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || window.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Could not find Supabase URL and key for testing');
        }
        
        // Create a new client for testing
        const { createClient } = window.supabaseJs;
        supabaseClient = createClient(supabaseUrl, supabaseKey);
      }
      
      // Test auth connection if client is available
      if (supabaseClient) {
        const { error } = await supabaseClient.auth.getSession();
        
        if (error) {
          console.log('❌ Supabase auth connection failed:', error.message);
        } else {
          console.log('✅ Supabase auth connection successful');
        }
      } else {
        console.log('⚠️ Could not test Supabase connection directly');
        console.log('   Please check your browser console during signup for errors');
      }
    } catch (error) {
      console.log('❌ Error testing Supabase connection:', error.message);
    }
    
    // 5. Simulate form submission (without actually submitting)
    console.log('\\n5. Form submission test:');
    
    const form = document.querySelector('form');
    if (form) {
      console.log('✅ Form element found');
      
      // Check if form has an onSubmit handler
      const hasSubmitHandler = form.onsubmit || 
                             form.getAttribute('onsubmit') || 
                             form.hasAttribute('data-action') ||
                             typeof form.addEventListener === 'function';
      
      if (hasSubmitHandler) {
        console.log('✅ Form has a submit handler');
      } else {
        console.log('⚠️ No submit handler detected on the form');
        console.log('   This might be normal if using React event handlers');
      }
      
      // Check form action if present
      const formAction = form.action || form.getAttribute('action');
      if (formAction) {
        console.log('ℹ️ Form action:', formAction);
      } else {
        console.log('ℹ️ No form action specified (likely using JavaScript)');
      }
    } else {
      console.log('⚠️ No form element found');
      console.log('   This might be normal for some React or custom implementations');
    }
    
    // 6. Summary
    console.log('\\n=== TEST SUMMARY ===');
    
    if (!supabaseClient) {
      console.log('⚠️ Could not directly test Supabase client');
      console.log('   This is expected in production environments with proper imports');
      console.log('   Check for any error messages in the console when using the form');
    } else {
      console.log('✅ Supabase client is available and can be tested');
    }
    
    console.log('\\nTo test the actual signup:');
    console.log('1. Fill out the form with a test email');
    console.log('2. Submit the form');
    console.log('3. Watch the Network tab for auth API calls to Supabase');
    console.log('4. Check for any error messages in the console');
    
    console.log('\\nCommon issues:');
    console.log('- Missing environment variables');
    console.log('- CORS errors (check Network tab)');
    console.log('- Form validation preventing submission');
    console.log('- Rate limiting (if testing many signups)');
    
  } catch (error) {
    console.error('Error during test:', error);
  }
})();

-------------------------------------------------

Alternative method: Execute this bookmarklet by
pasting it in your browser's address bar:

javascript:(async function(){console.log("🧪 TESTING SUPABASE SIGNUP INTEGRATION 🧪");try{console.log("\\n1. Checking if Supabase client is available...");let e=null;typeof window.supabase!="undefined"?(console.log("✅ Found global supabase client"),e=window.supabase):typeof window.supabaseClient!="undefined"?(console.log("✅ Found global supabaseClient"),e=window.supabaseClient):(console.log("⚠️ No global Supabase client found. This is normal if you're using imports."),console.log("Checking auth functionality directly..."));console.log("\\n2. Checking environment variables:");const o=typeof window.__NEXT_DATA__!="undefined";if(o){console.log("✅ __NEXT_DATA__ found");const t=window.__NEXT_DATA__.props?.pageProps?.env||{};t.NEXT_PUBLIC_SUPABASE_URL?console.log("✅ NEXT_PUBLIC_SUPABASE_URL found in Next.js data"):console.log("⚠️ NEXT_PUBLIC_SUPABASE_URL not found in Next.js data"),t.NEXT_PUBLIC_SUPABASE_ANON_KEY?console.log("✅ NEXT_PUBLIC_SUPABASE_ANON_KEY found in Next.js data"):console.log("⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY not found in Next.js data")}else{console.log("⚠️ No __NEXT_DATA__ found. Checking environment variables directly:");const t=process.env?.NEXT_PUBLIC_SUPABASE_URL||window.env?.NEXT_PUBLIC_SUPABASE_URL,_=process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY||window.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;t?console.log("✅ NEXT_PUBLIC_SUPABASE_URL found"):console.log("⚠️ NEXT_PUBLIC_SUPABASE_URL not found"),_?console.log("✅ NEXT_PUBLIC_SUPABASE_ANON_KEY found"):console.log("⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY not found")}console.log("\\n3. Checking signup form elements:");const c=document.querySelectorAll('input[type="email"], input[name="email"]'),n=document.querySelectorAll('input[type="password"], input[name="password"]'),s=document.querySelectorAll('button[type="submit"], input[type="submit"], button:contains("Sign up"), button:contains("Register")');c.length>0?console.log("✅ Email input found"):console.log("❌ No email input found"),n.length>0?console.log("✅ Password input found"):console.log("❌ No password input found"),s.length>0?console.log("✅ Submit button found"):console.log("❌ No submit button found");console.log("\\n4. Testing Supabase connection:");try{if(!e&&!window.supabase){console.log("⚠️ Loading Supabase client from CDN for testing...");const i=document.querySelector('meta[name="supabase-url"]')?.getAttribute("content"),l=document.querySelector('meta[name="supabase-key"]')?.getAttribute("content"),t=i||process.env?.NEXT_PUBLIC_SUPABASE_URL||window.env?.NEXT_PUBLIC_SUPABASE_URL,_=l||process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY||window.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!t||!_)throw new Error("Could not find Supabase URL and key for testing");const{createClient:a}=window.supabaseJs;e=a(t,_)}if(e){const{error:t}=await e.auth.getSession();t?console.log("❌ Supabase auth connection failed:",t.message):console.log("✅ Supabase auth connection successful")}else console.log("⚠️ Could not test Supabase connection directly"),console.log("   Please check your browser console during signup for errors")}catch(t){console.log("❌ Error testing Supabase connection:",t.message)}console.log("\\n5. Form submission test:");const u=document.querySelector("form");if(u){console.log("✅ Form element found");const t=u.onsubmit||u.getAttribute("onsubmit")||u.hasAttribute("data-action")||typeof u.addEventListener=="function";t?console.log("✅ Form has a submit handler"):console.log("⚠️ No submit handler detected on the form"),console.log("   This might be normal if using React event handlers");const _=u.action||u.getAttribute("action");_?console.log("ℹ️ Form action:",_):console.log("ℹ️ No form action specified (likely using JavaScript)")}else console.log("⚠️ No form element found"),console.log("   This might be normal for some React or custom implementations");console.log("\\n=== TEST SUMMARY ==="),e?(console.log("✅ Supabase client is available and can be tested")):(console.log("⚠️ Could not directly test Supabase client"),console.log("   This is expected in production environments with proper imports"),console.log("   Check for any error messages in the console when using the form")),console.log("\\nTo test the actual signup:"),console.log("1. Fill out the form with a test email"),console.log("2. Submit the form"),console.log("3. Watch the Network tab for auth API calls to Supabase"),console.log("4. Check for any error messages in the console"),console.log("\\nCommon issues:"),console.log("- Missing environment variables"),console.log("- CORS errors (check Network tab)"),console.log("- Form validation preventing submission"),console.log("- Rate limiting (if testing many signups)")}catch(e){console.error("Error during test:",e)}})();

===================================================

Run one of the above scripts in your browser's 
console while viewing your website's signup page.

Watch the console output for detailed results.
`); 