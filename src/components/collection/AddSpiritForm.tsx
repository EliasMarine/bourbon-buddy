'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SpiritSchema } from '@/lib/validations/spirit';
import { ZodError } from 'zod';
import toast from 'react-hot-toast';
import { Wine } from 'lucide-react';
import BourbonFillIndicator from '../ui/BourbonFillIndicator';
import TastingNotesSelector, { TastingNoteCategory } from './TastingNotesSelector';

interface AddSpiritFormProps {
  onAdd: (spirit: FormData) => Promise<void>;
}

interface ValidationErrors {
  [key: string]: string[];
}

const TASTING_NOTES = {
  nose: [
    'Baking Spices', 'Caramel', 'Chocolate', 'Citrus', 'Coffee', 'Dried Fruit',
    'Floral', 'Fruit', 'Grain', 'Herbs', 'Honey', 'Leather', 'Malt', 'Mint',
    'Nuts', 'Oak', 'Peat', 'Smoke', 'Spice', 'Vanilla'
  ],
  palate: [
    'Balanced', 'Bold', 'Buttery', 'Chocolate', 'Citrus', 'Complex', 'Creamy',
    'Dry', 'Fruity', 'Herbal', 'Minty', 'Nutty', 'Oaky', 'Peppery', 'Rich',
    'Smoky', 'Smooth', 'Spicy', 'Sweet'
  ],
  finish: [
    'Bitter', 'Bold', 'Burning', 'Clean', 'Complex', 'Dry', 'Fruity',
    'Herbal', 'Long', 'Minty', 'Oaky', 'Peppery', 'Short', 'Smooth',
    'Spicy', 'Sweet', 'Warm'
  ]
};

// Add this new constant for custom notes storage key
const CUSTOM_NOTES_STORAGE_KEY = 'customTastingNotes';

