/**
 * File validation utilities and tests
 */

// Define constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Verifies that a file's content matches its declared MIME type
 * by examining the file's magic bytes/signature
 */
export function verifyFileType(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      // If we don't have a result, reject the file for security
      if (!e.target?.result) {
        console.error('No file data available for content verification, rejecting file');
        resolve(false);
        return;
      }
      
      const buffer = e.target.result as ArrayBuffer;
      const byteArray = new Uint8Array(buffer);
      
      // Convert first 16 bytes to hex for logging/checking
      const headerBytes = byteArray.slice(0, 16);
      const hexHeader = Array.from(headerBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      console.log(`File header verification: ${hexHeader}, type: ${file.type}, name: ${file.name}`);
      
      // Extract file extension for additional validation
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      console.log(`File extension from name: ${fileExt}`);
      
      let isValid = false;
      
      // PNG signature check - official PNG signature is 89 50 4E 47 0D 0A 1A 0A
      if (file.type === 'image/png' || fileExt === 'png') {
        // Check for the standard PNG signature (first 8 bytes)
        isValid = headerBytes.length >= 8 &&
                 headerBytes[0] === 0x89 &&
                 headerBytes[1] === 0x50 &&
                 headerBytes[2] === 0x4E &&
                 headerBytes[3] === 0x47 &&
                 headerBytes[4] === 0x0D &&
                 headerBytes[5] === 0x0A &&
                 headerBytes[6] === 0x1A &&
                 headerBytes[7] === 0x0A;
                 
        if (isValid) {
          console.log('PNG signature verified successfully');
        } else {
          console.error('Invalid PNG signature:', hexHeader, 'Expected: 89504e470d0a1a0a');
        }
      } 
      // JPEG signature check - JPEG files start with FF D8 FF
      else if (file.type === 'image/jpeg' || file.type === 'image/jpg' || fileExt === 'jpg' || fileExt === 'jpeg') {
        isValid = headerBytes.length >= 3 &&
                 headerBytes[0] === 0xFF &&
                 headerBytes[1] === 0xD8 &&
                 headerBytes[2] === 0xFF;
                 
        if (isValid) {
          console.log('JPEG signature verified successfully');
        } else {
          console.error('Invalid JPEG signature:', hexHeader, 'Expected: ffd8ff...');
        }
      } 
      // GIF signature check - GIF files start with either "GIF87a" or "GIF89a"
      else if (file.type === 'image/gif' || fileExt === 'gif') {
        isValid = (
          headerBytes.length >= 6 &&
          // Check for "GIF87a"
          ((headerBytes[0] === 0x47 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46 &&
            headerBytes[3] === 0x38 && headerBytes[4] === 0x37 && headerBytes[5] === 0x61) ||
          // Check for "GIF89a"
          (headerBytes[0] === 0x47 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46 &&
           headerBytes[3] === 0x38 && headerBytes[4] === 0x39 && headerBytes[5] === 0x61))
        );
        
        if (isValid) {
          console.log('GIF signature verified successfully');
        } else {
          console.error('Invalid GIF signature:', hexHeader, 'Expected: 474946383761/474946383961');
        }
      } 
      // WebP signature check - "RIFF" header followed by "WEBP"
      else if (file.type === 'image/webp' || fileExt === 'webp') {
        // First check for RIFF signature
        const hasRiffHeader = headerBytes.length >= 4 &&
                 headerBytes[0] === 0x52 &&  // R
                 headerBytes[1] === 0x49 &&  // I
                 headerBytes[2] === 0x46 &&  // F
                 headerBytes[3] === 0x46;    // F
                 
        // Then check for WEBP string at position 8
        const hasWebpMarker = byteArray.length >= 12 &&
                 byteArray[8] === 0x57 &&  // W
                 byteArray[9] === 0x45 &&   // E
                 byteArray[10] === 0x42 &&  // B
                 byteArray[11] === 0x50;    // P
                 
        isValid = hasRiffHeader && hasWebpMarker;
        
        if (isValid) {
          console.log('WebP signature verified successfully');
        } else {
          console.error('Invalid WebP signature:', hexHeader, 
                        'RIFF header valid:', hasRiffHeader, 
                        'WEBP marker valid:', hasWebpMarker);
        }
      } else {
        console.error(`Unsupported file type: ${file.type} / ${fileExt}`);
      }
      
      resolve(isValid);
    };
    
    // Read a larger chunk to properly validate certain formats like WebP
    reader.readAsArrayBuffer(file.slice(0, 16));
  });
}

