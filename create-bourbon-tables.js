// Create Bourbon Buddy Database Tables
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Get credentials from environment
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ ERROR: Missing credentials in .env.local');
  process.exit(1);
}

// Create admin client
const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to run SQL queries
async function executeSQL(query, params = {}) {
  try {
    const { data, error } = await supabase.rpc('execute_sql', { 
      sql_query: query, 
      ...params 
    });
    
    if (error) {
      throw error;
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('SQL Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Check if table exists
async function tableExists(tableName) {
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName);
    
    if (error) {
      throw error;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error(`Error checking if ${tableName} exists:`, error.message);
    return false;
  }
}

// Create spirits table
async function createSpiritsTable() {
  console.log('Creating spirits table...');
  
  if (await tableExists('spirits')) {
    console.log('✅ Spirits table already exists.');
    return true;
  }
  
  const result = await executeSQL(`
    CREATE TABLE IF NOT EXISTS public.spirits (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      description TEXT,
      type TEXT NOT NULL,
      abv NUMERIC(5,2),
      price NUMERIC(10,2),
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    );
    
    -- Create RLS policies
    ALTER TABLE public.spirits ENABLE ROW LEVEL SECURITY;
    
    -- Policy for all users to view spirits
    CREATE POLICY "Allow all users to view spirits" 
    ON public.spirits 
    FOR SELECT USING (true);
    
    -- Insert some sample data
    INSERT INTO public.spirits (name, description, type, abv, price)
    VALUES 
      ('Buffalo Trace', 'Smooth and complex bourbon with notes of vanilla and oak', 'Bourbon', 45.0, 29.99),
      ('Makers Mark', 'Soft and smooth with caramel notes', 'Bourbon', 45.0, 32.99),
      ('Woodford Reserve', 'Rich, rounded and smooth with complex citrus, cinnamon and cocoa', 'Bourbon', 45.2, 39.99),
      ('Johnnie Walker Black', 'Rich, complex and well-balanced blend', 'Scotch', 40.0, 34.99);
  `);
  
  if (result.success) {
    console.log('✅ Spirits table created successfully.');
    return true;
  } else {
    console.error('❌ Failed to create spirits table:', result.error);
    return false;
  }
}

// Create reviews table
async function createReviewsTable() {
  console.log('Creating reviews table...');
  
  if (await tableExists('reviews')) {
    console.log('✅ Reviews table already exists.');
    return true;
  }
  
  const result = await executeSQL(`
    CREATE TABLE IF NOT EXISTS public.reviews (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      spirit_id UUID REFERENCES public.spirits(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      review_text TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    );
    
    -- Create RLS policies
    ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
    
    -- Anyone can view reviews
    CREATE POLICY "Anyone can view reviews"
    ON public.reviews
    FOR SELECT USING (true);
    
    -- Users can insert their own reviews
    CREATE POLICY "Users can create their own reviews"
    ON public.reviews
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    -- Users can update their own reviews
    CREATE POLICY "Users can update their own reviews"
    ON public.reviews
    FOR UPDATE USING (auth.uid() = user_id);
    
    -- Users can delete their own reviews
    CREATE POLICY "Users can delete their own reviews"
    ON public.reviews
    FOR DELETE USING (auth.uid() = user_id);
  `);
  
  if (result.success) {
    console.log('✅ Reviews table created successfully.');
    return true;
  } else {
    console.error('❌ Failed to create reviews table:', result.error);
    return false;
  }
}

// Create collections table (user's collection of spirits)
async function createCollectionsTable() {
  console.log('Creating collections table...');
  
  if (await tableExists('collections')) {
    console.log('✅ Collections table already exists.');
    return true;
  }
  
  const result = await executeSQL(`
    CREATE TABLE IF NOT EXISTS public.collections (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      spirit_id UUID REFERENCES public.spirits(id) ON DELETE CASCADE,
      purchase_date DATE,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ,
      UNIQUE(user_id, spirit_id)
    );
    
    -- Create RLS policies
    ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
    
    -- Users can view only their own collection
    CREATE POLICY "Users can view their own collection"
    ON public.collections
    FOR SELECT USING (auth.uid() = user_id);
    
    -- Users can insert items into their own collection
    CREATE POLICY "Users can add to their own collection"
    ON public.collections
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    -- Users can update their own collection
    CREATE POLICY "Users can update their own collection"
    ON public.collections
    FOR UPDATE USING (auth.uid() = user_id);
    
    -- Users can delete from their own collection
    CREATE POLICY "Users can delete from their own collection"
    ON public.collections
    FOR DELETE USING (auth.uid() = user_id);
  `);
  
  if (result.success) {
    console.log('✅ Collections table created successfully.');
    return true;
  } else {
    console.error('❌ Failed to create collections table:', result.error);
    return false;
  }
}

// Create profiles table (user profiles)
async function createProfilesTable() {
  console.log('Creating profiles table...');
  
  if (await tableExists('profiles')) {
    console.log('✅ Profiles table already exists.');
    return true;
  }
  
  const result = await executeSQL(`
    CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      username TEXT UNIQUE,
      avatar_url TEXT,
      bio TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    );
    
    -- Create RLS policies
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Everyone can view profiles
    CREATE POLICY "Anyone can view profiles"
    ON public.profiles
    FOR SELECT USING (true);
    
    -- Users can update their own profile
    CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
    
    -- Create trigger to create profile when user signs up
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id)
      VALUES (NEW.id);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Trigger for new user signup
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  `);
  
  if (result.success) {
    console.log('✅ Profiles table created successfully.');
    return true;
  } else {
    console.error('❌ Failed to create profiles table:', result.error);
    return false;
  }
}

// Create Video table for streams/video content
async function createVideoTable() {
  console.log('Creating Video table...');
  
  if (await tableExists('Video')) {
    console.log('✅ Video table already exists.');
    return true;
  }
  
  const result = await executeSQL(`
    CREATE TABLE IF NOT EXISTS public."Video" (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      description TEXT,
      playback_id TEXT,
      asset_id TEXT,
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      thumbnail_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ
    );
    
    -- Create RLS policies
    ALTER TABLE public."Video" ENABLE ROW LEVEL SECURITY;
    
    -- Anyone can view videos
    CREATE POLICY "Anyone can view videos"
    ON public."Video"
    FOR SELECT USING (true);
    
    -- Users can create their own videos
    CREATE POLICY "Users can create their own videos"
    ON public."Video"
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    -- Users can update their own videos
    CREATE POLICY "Users can update their own videos"
    ON public."Video"
    FOR UPDATE USING (auth.uid() = user_id);
    
    -- Users can delete their own videos
    CREATE POLICY "Users can delete their own videos"
    ON public."Video"
    FOR DELETE USING (auth.uid() = user_id);
  `);
  
  if (result.success) {
    console.log('✅ Video table created successfully.');
    return true;
  } else {
    console.error('❌ Failed to create Video table:', result.error);
    return false;
  }
}

// Create extension for UUID generation if needed
async function createExtensions() {
  console.log('Setting up required extensions...');
  
  const result = await executeSQL(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  `);
  
  if (result.success) {
    console.log('✅ Extensions set up successfully.');
    return true;
  } else {
    console.error('❌ Failed to set up extensions:', result.error);
    return false;
  }
}

// Test querying a table
async function testQuery(tableName) {
  try {
    console.log(`\nTesting query on ${tableName} table...`);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(5);
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Successfully queried ${tableName} table`);
    console.log(`Found ${data.length} records`);
    
    if (data.length > 0) {
      console.log('Sample record:', JSON.stringify(data[0], null, 2));
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error querying ${tableName}:`, error.message);
    return false;
  }
}

// Main function to set up database
async function setupDatabase() {
  console.log('=== BOURBON BUDDY DATABASE SETUP ===');
  
  try {
    // Check if connected properly
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('❌ Connection error:', error.message);
      return;
    }
    
    console.log('✅ Connected to Supabase successfully');
    
    // Set up database components
    await createExtensions();
    await createProfilesTable();
    await createSpiritsTable();
    await createReviewsTable();
    await createCollectionsTable();
    await createVideoTable();
    
    // Test queries
    console.log('\n=== TESTING QUERIES ===');
    await testQuery('spirits');
    await testQuery('profiles');
    await testQuery('Video');
    
    console.log('\n=== SETUP COMPLETE ===');
    console.log('Your Bourbon Buddy database has been set up successfully!');
    console.log('\nAvailable tables:');
    console.log('- profiles: User profile information');
    console.log('- spirits: Bourbon and spirit information');
    console.log('- reviews: User reviews of spirits');
    console.log('- collections: User\'s collection of spirits');
    console.log('- Video: Video content and streams');
    
    console.log('\nYou can now use these tables in your application with:');
    console.log(`
    // Server-side
    const { data, error } = await supabase
      .from('spirits')
      .select('*')
      .limit(10)
    
    // Client-side
    const { data, error } = await supabase
      .from('spirits')
      .select('*')
      .limit(10)
    `);
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

// Run the setup
setupDatabase().catch(error => {
  console.error('Fatal error during setup:', error);
}); 