export default function AddSpiritForm({ onAdd }: AddSpiritFormProps) {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState({
    nose: [] as string[],
    palate: [] as string[],
    finish: [] as string[]
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [bottleLevel, setBottleLevel] = useState(100);
  // New state for auto-fetched images
  const [autoFetchedImages, setAutoFetchedImages] = useState<{url: string; alt: string; source: string}[]>([]);
  const [fetchingImages, setFetchingImages] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  // Debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [spiritInfo, setSpiritInfo] = useState<{
    name: string;
    distillery: string;
    type: string;
    description: string;
  } | null>(null);

  // Load saved form data on component mount
  useEffect(() => {
    // Load form data
    const savedData = localStorage.getItem('spiritFormData');
    if (savedData) {
      try {
        const {
          name,
          brand,
          type,
          proof,
          price,
          rating,
          releaseYear,
          description,
          selectedNotes: savedNotes,
          isFavorite: savedFavorite,
          bottleLevel: savedBottleLevel
        } = JSON.parse(savedData);

        // Restore form values
        if (name) document.getElementById('name')?.setAttribute('value', name);
        if (brand) document.getElementById('brand')?.setAttribute('value', brand);
        if (type) document.getElementById('type')?.setAttribute('value', type);
        if (proof) document.getElementById('proof')?.setAttribute('value', proof);
        if (price) document.getElementById('price')?.setAttribute('value', price);
        if (rating) document.getElementById('rating')?.setAttribute('value', rating);
        if (releaseYear) document.getElementById('releaseYear')?.setAttribute('value', releaseYear);
        if (description) document.getElementById('description')?.setAttribute('value', description);
        
        // Restore selected notes and favorite status
        if (savedNotes) setSelectedNotes(savedNotes);
        if (savedFavorite !== undefined) setIsFavorite(savedFavorite);
        if (savedBottleLevel !== undefined) setBottleLevel(savedBottleLevel);
      } catch (error) {
        console.error('Error parsing saved form data:', error);
        // Clean up the invalid saved data
        localStorage.removeItem('spiritFormData');
      }
    }
  }, []);

  // Save form data whenever they change
  useEffect(() => {
    const formData = {
      name: (document.getElementById('name') as HTMLInputElement)?.value || '',
      brand: (document.getElementById('brand') as HTMLInputElement)?.value || '',
      type: (document.getElementById('type') as HTMLSelectElement)?.value || '',
      proof: (document.getElementById('proof') as HTMLInputElement)?.value || '',
      price: (document.getElementById('price') as HTMLInputElement)?.value || '',
      rating: (document.getElementById('rating') as HTMLInputElement)?.value || '',
      releaseYear: (document.getElementById('releaseYear') as HTMLInputElement)?.value || '',
      description: (document.getElementById('description') as HTMLTextAreaElement)?.value || '',
      selectedNotes,
      isFavorite,
      bottleLevel
    };
    localStorage.setItem('spiritFormData', JSON.stringify(formData));
  }, [selectedNotes, isFavorite, bottleLevel]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // Create a safe filename
      const timestamp = Date.now();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const mockImageUrl = `/mock-images/${timestamp}-${safeFileName}`;
      setImageUrl(mockImageUrl);
      
      // Set preview URL for immediate visual feedback
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Create FormData to save the file locally
      const imageFormData = new FormData();
      imageFormData.append('file', file);
      imageFormData.append('filename', `${timestamp}-${safeFileName}`);
      
      try {
        // Save the file locally
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: imageFormData,
        });
        
        if (!response.ok) {
          console.error('Error saving image locally:', await response.text());
          toast('Failed to save image locally', { icon: '❌' });
        } else {
          toast('Image uploaded successfully', { icon: '✅' });
        }
      } catch (error) {
        console.error('Error saving image:', error);
        toast('Failed to upload image', { icon: '❌' });
      }
    }
  };

  const handleNotesChange = (category: TastingNoteCategory, notes: string[]) => {
    setSelectedNotes(prev => ({
      ...prev,
      [category]: notes
    }));
  };

  // Improved image fetching function
  const fetchSpiritImages = useCallback(async () => {
    const nameInput = document.getElementById('name') as HTMLInputElement;
    const brandInput = document.getElementById('brand') as HTMLInputElement;
    const typeSelect = document.getElementById('type') as HTMLSelectElement;
    
    const name = nameInput?.value?.trim();
    const brand = brandInput?.value?.trim();
    const type = typeSelect?.value;
    
    // Only search if we have enough information
    if ((!name || name.length < 2) && (!brand || brand.length < 2)) {
      setAutoFetchedImages([]);
      setSpiritInfo(null);
      return;
    }
    
    // Only search if we have the name field
    if (!name || name.length < 2) {
      setAutoFetchedImages([]);
      setSpiritInfo(null);
      return;
    }

    // Name field is required for image searching
    if (!name || name.length < 2) {
      setAutoFetchedImages([]);
      setSpiritInfo(null);
      toast('Enter a spirit name to search for images', { icon: 'ℹ️' });
      return;
    }
    
    try {
      setFetchingImages(true);
      setSelectedImageIndex(null); // Reset selection when starting a new search
      
      // Clear previous image selection when starting a fresh search
      if (imageUrl && imageUrl.includes('thewhiskyexchange.com')) {
        setImageUrl(null);
        setPreviewUrl(null);
      }
      
      // Build search URL with only name and type for image matching
      const searchParams = new URLSearchParams();
      searchParams.append('name', name);
      if (type) searchParams.append('type', type);
      if (brand) searchParams.append('brand', brand);
      
      // Add source for image searching
      searchParams.append('source', 'google');
      
      // Add a random parameter to prevent caching
      searchParams.append('t', Date.now().toString());
      
      // Debug log
      console.log(`Searching for spirit images with name: "${name}", brand: "${brand || 'any'}", and type: "${type || 'any'}"`);
      
      const response = await fetch(`/api/spirits/google-image-search?${searchParams.toString()}`);
      
      if (!response.ok) {
        console.error('Error fetching spirit images:', await response.text());
        toast.error('Failed to fetch spirit images');
        return;
      }
      
      const data = await response.json();
      console.log('Fetched spirit images:', data);
      
      if (data.images && data.images.length > 0) {
        // Filter out any broken or invalid image URLs
        const validImages = data.images.filter((img: {url: string; alt: string; source: string}) => 
          img.url && img.url.startsWith('http')
        );
        setAutoFetchedImages(validImages);
        
        if (validImages.length > 0) {
          // Auto-select the first image
          setSelectedImageIndex(0);
          setImageUrl(validImages[0].url);
          setPreviewUrl(validImages[0].url);
          toast.success('Found images for your spirit!');
        }
        
        // The google-image-search endpoint doesn't return spiritInfo
        setSpiritInfo(null);
      } else {
        setAutoFetchedImages([]);
        toast.error('No images found for this spirit');
      }
    } catch (error) {
      console.error('Error auto-fetching images:', error);
      toast.error('Failed to search for spirit images');
    } finally {
      setFetchingImages(false);
    }
  }, []);

  // Debounced input handler for spirit name and brand
  const handleSpiritInfoInput = () => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer to fetch images after user stops typing
    debounceTimerRef.current = setTimeout(() => {
      fetchSpiritImages();
    }, 800); // 800ms debounce
  };

  // Select an image from the fetched results
  const selectImage = (index: number) => {
    if (index >= 0 && index < autoFetchedImages.length) {
      setSelectedImageIndex(index);
      setImageUrl(autoFetchedImages[index].url);
      setPreviewUrl(autoFetchedImages[index].url);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setRateLimitError(null);

    try {
      const formData = new FormData();
      
      // First add all the basic form data
      formData.set('name', (document.getElementById('name') as HTMLInputElement)?.value || '');
      formData.set('brand', (document.getElementById('brand') as HTMLInputElement)?.value || '');
      formData.set('type', (document.getElementById('type') as HTMLSelectElement)?.value || '');
      formData.set('proof', (document.getElementById('proof') as HTMLInputElement)?.value || '');
      formData.set('price', (document.getElementById('price') as HTMLInputElement)?.value || '');
      formData.set('rating', (document.getElementById('rating') as HTMLInputElement)?.value || '');
      formData.set('releaseYear', (document.getElementById('releaseYear') as HTMLInputElement)?.value || '');
      formData.set('isFavorite', isFavorite.toString());
      formData.set('nose', JSON.stringify(selectedNotes.nose));
      formData.set('palate', JSON.stringify(selectedNotes.palate));
      formData.set('finish', JSON.stringify(selectedNotes.finish));
      
      // Add description if provided
      const description = (document.getElementById('description') as HTMLTextAreaElement)?.value;
      if (description) {
        formData.set('description', description);
      }
      
      // Add the image URL if we have one
      if (imageUrl) {
        formData.set('imageUrl', imageUrl);
        console.log('Using image URL:', imageUrl);
      }
      
      // Add bottle level
      formData.set('bottleLevel', bottleLevel.toString());
      
      console.log("Form data being submitted:", {
        name: formData.get('name'),
        brand: formData.get('brand'),
        type: formData.get('type'),
        nose: formData.get('nose'),
        palate: formData.get('palate'),
        finish: formData.get('finish'),
        imageUrl: formData.get('imageUrl'),
        bottleLevel: formData.get('bottleLevel'),
        releaseYear: formData.get('releaseYear')
      });

      // Submit the form
      await onAdd(formData);
      
      // Reset form state using the formRef instead of event.currentTarget
      if (formRef.current) {
        formRef.current.reset();
      }
      setPreviewUrl(null);
      setSelectedNotes({ nose: [], palate: [], finish: [] });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Reset description field
      const descriptionField = document.getElementById('description') as HTMLTextAreaElement;
      if (descriptionField) {
        descriptionField.value = '';
      }
      
      // Clear saved form data after successful submission
      localStorage.removeItem('spiritFormData');
      toast('Spirit added successfully!');
    } catch (error: any) {
      if (error.status === 429) {
        setRateLimitError('Too many requests. Please try again later.');
      } else if (error instanceof ZodError) {
        const validationErrors: ValidationErrors = {};
        error.errors.forEach((err) => {
          if (err.path) {
            const field = err.path[0];
            if (!validationErrors[field]) {
              validationErrors[field] = [];
            }
            validationErrors[field].push(err.message);
          }
        });
        setErrors(validationErrors);
      } else {
        toast('Error adding spirit: ' + (error.message || 'Unknown error'), { icon: '❌' });
      }
      console.error('Form submission error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 bg-white/5 backdrop-blur-sm p-6 rounded-lg shadow-xl border border-white/10">
      {rateLimitError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded">
          {rateLimitError}
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h3 className="text-xl font-semibold text-white truncate max-w-[80%]">Add New Spirit</h3>
        <button
          type="button"
          onClick={() => setIsFavorite(!isFavorite)}
          className="p-2 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-6 w-6 ${isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'}`}
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
        </button>
      </div>
      {Object.entries(errors).map(([field, messages]) => (
        <div key={field} className="text-red-500 text-sm">
          {messages.map((message, i) => (
            <p key={i}>{message}</p>
          ))}
        </div>
      ))}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1 flex items-center justify-between">
            <span>Name</span>
            <span className="text-xs text-gray-400">(Required)</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            onChange={handleSpiritInfoInput}
            className="mt-0 block w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 overflow-ellipsis"
            placeholder="e.g. Barrel Proof C924"
          />
        </div>
        <div>
          <label htmlFor="brand" className="block text-sm font-medium text-gray-300 mb-1 flex items-center justify-between">
            <span>Distillery</span> 
            <span className="text-xs text-gray-400">(Required)</span>
          </label>
          <input
            type="text"
            id="brand"
            name="brand"
            required
            onChange={handleSpiritInfoInput}
            className="mt-0 block w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500 overflow-ellipsis"
            placeholder="e.g. Heaven Hill"
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1 flex items-center justify-between">
            <span>Type</span>
            <span className="text-xs text-gray-400">(Required)</span>
          </label>
          <select
            id="type"
            name="type"
            required
            onChange={handleSpiritInfoInput}
            className="mt-0 block w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-amber-500 focus:border-amber-500 overflow-ellipsis"
          >
            <option value="">Select a type</option>
            <option value="Bourbon">Bourbon</option>
            <option value="Rye">Rye</option>
            <option value="Scotch">Scotch</option>
            <option value="Irish">Irish</option>
            <option value="Japanese">Japanese</option>
            <option value="Canadian">Canadian</option>
            <option value="Tennessee">Tennessee</option>
            <option value="Single Malt">Single Malt</option>
            <option value="Blended">Blended</option>
            <option value="Other Whiskey">Other Whiskey</option>
            <option value="Blanco">Blanco (Tequila)</option>
            <option value="Reposado">Reposado (Tequila)</option>
            <option value="Añejo">Añejo (Tequila)</option>
            <option value="Extra Añejo">Extra Añejo (Tequila)</option>
            <option value="Other Tequila">Other Tequila</option>
          </select>
        </div>
        <div>
          <label htmlFor="releaseYear" className="block text-sm font-medium text-gray-300 mb-1">
            Release Year
          </label>
          <input
            type="number"
            id="releaseYear"
            name="releaseYear"
            min="1700"
            max={new Date().getFullYear()}
            placeholder={`e.g. ${new Date().getFullYear()}`}
            className="mt-0 block w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <div>
          <label htmlFor="proof" className="block text-sm font-medium text-gray-300 mb-1">
            Proof
          </label>
          <input
            type="text"
            id="proof"
            name="proof"
            placeholder="e.g. 80, 90, 100"
            className="mt-0 block w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-1">
            Price ($)
          </label>
          <input
            type="number"
            id="price"
            name="price"
            min="0"
            step="0.01"
            placeholder="e.g. 49.99"
            className="mt-0 block w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500"
          />
        </div>
      </div>

      {/* Tasting Notes Section */}
      <div className="space-y-6 mt-2">
        <h4 className="text-lg font-medium text-white">Tasting Notes</h4>
        
        {/* Rating */}
        <div>
          <label htmlFor="rating" className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
            <Wine className="w-4 h-4 text-amber-400" />
            Rating (out of 10)
          </label>
          <input
            type="number"
            id="rating"
            name="rating"
            min="1"
            max="10"
            step="0.1"
            placeholder="Enter a rating from 1.0 to 10.0"
            className="mt-0 block w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <TastingNotesSelector
          category="nose"
          selectedNotes={selectedNotes.nose}
          onNotesChange={(notes) => handleNotesChange('nose', notes)}
          label="Nose"
        />
        
        <TastingNotesSelector
          category="palate"
          selectedNotes={selectedNotes.palate}
          onNotesChange={(notes) => handleNotesChange('palate', notes)}
          label="Palate"
        />
        
        <TastingNotesSelector
          category="finish"
          selectedNotes={selectedNotes.finish}
          onNotesChange={(notes) => handleNotesChange('finish', notes)}
          label="Finish"
        />
      </div>

      {/* Auto-fetched Image Section */}
      <div className="space-y-4 mt-6">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h4 className="text-lg font-medium text-white">Spirit Image</h4>
          {fetchingImages && (
            <span className="text-sm text-amber-400 inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching for images...
            </span>
          )}
        </div>
        
        {autoFetchedImages.length > 0 ? (
          <>
            <div className="text-sm text-gray-300 mb-3 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400 flex-shrink-0">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
              </svg>
              <span>Images found automatically. Select one for your spirit.</span>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {autoFetchedImages.map((image, index) => (
                <div 
                  key={index}
                  className={`relative rounded-lg overflow-hidden cursor-pointer h-48 bg-gray-900/50 ${selectedImageIndex === index ? 'ring-2 ring-amber-500 scale-105 transition-all' : 'ring-1 ring-white/10 hover:ring-amber-400/60 transition-all'}`}
                  onClick={() => selectImage(index)}
                >
                  <div className="h-full flex items-center justify-center p-2">
                    <img 
                      src={image.url} 
                      alt={image.alt}
                      className="max-h-[85%] max-w-[85%] object-contain transform hover:scale-105 transition-transform duration-200" 
                    />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-1.5 text-xs text-white">
                    <p className="font-medium truncate">{image.alt}</p>
                    <p className="text-gray-300 text-xs truncate">Source: {image.source}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {selectedImageIndex !== null && previewUrl && (
              <div className="mt-4 p-4 bg-black/30 rounded-lg border border-white/10">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <div className="flex items-center justify-center bg-gray-900/50 rounded-lg p-4 w-full md:w-1/3 h-[250px]">
                    <img
                      src={previewUrl}
                      alt="Selected spirit"
                      className="max-h-[220px] max-w-[80%] object-contain rounded-lg shadow-lg"
                    />
                  </div>
                  <div className="space-y-2 w-full md:w-2/3">
                    <h5 className="font-medium text-white">Selected Image</h5>
                    <p className="text-sm text-gray-300 break-words">
                      Source: {spiritInfo?.distillery || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-300 break-words">
                      {spiritInfo?.name || 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-300 p-4 bg-gray-800/50 rounded-lg border border-white/5">
            <p className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-amber-400 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <span>No images found automatically. Please upload your own.</span>
            </p>
          </div>
        )}
      </div>

      {/* Manual Image Upload Section */}
      <div className={`${autoFetchedImages.length > 0 ? 'mt-2 pt-4 border-t border-white/10' : ''}`}>
        <label htmlFor="imageFile" className="block text-sm font-medium text-gray-300 mb-1">
          {autoFetchedImages.length > 0 ? 'Or upload your own image' : 'Upload Image'}
        </label>
        <input
          type="file"
          id="imageFile"
          name="imageFile"
          accept="image/*"
          onChange={handleImageChange}
          ref={fileInputRef}
          className="mt-0 block w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500"
        />
        <p className="mt-1 text-sm text-gray-400">
          Maximum file size: 2MB. Supported formats: JPG, PNG, GIF
        </p>
        {/* Only show manual upload preview if we're not showing auto-fetched images */}
        {previewUrl && autoFetchedImages.length === 0 && (
          <div className="mt-4 p-4 bg-black/30 rounded-lg border border-white/10">
            <div className="flex items-center justify-center bg-gray-900/50 rounded-lg p-4 h-[250px]">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-[220px] max-w-[80%] object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Description/Notes Section */}
      <div className="mt-6">
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="mt-0 block w-full px-3 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500"
          placeholder="Add any additional notes or description"
        ></textarea>
      </div>

      {/* Bottle Level */}
      <div className="space-y-2 mt-6">
        <label htmlFor="bottleLevel" className="block text-sm font-medium text-gray-300 mb-1">
          Bottle Level
        </label>
        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-4">
            <input
              type="range"
              id="bottleLevel"
              name="bottleLevel"
              min="0"
              max="100"
              step="1"
              value={bottleLevel}
              onChange={(e) => setBottleLevel(Number(e.target.value))}
              className="flex-1 h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex-shrink-0 w-16">
              <BourbonFillIndicator level={bottleLevel} size="sm" showLabel={true} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-amber-500 text-white px-4 py-2 rounded-md hover:bg-amber-600 transition-colors"
        >
          {isLoading ? 'Adding...' : 'Add Spirit'}
        </button>
      </div>
    </form>
  );
}