'use client';

import { useState } from 'react';
import { FileUpload } from '@/components/ui/file-upload';
import { ALLOWED_FILE_TYPES, SIZE_LIMITS } from '@/hooks/use-supabase-storage';

export function StorageExample() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  
  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-4 text-xl font-semibold">Image Upload</h2>
        <FileUpload
          directory="images"
          allowedTypes={ALLOWED_FILE_TYPES.IMAGES}
          maxSizeMB={5}
          onChange={setImageUrl}
          buttonText="Upload Image"
        />
        {imageUrl && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Image URL: {imageUrl}</p>
          </div>
        )}
      </div>
      
      <div>
        <h2 className="mb-4 text-xl font-semibold">Document Upload</h2>
        <FileUpload
          directory="documents"
          allowedTypes={ALLOWED_FILE_TYPES.DOCUMENTS}
          accept=".pdf"
          maxSizeMB={10}
          onChange={setDocumentUrl}
          buttonText="Upload PDF"
          showPreview={false}
        />
        {documentUrl && (
          <div className="mt-4">
            <p className="text-sm text-gray-500">Document URL: {documentUrl}</p>
            <a 
              href={documentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block mt-2 text-blue-600 hover:underline"
            >
              View Document
            </a>
          </div>
        )}
      </div>
      
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="mb-2 font-medium text-blue-800">Usage Example:</h3>
        <pre className="p-3 overflow-auto text-xs bg-white border border-blue-100 rounded">
{`// Simple image upload
<FileUpload 
  directory="images"
  onChange={(url) => console.log(url)}
/>

// Custom document upload
<FileUpload
  directory="documents"
  allowedTypes={ALLOWED_FILE_TYPES.DOCUMENTS}
  accept=".pdf"
  maxSizeMB={10}
  onChange={setDocumentUrl}
  buttonText="Upload PDF"
  showPreview={false}
/>`}
        </pre>
      </div>
    </div>
  );
} 