/**
 * Test the file type validation with known signature bytes for each format
 */
export async function testFileValidation(): Promise<{ passed: string[], failed: string[] }> {
  console.log('Running file validation tests...');
  
  const results = {
    passed: [] as string[],
    failed: [] as string[]
  };
  
  // Test files with valid signatures
  const testCases = [
    // PNG test
    {
      name: 'test-valid-png.png',
      type: 'image/png',
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    },
    // JPEG test
    {
      name: 'test-valid-jpeg.jpg',
      type: 'image/jpeg',
      // JPEG signature: FF D8 FF
      bytes: [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48]
    },
    // GIF test (GIF89a)
    {
      name: 'test-valid-gif.gif',
      type: 'image/gif',
      // GIF89a signature: 47 49 46 38 39 61
      bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00]
    },
    // WebP test
    {
      name: 'test-valid-webp.webp',
      type: 'image/webp',
      // WebP signature: 52 49 46 46 xx xx xx xx 57 45 42 50
      bytes: [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x00, 0x00, 0x00, 0x00]
    },
    // PNG test with incorrect MIME type
    {
      name: 'test-incorrect-type-png.png',
      type: 'application/octet-stream', // Wrong MIME type but correct content
      bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    }
  ];
  
  // Invalid test cases with incorrect signatures
  const invalidTestCases = [
    // Invalid PNG test
    {
      name: 'test-invalid-png.png',
      type: 'image/png',
      // Invalid signature - first byte different
      bytes: [0x80, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    },
    // Invalid JPEG test
    {
      name: 'test-invalid-jpeg.jpg',
      type: 'image/jpeg',
      // Invalid signature
      bytes: [0xFF, 0xD8, 0xFE, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48]
    }
  ];
  
  // Run valid test cases
  for (const testCase of testCases) {
    const testFile = new File([new Uint8Array(testCase.bytes)], testCase.name, { type: testCase.type });
    const isValid = await verifyFileType(testFile);
    
    if (isValid) {
      console.log(`✅ TEST PASSED: ${testCase.type} validation passed`);
      results.passed.push(testCase.type);
    } else {
      console.error(`❌ TEST FAILED: ${testCase.type} validation failed`);
      results.failed.push(testCase.type);
    }
  }
  
  // Run invalid test cases
  for (const testCase of invalidTestCases) {
    const testFile = new File([new Uint8Array(testCase.bytes)], testCase.name, { type: testCase.type });
    const isValid = await verifyFileType(testFile);
    
    if (!isValid) {
      console.log(`✅ TEST PASSED: Invalid ${testCase.type} correctly rejected`);
      results.passed.push(`Invalid ${testCase.type}`);
    } else {
      console.error(`❌ TEST FAILED: Invalid ${testCase.type} incorrectly accepted`);
      results.failed.push(`Invalid ${testCase.type}`);
    }
  }
  
  // Summary
  console.log(`
  ===== FILE VALIDATION TEST RESULTS =====
  PASSED: ${results.passed.length} tests
  FAILED: ${results.failed.length} tests
  
  Passed: ${results.passed.join(', ')}
  Failed: ${results.failed.length > 0 ? results.failed.join(', ') : 'None'}
  ======================================
  `);
  
  return results;
}

/**
 * User-friendly function to test if a specific file will pass validation
 * Returns detailed diagnostics about the file
 */
