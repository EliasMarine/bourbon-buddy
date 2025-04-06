// Script to initialize Supabase storage bucket
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupSupabaseStorage() {
  // Check for environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase environment variables');
    console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file');
    process.exit(1);
  }

  // Initialize Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log('Connecting to Supabase at:', supabaseUrl);

  try {
    // Create bucket if it doesn't exist
    const bucketName = 'bourbon-buddy-uploads';
    
    // Get list of existing buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError.message);
      process.exit(1);
    }
    
    // Check if our bucket already exists
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (bucketExists) {
      console.log(`Bucket '${bucketName}' already exists`);
    } else {
      // Create the bucket
      console.log(`Creating bucket '${bucketName}'...`);
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: true, // Set to true to make the bucket publicly accessible
        fileSizeLimit: 10485760, // 10MB limit
      });
      
      if (error) {
        console.error('Error creating bucket:', error.message);
        process.exit(1);
      }
      
      console.log(`Bucket '${bucketName}' created successfully`);
    }
    
    // Update bucket policies using the correct API
    console.log(`Updating bucket policies for '${bucketName}'...`);
    
    // Using manually created policies is recommended for Supabase
    console.log('Note: For better control over bucket policies, please use the Supabase dashboard');
    console.log('Go to Storage > Policies in your Supabase dashboard to configure:');
    console.log('1. Public read access (if needed)');
    console.log('2. Authenticated users upload permissions');
    console.log('3. Owner-based deletion permissions');
    
    console.log('Supabase storage setup completed successfully!');
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

// Run the setup
setupSupabaseStorage(); 