'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { ArrowLeft, X, Search, Check } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import spiritCategories from '@/lib/spiritCategories';
import BottleLevelIndicator from '@/components/collection/BottleLevelIndicator';
import TastingNotesSelector, { TastingNoteCategory } from '@/components/collection/TastingNotesSelector';

// Add interface for Google image search results
interface GoogleImageResult {
  url: string;
  alt: string;
  source: string;
}

interface GoogleImageSearchResponse {
  images: GoogleImageResult[];
  query: string;
}

export default function EditSpiritPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSupabaseSession();
  const [spirit, setSpirit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'whiskey',
    type: 'bourbon',
    description: '',
    proof: '',
    price: '',
    imageUrl: '',
    bottleLevel: 100,
    rating: 0,
    nose: '',
    palate: '',
    finish: '',
    distillery: '',
    bottleSize: '',
    dateAcquired: '',
    releaseYear: '',
  });
  const [isFavorite, setIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<{
    nose: string[];
    palate: string[];
    finish: string[];
  }>({
    nose: [],
    palate: [],
    finish: []
  });
  const [isImageSearchLoading, setIsImageSearchLoading] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState<GoogleImageResult[]>([]);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const spiritId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  // Get category options from spiritCategories
  const selectedCategory = spiritCategories.find(cat => cat.id === formData.category);
  const typeOptions = selectedCategory ? selectedCategory.subcategories : [];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'loading') return;
    
    // Fetch spirit details when session is available
    fetchSpiritDetails();
  }, [status, spiritId]);

  const fetchSpiritDetails = async () => {
    setLoading(true);
    setError(null);
    
    // Prevent duplicate requests
    if (spirit && spirit.id === spiritId) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`/api/collection/${spiritId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch spirit details');
      }
      
      setSpirit(data);
      
      // Set form data from spirit
      setFormData({
        name: data.name || '',
        brand: data.brand || '',
        category: data.category || 'whiskey',
        type: data.type || 'bourbon',
        description: data.description || '',
        proof: data.proof?.toString() || '',
        price: data.price?.toString() || '',
        imageUrl: data.imageUrl || '',
        bottleLevel: data.bottleLevel ?? 100,
        rating: data.rating || 0,
        nose: data.nose || '',
        palate: data.palate || '',
        finish: data.finish || '',
        distillery: data.distillery || '',
        bottleSize: data.bottleSize || '',
        dateAcquired: data.dateAcquired || '',
        releaseYear: data.releaseYear || '',
      });
      
      // Set favorite status
      setIsFavorite(data.isFavorite || false);
      
      // Parse tasting notes if they exist
      const parseNotes = (notesStr: string | null | undefined | string[] | any): string[] => {
        // Handle null, undefined, empty string or 'null' string
        if (notesStr === null || notesStr === undefined || notesStr === 'null' || notesStr === '') return [];
        
        // If it's already an array, filter out invalid values
        if (Array.isArray(notesStr)) {
          return notesStr.filter(note => 
            note !== null && note !== undefined && note !== 'null' && note !== ''
          );
        }
        
        try {
          // Try to parse as JSON (for notes stored as arrays)
          if (typeof notesStr === 'string') {
            const parsed = JSON.parse(notesStr);
            if (Array.isArray(parsed)) {
              return parsed.filter(note => 
                note !== null && note !== undefined && note !== 'null' && note !== ''
              );
            }
            // If parsed but not an array, return as single-item array if valid
            if (parsed !== null && parsed !== undefined && parsed !== 'null' && parsed !== '') {
              return [parsed];
            }
            return [];
          }
        } catch (e) {
          console.warn(`Failed to parse notes as JSON: "${notesStr}"`, e);
          // If JSON parsing fails, try comma-separated string
          if (typeof notesStr === 'string' && notesStr.includes(',')) {
            return notesStr.split(',')
              .map(n => n && typeof n.trim === 'function' ? n.trim() : n)
              .filter(n => n !== null && n !== undefined && n !== 'null' && n !== '');
          }
          
          // Single string value, if valid
          if (notesStr !== '' && typeof notesStr === 'string') {
            return [notesStr];
          }
        }
        
        // Default fallback
        return [];
      };
      
      setSelectedNotes({
        nose: parseNotes(data.nose),
        palate: parseNotes(data.palate),
        finish: parseNotes(data.finish)
      });
    } catch (error) {
      console.error('Error fetching spirit details:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      toast.error('Failed to load spirit details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value;
    const newSelectedCategory = spiritCategories.find(cat => cat.id === newCategory);
    
    setFormData(prev => ({ 
      ...prev, 
      category: newCategory,
      type: newSelectedCategory?.subcategories[0] || '' 
    }));
  };

  const handleNotesChange = (category: TastingNoteCategory, notes: string[]) => {
    // Ensure notes is always a valid array
    const validNotes = Array.isArray(notes) 
      ? notes.filter(note => note !== null && note !== undefined && note !== 'null' && note !== '')
      : [];
      
    // Update state with filtered array
    setSelectedNotes(prev => ({
      ...prev,
      [category]: validNotes
    }));
    
    // Update the formData with properly formatted JSON string
    setFormData(prev => ({
      ...prev,
      [category]: JSON.stringify(validNotes)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    
    try {
      // Create a clean object without any unexpected fields
      const updateData = {
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        type: formData.type,
        description: formData.description || undefined,
        proof: formData.proof ? parseFloat(formData.proof) : undefined,
        price: formData.price ? parseFloat(formData.price) : undefined,
        imageUrl: formData.imageUrl || undefined,
        bottleLevel: Number(formData.bottleLevel),
        rating: Number(formData.rating) || 0,
        releaseYear: formData.releaseYear ? formData.releaseYear : undefined,
        distillery: formData.distillery || undefined,
        bottleSize: formData.bottleSize || undefined,
        dateAcquired: formData.dateAcquired ? new Date(formData.dateAcquired).toISOString() : undefined,
        isFavorite,
        nose: JSON.stringify(selectedNotes.nose),
        palate: JSON.stringify(selectedNotes.palate),
        finish: JSON.stringify(selectedNotes.finish),
      };
      
      console.log('Submitting update data:', updateData);
      
      const cacheBreaker = `_t=${Date.now()}`;
      const response = await fetch(`/api/collection/${spiritId}?${cacheBreaker}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify(updateData),
      });
      
      let responseData;
      try {
        responseData = await response.json();
        console.log('Server response:', responseData);
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError);
        responseData = { error: 'Invalid server response' };
      }
      
      if (!response.ok) {
        const errorMessage = responseData.error || 'Failed to update spirit';
        console.error('Update failed:', errorMessage, responseData);
        if (responseData.details) {
          console.error('Validation errors:', responseData.details);
        }
        throw new Error(errorMessage);
      }
      
      toast.success('Spirit updated successfully');
      
      // Use router.replace to avoid keeping edit page in history
      router.replace(`/collection/spirit/${spiritId}`);
    } catch (error) {
      console.error('Error updating spirit:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
      toast.error(`Failed to update spirit: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, imageUrl: '' }));
  };

  // Function to search for bottle images
  const searchBottleImages = async () => {
    setIsImageSearchLoading(true);
    setImageSearchResults([]);
    setShowImageOptions(false);
    
    try {
      const queryParams = new URLSearchParams();
      
      // Build more precise search parameters
      if (formData.name) queryParams.append('name', formData.name.trim());
      if (formData.brand) queryParams.append('brand', formData.brand.trim());
      if (formData.type) queryParams.append('type', formData.type.trim());
      
      // Extract year if available
      if (formData.releaseYear) {
        queryParams.append('year', formData.releaseYear.toString());
      }
      
      // Add a cache-busting random parameter to ensure fresh results
      queryParams.append('_cb', Date.now().toString());
      
      // Log what we're searching for
      console.log(`Searching for bottle images with params:`, Object.fromEntries(queryParams.entries()));
      
      const apiUrl = `/api/spirits/google-image-search?${queryParams.toString()}`;
      console.log(`[Client] Requesting image search URL: ${apiUrl}`);
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Image search error response:', errorText);
        throw new Error(`Failed to fetch bottle images: ${response.status} ${response.statusText}`);
      }
      
      const searchResponse: GoogleImageSearchResponse = await response.json();
      console.log(`Received ${searchResponse.images?.length || 0} image results for query: ${searchResponse.query}`);
      
      if (searchResponse.images && searchResponse.images.length > 0) {
        // Filter out any invalid URLs before setting state
        const validImages = searchResponse.images
          .filter(img => {
            try {
              new URL(img.url);
              return true;
            } catch {
              console.warn(`Invalid image URL: ${img.url}`);
              return false;
            }
          })
          // Limit to 10 images max
          .slice(0, 10);
        
        if (validImages.length > 0) {
          setImageSearchResults(validImages);
          setShowImageOptions(true);
          toast.success(`Found ${validImages.length} potential bottle images`);
        } else {
          toast.error('No valid bottle images found');
        }
      } else {
        toast.error('No bottle images found');
      }
    } catch (error) {
      console.error('Error searching for bottle images:', error);
      toast.error('Failed to search for bottle images');
    } finally {
      setIsImageSearchLoading(false);
    }
  };
  
  // Function to update the bottle image
  const updateBottleImage = (imageUrl: string) => {
    setFormData(prev => ({ ...prev, imageUrl }));
    setSelectedImageUrl(null);
    setShowImageOptions(false);
    toast.success('Image selected');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-t-2 border-amber-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !spirit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-red-500 mb-4">{error || 'Failed to load spirit details'}</div>
        <Link href="/collection" className="flex items-center text-amber-500 hover:underline">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Background image with overlay */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10"></div>
        <div className="fixed inset-0 overflow-hidden">
          <img 
            src="/images/backgrounds/Collection background/collection_background.jpg?v=1" 
            alt="Collection background" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      {/* Noise texture overlay */}
      <div className="fixed inset-0 opacity-20 mix-blend-overlay pointer-events-none z-10" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
      ></div>
      
      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 py-12 pt-24">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link 
              href={`/collection/spirit/${spiritId}`} 
              className="inline-flex items-center bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-md transition-colors text-base font-medium shadow-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
            <h1 className="text-xl font-medium text-white">Editing {spirit.name}</h1>
          </div>
          
          <div>
            <button 
              type="submit" 
              form="edit-spirit-form"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md shadow-lg flex items-center"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </header>

        <form id="edit-spirit-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
              <h2 className="text-lg font-medium mb-4">Basic Information</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="brand" className="block text-sm mb-1">
                    Brand <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="brand"
                    name="brand"
                    type="text"
                    value={formData.brand}
                    onChange={handleChange}
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="category" className="block text-sm mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleCategoryChange}
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 appearance-none"
                  >
                    {spiritCategories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="type" className="block text-sm mb-1">
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    required
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 appearance-none"
                  >
                    {typeOptions.map(type => (
                      <option key={type} value={type.toLowerCase()}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Bottle Image */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
              <h2 className="text-lg font-medium mb-4">Bottle Image</h2>
              
              {formData.imageUrl ? (
                <div className="relative mb-4">
                  <img 
                    src={formData.imageUrl} 
                    alt={formData.name} 
                    className="w-full h-48 object-contain rounded mx-auto"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-red-500 rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-600 rounded-lg h-48 flex items-center justify-center mb-4">
                  <p className="text-gray-400">No image</p>
                </div>
              )}
              
              <button
                type="button"
                onClick={searchBottleImages}
                disabled={isImageSearchLoading}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2 rounded flex items-center justify-center"
              >
                {isImageSearchLoading ? (
                  <>
                    <div className="w-4 h-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Find Bottle Images
                  </>
                )}
              </button>
            </div>
            
            {/* Image Search Results Modal */}
            {showImageOptions && imageSearchResults.length > 0 && (
              <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 rounded-lg p-6 max-w-5xl w-full max-h-[90vh] overflow-auto">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Select Bottle Image</h2>
                    <button 
                      onClick={() => setShowImageOptions(false)}
                      className="p-1 hover:bg-gray-700 rounded-full"
                    >
                      <X className="w-6 h-6 text-gray-400 hover:text-white" />
                    </button>
                  </div>
                  
                  <p className="text-gray-300 mb-2">
                    Found {imageSearchResults.length} potential images for {formData.brand} {formData.name}.
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    Select the image that best represents this bottle in your collection.
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                    {imageSearchResults.map((image, index) => (
                      <div 
                        key={index}
                        className={`relative rounded-lg overflow-hidden border-2 hover:border-amber-500 cursor-pointer transition-all ${
                          selectedImageUrl === image.url ? 'border-amber-500 shadow-lg shadow-amber-500/30 scale-[1.02]' : 'border-transparent'
                        }`}
                        onClick={() => setSelectedImageUrl(image.url)}
                      >
                        <div className="aspect-[3/4] bg-white relative">
                          {/* Loading spinner */}
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400 bg-white/60">
                            <div className="w-8 h-8 border-t-2 border-b-2 border-gray-400 rounded-full animate-spin"></div>
                          </div>
                          
                          {/* Image with fallback handling */}
                          <img 
                            src={image.url} 
                            alt={image.alt}
                            className="w-full h-full object-contain p-2 relative z-10"
                            loading="lazy"
                            onLoad={(e) => {
                              // Hide spinner when image loads
                              const target = e.target as HTMLImageElement;
                              const parent = target.parentElement;
                              if (parent) {
                                const spinner = parent.querySelector('div.flex');
                                if (spinner) {
                                  spinner.classList.add('hidden');
                                }
                              }
                            }}
                            onError={(e) => {
                              // Handle broken images
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                const spinner = parent.querySelector('div.flex');
                                if (spinner) {
                                  spinner.innerHTML = '<div class="text-gray-400">Image unavailable</div>';
                                }
                              }
                            }}
                          />
                        </div>
                        
                        {/* Selected indicator */}
                        {selectedImageUrl === image.url && (
                          <div className="absolute top-2 right-2 bg-amber-500 rounded-full p-1.5 shadow-md z-20">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end border-t border-gray-700 pt-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowImageOptions(false)}
                        className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => selectedImageUrl && updateBottleImage(selectedImageUrl)}
                        disabled={!selectedImageUrl}
                        className={`px-6 py-2 rounded-md flex items-center justify-center min-w-[120px] transition-colors ${
                          selectedImageUrl 
                            ? 'bg-amber-500 hover:bg-amber-600 text-white' 
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {selectedImageUrl ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Select
                          </>
                        ) : 'Select an Image'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Details */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
              <h2 className="text-lg font-medium mb-4">Details</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="proof" className="block text-sm mb-1">
                    Proof
                  </label>
                  <input
                    id="proof"
                    name="proof"
                    type="number"
                    value={formData.proof}
                    onChange={handleChange}
                    step="0.1"
                    min="0"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="price" className="block text-sm mb-1">
                    Price ($)
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    value={formData.price}
                    onChange={handleChange}
                    step="0.01"
                    min="0"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="rating" className="block text-sm mb-1">
                    Rating (1-10, decimals allowed)
                  </label>
                  <input
                    id="rating"
                    name="rating"
                    type="number"
                    value={formData.rating}
                    onChange={handleChange}
                    min="1"
                    max="10"
                    step="0.1"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="distillery" className="block text-sm mb-1">
                    Distillery
                  </label>
                  <input
                    id="distillery"
                    name="distillery"
                    type="text"
                    value={formData.distillery}
                    onChange={handleChange}
                    placeholder="E.g., Buffalo Trace"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="releaseYear" className="block text-sm mb-1">
                    Release Year
                  </label>
                  <input
                    id="releaseYear"
                    name="releaseYear"
                    type="number"
                    value={formData.releaseYear}
                    onChange={handleChange}
                    placeholder={`e.g. ${new Date().getFullYear()}`}
                    min="1700"
                    max={new Date().getFullYear()}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="dateAcquired" className="block text-sm mb-1">
                    Date Acquired
                  </label>
                  <input
                    id="dateAcquired"
                    name="dateAcquired"
                    type="date"
                    value={formData.dateAcquired}
                    onChange={handleChange}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                
                <div>
                  <label htmlFor="bottleSize" className="block text-sm mb-1">
                    Bottle Size
                  </label>
                  <input
                    id="bottleSize"
                    name="bottleSize"
                    type="text"
                    value={formData.bottleSize}
                    onChange={handleChange}
                    placeholder="E.g., 750ml"
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isFavorite"
                  checked={isFavorite}
                  onChange={() => setIsFavorite(!isFavorite)}
                  className="w-4 h-4 bg-gray-700 border-gray-600 rounded focus:ring-amber-500 text-amber-500"
                />
                <label htmlFor="isFavorite" className="ml-2 text-sm">
                  Add to favorites
                </label>
              </div>
              
              {/* Bottle Level */}
              <div className="mt-4">
                <label htmlFor="bottleLevel" className="block text-sm mb-1">
                  Bottle Level ({formData.bottleLevel}%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    id="bottleLevel"
                    name="bottleLevel"
                    min="0"
                    max="100"
                    step="1"
                    value={formData.bottleLevel}
                    onChange={handleChange}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-12 flex-shrink-0">
                    <BottleLevelIndicator 
                      level={formData.bottleLevel} 
                      size="sm"
                      compact={true}
                      interactive={false}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Empty</span>
                  <span>Full</span>
                </div>
              </div>
            </div>
            
            {/* Tasting Notes */}
            <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6 md:col-span-2">
              <h2 className="text-lg font-medium mb-4">Tasting Notes</h2>
              
              <div className="space-y-4">
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
            </div>
          </div>
        </form>
      </div>
    </div>
  );
} 