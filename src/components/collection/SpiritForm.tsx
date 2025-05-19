'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { spiritSchema, Spirit } from '@/lib/validations/spirit';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import SimpleBottleLevelSlider from '@/components/ui/SimpleBottleLevelSlider';

// Form schema for client-side validation
const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  brand: z.string().min(1, "Brand is required").max(100),
  type: z.string().min(1, "Type is required").max(50),
  category: z.string().max(50).default("whiskey"),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  proof: z.number().nonnegative().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  rating: z.number().min(0).max(10).nullable().optional(),
  nose: z.string().max(1000).nullable().optional(),
  palate: z.string().max(1000).nullable().optional(),
  finish: z.string().max(1000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  dateAcquired: z.string().nullable().optional(),
  bottleSize: z.string().max(50).nullable().optional(),
  distillery: z.string().max(100).nullable().optional(),
  bottleLevel: z.number().min(0).max(100).nullable().optional(),
  isFavorite: z.boolean().default(false),
  country: z.string().max(50).nullable().optional(),
  region: z.string().max(50).nullable().optional(),
  releaseYear: z.number().positive().int().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface SpiritFormProps {
  spirit?: Partial<Spirit>; // For editing existing spirit
  onSuccess?: () => void;
}

export function SpiritForm({ spirit, onSuccess }: SpiritFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(spirit?.imageUrl || null);
  
  // Initialize form with default values or existing spirit
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: spirit?.name || '',
      brand: spirit?.brand || '',
      type: spirit?.type || '',
      category: spirit?.category || 'whiskey',
      description: spirit?.description || '',
      price: spirit?.price || null,
      proof: spirit?.proof || null,
      rating: spirit?.rating ? spirit.rating / 10 : null, // Convert from 0-100 to 0-10 scale for form
      imageUrl: spirit?.imageUrl || '',
      country: spirit?.country || '',
      region: spirit?.region || '',
      releaseYear: spirit?.releaseYear || null,
      bottleSize: spirit?.bottleSize || '',
      distillery: spirit?.distillery || '',
      bottleLevel: spirit?.bottleLevel ?? 100,
      isFavorite: spirit?.isFavorite || false,
      nose: spirit?.nose || '',
      palate: spirit?.palate || '',
      finish: spirit?.finish || '',
      notes: spirit?.notes || '',
      dateAcquired: spirit?.dateAcquired || new Date().toISOString().split('T')[0],
    },
  });
  
  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSubmitting(true);
      
      // Convert rating from 1-10 scale to 0-100 scale for DB
      const submitData = {
        ...data,
        id: spirit?.id || uuidv4(),
        rating: data.rating ? Math.round(data.rating * 10) : null,
      };
      
      // API endpoint and method depends on whether we're adding or editing
      const endpoint = spirit?.id 
        ? `/api/collection/${spirit.id}` 
        : `/api/collection`;
      const method = spirit?.id ? 'PATCH' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save spirit');
      }
      
      // Use your app's toast notification system
      console.log(`${spirit?.id ? 'Spirit updated' : 'Spirit added'}: ${data.name}`);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving spirit:', error);
      // Use your app's toast notification system
      console.error('Error:', error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle image URL change
  const handleImageUrlChange = (url: string) => {
    setPreviewUrl(url);
    form.setValue('imageUrl', url);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Eagle Rare 10 Year" 
                        {...field} 
                        className="bg-white text-black placeholder:text-gray-500 border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Buffalo Trace" 
                        {...field} 
                        className="bg-white text-black placeholder:text-gray-500 border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type <span className="text-red-500">*</span></FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white text-black border-gray-300">
                          <SelectValue placeholder="Select spirit type" className="text-gray-500" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white text-black">
                        <SelectItem value="Bourbon">Bourbon</SelectItem>
                        <SelectItem value="Scotch">Scotch</SelectItem>
                        <SelectItem value="Rye">Rye</SelectItem>
                        <SelectItem value="Irish">Irish</SelectItem>
                        <SelectItem value="Japanese">Japanese</SelectItem>
                        <SelectItem value="Canadian">Canadian</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white text-black border-gray-300">
                          <SelectValue placeholder="Select category" className="text-gray-500" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white text-black">
                        <SelectItem value="whiskey">Whiskey</SelectItem>
                        <SelectItem value="rum">Rum</SelectItem>
                        <SelectItem value="gin">Gin</SelectItem>
                        <SelectItem value="vodka">Vodka</SelectItem>
                        <SelectItem value="tequila">Tequila</SelectItem>
                        <SelectItem value="brandy">Brandy</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a description of this spirit..."
                      className="min-h-[100px] bg-white text-black placeholder:text-gray-500 border-gray-300"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Price and Rating Section */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium">Price and Rating</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="e.g. 39.99" 
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        className="bg-white text-black placeholder:text-gray-500 border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="proof"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proof</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.1"
                        placeholder="e.g. 90.0" 
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        className="bg-white text-black placeholder:text-gray-500 border-gray-300"
                      />
                    </FormControl>
                    <FormDescription>Spirit proof (e.g., 80, 90.5, 100)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating (1-10)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        max="10" 
                        step="0.1"
                        placeholder="e.g. 8.5" 
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        className="bg-white text-black placeholder:text-gray-500 border-gray-300"
                      />
                    </FormControl>
                    <FormDescription>Enter a rating from 0 to 10</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
          
          {/* Details Section */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium">Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value || ''}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white text-black border-gray-300">
                          <SelectValue placeholder="Select country" className="text-gray-500" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white text-black">
                        <SelectItem value="USA">USA</SelectItem>
                        <SelectItem value="Scotland">Scotland</SelectItem>
                        <SelectItem value="Ireland">Ireland</SelectItem>
                        <SelectItem value="Japan">Japan</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Kentucky" 
                        {...field} 
                        value={field.value || ''} 
                        className="bg-white text-black placeholder:text-gray-500 border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="distillery"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distillery</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Buffalo Trace Distillery" 
                        {...field} 
                        value={field.value || ''} 
                        className="bg-white text-black placeholder:text-gray-500 border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="releaseYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Release Year</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g. 2023" 
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        className="bg-white text-black placeholder:text-gray-500 border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Bottle Level Slider */}
            <FormField
              control={form.control}
              name="bottleLevel"
              render={({ field }) => (
                <FormItem className="col-span-1 md:col-span-2 mt-4">
                  <FormLabel>Bottle Level</FormLabel>
                  <FormControl>
                    <SimpleBottleLevelSlider
                      value={field.value ?? 100}
                      onChange={(value) => field.onChange(value)}
                      id="bottleLevel"
                    />
                  </FormControl>
                  <FormDescription className="text-center">
                    Set how full the bottle is (defaults to 100% for new bottles)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Image Section */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-medium">Image</h3>
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://example.com/image.jpg" 
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => handleImageUrlChange(e.target.value)}
                      className="bg-white text-black placeholder:text-gray-500 border-gray-300"
                    />
                  </FormControl>
                  <FormDescription>
                    Enter a URL for the bottle image
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {previewUrl && (
              <div className="flex justify-center">
                <div className="relative aspect-[3/4] h-[300px] overflow-hidden rounded-md border">
                  <Image
                    src={previewUrl}
                    alt="Bottle preview"
                    fill
                    sizes="(max-width: 768px) 100vw, 300px"
                    style={{ objectFit: 'contain' }}
                    onError={() => setPreviewUrl(null)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {spirit?.id ? 'Update Spirit' : 'Add to Collection'}
          </Button>
        </div>
      </form>
    </Form>
  );
} 