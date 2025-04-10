'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSupabaseSession } from '@/hooks/use-supabase-session';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, Loader2, Upload, X 
} from 'lucide-react';
import { SpiritSchema, type SpiritFormData } from '@/lib/validations/spirit';
import spiritCategories from '@/lib/spiritCategories';
import TastingNotesSelector, { TastingNoteCategory } from '@/components/collection/TastingNotesSelector';
import { validateFile, sanitizeHtml } from '@/lib/utils';

interface EditSpiritData extends SpiritFormData {
  id?: string;
}

// Component that uses useSearchParams wrapped in its own function
function AddSpiritForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEditMode = searchParams.get('edit') === 'true';
  const { data: session, status } = useSupabaseSession({ required: true });
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('whiskey');
  const [spiritId, setSpiritId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedNotes, setSelectedNotes] = useState<{
    nose: string[];
    palate: string[];
    finish: string[];
  }>({
    nose: [],
    palate: [],
    finish: []
  });
  
  // Get filtered subcategories based on selected category
  const filteredSubcategories = spiritCategories.find(cat => cat.id === selectedCategory)?.subcategories || [];

  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<SpiritFormData>({
    resolver: zodResolver(SpiritSchema),
    defaultValues: {
      category: 'whiskey',
      isFavorite: false,
      bottleLevel: 100,
    }
  });

  // Load spirit data from localStorage if in edit mode
  useEffect(() => {
    if (isEditMode) {
      try {
        const storedData = localStorage.getItem('editSpiritData');
        if (storedData) {
          const spiritData = JSON.parse(storedData) as EditSpiritData;
          setSpiritId(spiritData.id || null);
          
          // Populate form with spirit data
          Object.entries(spiritData).forEach(([key, value]) => {
            if (value !== undefined && value !== null && key !== 'id' && key !== 'ownerId') {
              // @ts-ignore - dynamically setting form values
              setValue(key, value);
            }
          });
          
          // Set image URL if available
          if (spiritData.imageUrl) {
            setImageUrl(spiritData.imageUrl);
          }
          
          // Set category
          if (spiritData.category) {
            setSelectedCategory(spiritData.category);
          }
        }
      } catch (error) {
        console.error('Error loading spirit data for editing:', error);
        toast.error('Failed to load spirit data for editing');
      }
    }
    
    // Clean up localStorage on unmount
    return () => {
      localStorage.removeItem('editSpiritData');
    };
  }, [isEditMode, setValue]);

  // Watch the category field to update subcategories
  const categoryValue = watch('category');
  if (categoryValue !== selectedCategory) {
    setSelectedCategory(categoryValue);
    // Reset type when category changes
    setValue('type', '');
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid && validation.error) {
      toast.error(validation.error);
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload image to your API endpoint
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      setImageUrl(data.url);
      setValue('imageUrl', data.url);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setImageUrl(null);
    setValue('imageUrl', null);
  };

  const handleNotesChange = (category: TastingNoteCategory, notes: string[]) => {
    setSelectedNotes(prev => ({
      ...prev,
      [category]: notes
    }));
    
    // Update the form values as well
    setValue(category, JSON.stringify(notes));
  };

  const onSubmit = async (formData: SpiritFormData) => {
    setIsLoading(true);
    
    try {
      // Determine if this is an add or update operation
      const method = isEditMode ? 'PUT' : 'POST';
      const endpoint = isEditMode ? `/api/collection/${spiritId}` : '/api/collection';
      
      console.log('Submitting with method:', method);
      console.log('Endpoint:', endpoint);
      console.log('Spirit ID:', spiritId);
      
      // Process data to ensure types are correct and sanitize text inputs
      const preparedData = {
        ...formData,
        // Sanitize text inputs
        name: sanitizeHtml(formData.name),
        brand: sanitizeHtml(formData.brand),
        description: formData.description ? sanitizeHtml(formData.description) : null,
        distillery: formData.distillery ? sanitizeHtml(formData.distillery) : null,
        notes: formData.notes ? sanitizeHtml(formData.notes) : null,
        // Ensure these boolean values are explicitly set
        isFavorite: Boolean(formData.isFavorite),
        // Ensure these are numbers or null
        bottleLevel: formData.bottleLevel !== undefined ? Number(formData.bottleLevel) : null,
        proof: formData.proof !== undefined ? Number(formData.proof) : null,
        price: formData.price !== undefined ? Number(formData.price) : null,
        rating: formData.rating !== undefined ? Number(formData.rating) : null,
        // Ensure these are strings or null
        imageUrl: formData.imageUrl || null,
        nose: JSON.stringify(selectedNotes.nose),
        palate: JSON.stringify(selectedNotes.palate),
        finish: JSON.stringify(selectedNotes.finish),
        bottleSize: formData.bottleSize || null,
        dateAcquired: formData.dateAcquired || null
      };
      
      console.log('Prepared data:', preparedData);
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preparedData),
      });

      const responseData = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', responseData);

      if (!response.ok) {
        // If there's a validation error, show the details
        if (responseData.details) {
          const errorMessage = Array.isArray(responseData.details) 
            ? responseData.details.map((e: any) => e.message).join(', ') 
            : responseData.error;
          throw new Error(errorMessage);
        }
        
        throw new Error(responseData.error || (isEditMode ? 'Failed to update spirit' : 'Failed to add spirit'));
      }

      toast.success(isEditMode ? 'Spirit updated successfully' : 'Spirit added successfully');
      
      // Navigate back to the appropriate page
      if (isEditMode) {
        router.push(`/collection/spirit/${spiritId}`);
      } else {
        router.push('/collection');
      }
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'adding'} spirit:`, error);
      toast.error(error instanceof Error ? error.message : (isEditMode ? 'Failed to update spirit' : 'Failed to add spirit'));
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      <div className="max-w-3xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white mr-4"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">
            {isEditMode ? 'Edit Spirit' : 'Add to Collection'}
          </h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-6">
              {/* Basic Info Section */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      id="name"
                      {...register('name')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="E.g., Eagle Rare 10 Year"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-400">{errors.name.message}</p>
                    )}
                  </div>
                  
                  {/* Brand */}
                  <div>
                    <label htmlFor="brand" className="block text-sm font-medium text-gray-300 mb-1">
                      Brand *
                    </label>
                    <input
                      id="brand"
                      {...register('brand')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="E.g., Buffalo Trace"
                    />
                    {errors.brand && (
                      <p className="mt-1 text-sm text-red-400">{errors.brand.message}</p>
                    )}
                  </div>
                  
                  {/* Category */}
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium text-gray-300 mb-1">
                      Category *
                    </label>
                    <select
                      id="category"
                      {...register('category')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {spiritCategories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    {errors.category && (
                      <p className="mt-1 text-sm text-red-400">{errors.category.message}</p>
                    )}
                  </div>
                  
                  {/* Type */}
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">
                      Type *
                    </label>
                    <select
                      id="type"
                      {...register('type')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Select a type</option>
                      {filteredSubcategories.map(subcat => (
                        <option key={subcat} value={subcat}>
                          {subcat}
                        </option>
                      ))}
                    </select>
                    {errors.type && (
                      <p className="mt-1 text-sm text-red-400">{errors.type.message}</p>
                    )}
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      {...register('description')}
                      rows={3}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="Brief description of the spirit"
                    />
                    {errors.description && (
                      <p className="mt-1 text-sm text-red-400">{errors.description.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Image Upload */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Bottle Image</h2>
                <div className="flex flex-col items-center justify-center">
                  {imageUrl ? (
                    <div className="relative w-full h-48 mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="Bottle preview"
                        className="w-full h-full object-contain rounded"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-48 border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center mb-3">
                      {uploading ? (
                        <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-2" />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-400">Click to upload an image</p>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium ${
                      imageUrl
                        ? 'text-amber-800 bg-amber-100 hover:bg-amber-200'
                        : 'text-white bg-amber-600 hover:bg-amber-700'
                    } cursor-pointer ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {imageUrl ? 'Change Image' : 'Upload Image'}
                  </label>
                </div>
              </div>

              {/* Details */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Details</h2>
                <div className="grid grid-cols-2 gap-4">
                  {/* Proof */}
                  <div>
                    <label htmlFor="proof" className="block text-sm font-medium text-gray-300 mb-1">
                      Proof
                    </label>
                    <input
                      id="proof"
                      type="number"
                      step="0.1"
                      {...register('proof', { valueAsNumber: true })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="E.g., 90"
                    />
                    {errors.proof && (
                      <p className="mt-1 text-sm text-red-400">{errors.proof.message}</p>
                    )}
                  </div>
                  
                  {/* Price */}
                  <div>
                    <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-1">
                      Price ($)
                    </label>
                    <input
                      id="price"
                      type="number"
                      step="0.01"
                      {...register('price', { valueAsNumber: true })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="E.g., 59.99"
                    />
                    {errors.price && (
                      <p className="mt-1 text-sm text-red-400">{errors.price.message}</p>
                    )}
                  </div>
                  
                  {/* Rating */}
                  <div>
                    <label htmlFor="rating" className="block text-sm font-medium text-gray-300 mb-1">
                      Rating (1-10)
                    </label>
                    <input
                      id="rating"
                      type="number"
                      min="1"
                      max="10"
                      step="1"
                      {...register('rating', { valueAsNumber: true })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="E.g., 8"
                    />
                    {errors.rating && (
                      <p className="mt-1 text-sm text-red-400">{errors.rating.message}</p>
                    )}
                  </div>
                  
                  {/* Distillery */}
                  <div>
                    <label htmlFor="distillery" className="block text-sm font-medium text-gray-300 mb-1">
                      Distillery
                    </label>
                    <input
                      id="distillery"
                      {...register('distillery')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="E.g., Buffalo Trace Distillery"
                    />
                  </div>
                  
                  {/* Date Acquired */}
                  <div>
                    <label htmlFor="dateAcquired" className="block text-sm font-medium text-gray-300 mb-1">
                      Date Acquired
                    </label>
                    <input
                      id="dateAcquired"
                      type="date"
                      {...register('dateAcquired')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  
                  {/* Bottle Size */}
                  <div>
                    <label htmlFor="bottleSize" className="block text-sm font-medium text-gray-300 mb-1">
                      Bottle Size
                    </label>
                    <input
                      id="bottleSize"
                      {...register('bottleSize')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      placeholder="E.g., 750ml"
                    />
                  </div>
                  
                  {/* Favorite */}
                  <div className="col-span-2">
                    <div className="flex items-center">
                      <input
                        id="isFavorite"
                        type="checkbox"
                        {...register('isFavorite')}
                        className="h-4 w-4 text-amber-500 focus:ring-amber-500 rounded"
                      />
                      <label htmlFor="isFavorite" className="ml-2 block text-sm text-gray-300">
                        Add to favorites
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tasting Notes Section */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Tasting Notes</h2>
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
          
          {/* Submit button */}
          <div className="flex justify-end mt-8">
            <button
              type="submit"
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-600 text-white py-2 px-6 rounded-md font-medium flex items-center disabled:opacity-70"
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditMode ? 'Update Spirit' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function AddSpiritPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    }>
      <AddSpiritForm />
    </Suspense>
  );
} 