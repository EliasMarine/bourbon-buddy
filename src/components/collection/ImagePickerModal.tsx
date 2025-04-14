'use client';

import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface Image {
  url: string;
  alt?: string;
  source?: string;
}

interface ImagePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  images: Image[];
  title?: string;
  spiritName?: string;
  brandName?: string;
}

export default function ImagePickerModal({
  isOpen,
  onClose,
  onSelect,
  images,
  title = 'Select Bottle Image',
  spiritName = '',
  brandName = ''
}: ImagePickerModalProps) {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Reset selection when modal opens with new images
  useEffect(() => {
    if (isOpen) {
      setSelectedImageUrl(null);
      setSelectedImageIndex(null);
    }
  }, [isOpen, images]);
  
  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [isOpen, onClose]);
  
  // If modal is not open, don't render anything
  if (!isOpen) return null;
  
  const handleConfirmSelection = () => {
    if (selectedImageUrl) {
      onSelect(selectedImageUrl);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-800 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-gray-800">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors rounded-full p-1 hover:bg-gray-800"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Description */}
        <div className="px-5 py-3 border-b border-gray-800">
          <p className="text-gray-300">
            Found {images.length} potential images for {brandName} {spiritName}.
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Select the image that best represents this bottle in your collection.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Image Grid - Scrollable area */}
          <div className="md:w-2/3 p-4 overflow-y-auto bg-gray-950 border-r border-gray-800 flex-grow">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div 
                  key={index}
                  className={`relative overflow-hidden rounded-lg cursor-pointer transition-all ${
                    selectedImageIndex === index 
                      ? 'ring-4 ring-amber-500 shadow-lg transform scale-[1.03]' 
                      : 'hover:ring-2 hover:ring-amber-500/50'
                  }`}
                  onClick={() => {
                    setSelectedImageUrl(image.url);
                    setSelectedImageIndex(index);
                    setPreviewUrl(image.url);
                  }}
                >
                  {/* Container with fixed aspect ratio */}
                  <div className="relative pt-[150%] bg-gray-800">
                    {/* Loading indicator */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 border-t-2 border-b-2 border-amber-500 rounded-full animate-spin"></div>
                    </div>
                    
                    {/* Image */}
                    <img 
                      src={image.url} 
                      alt={image.alt || `Bottle image ${index + 1}`}
                      className="absolute inset-0 w-full h-full object-contain bg-white p-2"
                      loading="lazy"
                      onLoad={(e) => {
                        // Hide loading spinner when image loads
                        const target = e.target as HTMLElement;
                        const spinner = target.parentElement?.querySelector('div.absolute');
                        if (spinner) spinner.classList.add('hidden');
                      }}
                      onError={(e) => {
                        // Replace with placeholder on error
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/bottle-placeholder.png';
                        // Hide loading spinner
                        const spinner = target.parentElement?.querySelector('div.absolute');
                        if (spinner) spinner.classList.add('hidden');
                      }}
                    />
                    
                    {/* Selection indicator */}
                    {selectedImageIndex === index && (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white p-1 rounded-full shadow-lg">
                        <Check className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  
                  {/* Bottom label with source */}
                  {image.source && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-xs text-gray-300 py-1 px-2 truncate">
                      {image.source}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Preview Panel */}
          <div className="md:w-1/3 p-4 flex flex-col border-t md:border-t-0 border-gray-800">
            <div className="text-white font-medium mb-3">Preview</div>
            
            <div className="flex-grow bg-white rounded-lg flex items-center justify-center p-4">
              {selectedImageUrl ? (
                <img 
                  src={selectedImageUrl}
                  alt="Selected preview"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-gray-400 text-center py-10">
                  <p>Select an image to preview</p>
                </div>
              )}
            </div>
            
            {selectedImageUrl && (
              <div className="text-xs text-gray-400 mt-3 break-all">
                <div className="font-medium text-gray-300 mb-1">Image URL:</div>
                {selectedImageUrl}
              </div>
            )}
          </div>
        </div>
        
        {/* Footer with action buttons */}
        <div className="p-4 border-t border-gray-800 flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {selectedImageIndex !== null && (
              <span>Selected image {selectedImageIndex + 1} of {images.length}</span>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSelection}
              disabled={!selectedImageUrl}
              className={`px-6 py-2 rounded-md transition-colors flex items-center gap-2 ${
                selectedImageUrl 
                  ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {selectedImageUrl && <Check className="w-4 h-4" />}
              Use Selected Image
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 