export async function validateUserFile(file: File): Promise<{
  valid: boolean;
  fileInfo: {
    name: string;
    size: number;
    type: string;
    extension: string;
  };
  detectedFormat: string;
  headerInfo: string;
  details: string;
}> {
  // Basic file info
  const fileInfo = {
    name: file.name,
    size: file.size,
    type: file.type,
    extension: file.name.split('.').pop()?.toLowerCase() || 'unknown'
  };
  
  // Read file header
  const result = await new Promise<{
    header: string;
    detectedFormat: string;
    formatValid: boolean;
  }>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = (e) => {
      if (!e.target?.result) {
        resolve({
          header: 'Could not read file',
          detectedFormat: 'unknown',
          formatValid: false
        });
        return;
      }
      
      const buffer = e.target.result as ArrayBuffer;
      const byteArray = new Uint8Array(buffer);
      
      // Convert bytes to hex for display
      const headerBytes = byteArray.slice(0, 16);
      const hexHeader = Array.from(headerBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Detect file format based on header
      let detectedFormat = 'unknown';
      let formatValid = false;
      
      // Check for PNG signature
      if (headerBytes.length >= 8 &&
          headerBytes[0] === 0x89 &&
          headerBytes[1] === 0x50 &&
          headerBytes[2] === 0x4E &&
          headerBytes[3] === 0x47 &&
          headerBytes[4] === 0x0D &&
          headerBytes[5] === 0x0A &&
          headerBytes[6] === 0x1A &&
          headerBytes[7] === 0x0A) {
        detectedFormat = 'PNG';
        formatValid = fileInfo.extension === 'png';
      }
      // Check for JPEG signature
      else if (headerBytes.length >= 3 &&
              headerBytes[0] === 0xFF &&
              headerBytes[1] === 0xD8 &&
              headerBytes[2] === 0xFF) {
        detectedFormat = 'JPEG';
        formatValid = fileInfo.extension === 'jpg' || fileInfo.extension === 'jpeg';
      }
      // Check for GIF signature
      else if (headerBytes.length >= 6 &&
              headerBytes[0] === 0x47 && // G
              headerBytes[1] === 0x49 && // I
              headerBytes[2] === 0x46 && // F
              headerBytes[3] === 0x38 && // 8
              (headerBytes[4] === 0x37 || headerBytes[4] === 0x39) && // 7 or 9
              headerBytes[5] === 0x61) { // a
        detectedFormat = 'GIF';
        formatValid = fileInfo.extension === 'gif';
      }
      // Check for WebP signature
      else if (headerBytes.length >= 12 &&
              headerBytes[0] === 0x52 && // R
              headerBytes[1] === 0x49 && // I
              headerBytes[2] === 0x46 && // F
              headerBytes[3] === 0x46 && // F
              byteArray[8] === 0x57 && // W
              byteArray[9] === 0x45 && // E
              byteArray[10] === 0x42 && // B
              byteArray[11] === 0x50) { // P
        detectedFormat = 'WebP';
        formatValid = fileInfo.extension === 'webp';
      }
      
      resolve({
        header: hexHeader,
        detectedFormat,
        formatValid
      });
    };
    
    reader.readAsArrayBuffer(file.slice(0, 16));
  });
  
  // Size validation
  const sizeValid = file.size <= MAX_FILE_SIZE;
  
  // MIME type validation based on extension
  const expectedMimeType = 
    fileInfo.extension === 'png' ? 'image/png' :
    fileInfo.extension === 'jpg' || fileInfo.extension === 'jpeg' ? 'image/jpeg' :
    fileInfo.extension === 'gif' ? 'image/gif' :
    fileInfo.extension === 'webp' ? 'image/webp' :
    'unknown';
    
  const mimeTypeValid = file.type === expectedMimeType;
  
  // Overall validity
  const valid = sizeValid && result.formatValid && (mimeTypeValid || result.detectedFormat !== 'unknown');
  
  // Generate details message
  let details = '';
  
  if (!sizeValid) {
    details += `File is too large (${Math.round(file.size / 1024)}KB). Maximum size is ${Math.round(MAX_FILE_SIZE / 1024)}KB.\n`;
  }
  
  if (!mimeTypeValid) {
    details += `File has incorrect MIME type. Expected: ${expectedMimeType}, Found: ${file.type}.\n`;
    
    if (result.detectedFormat !== 'unknown') {
      details += `However, file content appears to be ${result.detectedFormat}, which may be accepted with the correct file extension.\n`;
    }
  }
  
  if (!result.formatValid && result.detectedFormat !== 'unknown') {
    details += `File extension doesn't match content. Extension: ${fileInfo.extension}, Content: ${result.detectedFormat}.\n`;
  }
  
  if (result.detectedFormat === 'unknown') {
    details += `File doesn't appear to be a recognized image format based on its content.\n`;
  }
  
  if (valid) {
    details += `File validation successful! This file should upload correctly.\n`;
  } else {
    details += `File validation failed. Please fix the issues mentioned above.\n`;
  }
  
  return {
    valid,
    fileInfo,
    detectedFormat: result.detectedFormat,
    headerInfo: result.header,
    details: details.trim()
  };
}

// Export the test runner for browser console debugging
if (typeof window !== 'undefined') {
  (window as any).testFileValidation = testFileValidation;
  (window as any).validateUserFile = validateUserFile;
} 