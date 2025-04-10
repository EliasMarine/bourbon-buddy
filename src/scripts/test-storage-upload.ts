import { config } from 'dotenv'
import { createSupabaseServerClient } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

// Load environment variables from .env.local
config({ path: '.env.local' })

// Configuration constants
const BUCKET_NAME = process.env.STORAGE_BUCKET_NAME || 'bourbon-buddy-prod'
const TEST_FILE_PATH = path.join(process.cwd(), 'test-upload.txt')
const STORAGE_PATH = 'test/test-upload.txt'

interface UploadResult {
  path: string
  id: string
  fullPath: string
}

/**
 * Test the Supabase storage functionality by uploading a file
 */
async function testStorageUpload(): Promise<void> {
  try {
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Using bucket:', BUCKET_NAME)
    
    const supabase = createSupabaseServerClient()
    
    // Check if test file exists
    if (!fs.existsSync(TEST_FILE_PATH)) {
      console.error(`Test file not found: ${TEST_FILE_PATH}`)
      return
    }
    
    const fileContent = fs.readFileSync(TEST_FILE_PATH)
    
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(STORAGE_PATH, fileContent, {
        contentType: 'text/plain',
        upsert: true
      })

    if (error) {
      console.error('Error uploading file:', error)
      return
    }

    const uploadResult = data as UploadResult
    console.log('File uploaded successfully:', uploadResult)

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(STORAGE_PATH)

    console.log('Public URL:', publicUrl)
    
    // Verify the file by downloading it
    await verifyUpload(supabase, BUCKET_NAME, STORAGE_PATH)
  } catch (error) {
    console.error('Error in test upload:', error)
  }
}

/**
 * Verify the uploaded file by downloading it
 */
async function verifyUpload(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  bucket: string, 
  filePath: string
): Promise<void> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(filePath)
    
    if (error) {
      console.error('Error verifying upload:', error)
      return
    }
    
    if (data) {
      const text = await data.text()
      console.log('Downloaded file content:', text)
      console.log('✅ Upload verification successful')
    }
  } catch (error) {
    console.error('Error downloading file:', error)
  }
}

/**
 * Clean up the test file from storage
 */
async function cleanupTestFile(): Promise<void> {
  try {
    const supabase = createSupabaseServerClient()
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([STORAGE_PATH])
    
    if (error) {
      console.error('Error cleaning up test file:', error)
      return
    }
    
    console.log('✅ Test file cleaned up successfully')
  } catch (error) {
    console.error('Error in cleanup:', error)
  }
}

// Run the test
async function run() {
  await testStorageUpload()
  
  // Uncomment to clean up the test file when done
  await cleanupTestFile()
}

run() 