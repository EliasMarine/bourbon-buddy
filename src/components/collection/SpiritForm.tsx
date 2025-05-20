'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, Search } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import SimpleBottleLevelSlider from '@/components/ui/SimpleBottleLevelSlider';
import { useDebouncedCallback } from 'use-debounce';

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

// Mock API response type
interface SpiritSearchResult {
  name: string;
  brand: string;
  type: string;
  description?: string;
  proof?: number | null;
  price?: number | null;
  country?: string | null;
  region?: string | null;
  distillery?: string | null;
  releaseYear?: number | null;
  imageUrl?: string;
}

export function SpiritForm({ spirit, onSuccess }: SpiritFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(spirit?.imageUrl || null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SpiritSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoSearchEnabled, setAutoSearchEnabled] = useState(true);
  
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
  
  // Debounced search function to avoid too many API calls
  const debouncedSearch = useDebouncedCallback(async (query: string) => {
    if (!query || query.length < 3 || !autoSearchEnabled) return;
    
    setIsSearching(true);
    try {
      // Use SerpAPI to get real data
      const serpApiKey = process.env.NEXT_PUBLIC_SERPAPI_KEY;
      if (!serpApiKey) {
        console.warn('SerpAPI key not found, using mock data');
        const results = await getMockSearchResults(query);
        setSearchResults(results);
        setShowResults(results.length > 0);
      } else {
        const response = await fetch(`https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query + " whiskey bourbon details")}&api_key=${serpApiKey}`);
        
        if (!response.ok) {
          throw new Error(`SerpAPI returned ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extract structured data from search results
        // This parsing logic will need to be adjusted based on the actual response format
        const organicResults = data.organic_results || [];
        const knowledgeGraph = data.knowledge_graph || {};
        
        // Process knowledge graph if available (best case)
        if (knowledgeGraph.title) {
          const result: SpiritSearchResult = {
            name: knowledgeGraph.title || query,
            brand: knowledgeGraph.brand || extractBrandFromTitle(knowledgeGraph.title) || "",
            type: extractType(knowledgeGraph.type || knowledgeGraph.category || ""),
            description: knowledgeGraph.description || "",
            proof: extractProof(knowledgeGraph.description || ""),
            price: extractPrice(knowledgeGraph.price || ""),
            country: extractCountry(knowledgeGraph.description || ""),
            region: extractRegion(knowledgeGraph.description || ""),
            distillery: knowledgeGraph.manufacturer || knowledgeGraph.distillery || "",
            releaseYear: extractYear(knowledgeGraph.description || ""),
            imageUrl: knowledgeGraph.image || ""
          };
          
          setSearchResults([result]);
          setShowResults(true);
        }
        
        // Process organic results as fallback
        // This is more complex and less reliable than knowledge graph data
        const results = organicResults.slice(0, 3).map((result: any) => {
          const title = result.title || "";
          return {
            name: extractName(title),
            brand: extractBrandFromTitle(title),
            type: extractTypeFromTitle(title),
            description: result.snippet || "",
            imageUrl: result.thumbnail || "",
            // Other fields would need more complex extraction logic
            proof: null,
            price: null,
            country: null,
            region: null,
            distillery: null,
            releaseYear: null
          };
        });
        
        setSearchResults(results);
        setShowResults(results.length > 0);
      }
    } catch (error) {
      console.error("Error fetching from SerpAPI:", error);
      // Fallback to mock data if API fails
      const results = await getMockSearchResults(query);
      setSearchResults(results);
      setShowResults(results.length > 0);
    } finally {
      setIsSearching(false);
    }
  }, 500); // 500ms debounce
  
  // Helper functions for extracting info from search results
  const extractBrandFromTitle = (title: string): string => {
    // Common bourbon/whiskey brands
    const brands = [
      "Buffalo Trace", "Blanton's", "Maker's Mark", "Woodford Reserve", 
      "Four Roses", "Wild Turkey", "Jim Beam", "Knob Creek", "Eagle Rare",
      "Lagavulin", "Macallan", "Glenfiddich", "Glenlivet", "Jack Daniel's",
      "Bulleit", "Johnnie Walker", "Jameson", "Crown Royal", "Suntory", "Nikka"
    ];
    
    for (const brand of brands) {
      if (title.includes(brand)) {
        return brand;
      }
    }
    
    return "";
  };
  
  const extractName = (title: string): string => {
    // Remove common suffixes and clean up the title
    return title
      .replace(/( - | \| |: ).*$/, '')
      .replace(/(\d+ years old|\d+yo|aged \d+ years)/i, '')
      .trim();
  };
  
  const extractTypeFromTitle = (title: string): string => {
    const types = [
      { keywords: ["bourbon"], value: "Bourbon" },
      { keywords: ["scotch", "single malt"], value: "Scotch" },
      { keywords: ["rye"], value: "Rye" },
      { keywords: ["japanese"], value: "Japanese" },
      { keywords: ["irish"], value: "Irish" },
      { keywords: ["canadian"], value: "Canadian" }
    ];
    
    for (const type of types) {
      for (const keyword of type.keywords) {
        if (title.toLowerCase().includes(keyword)) {
          return type.value;
        }
      }
    }
    
    if (title.toLowerCase().includes("whiskey") || title.toLowerCase().includes("whisky")) {
      return "Whiskey";
    }
    
    return "Other";
  };
  
  const extractType = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes("bourbon")) return "Bourbon";
    if (lowerType.includes("scotch") || lowerType.includes("single malt")) return "Scotch";
    if (lowerType.includes("rye")) return "Rye";
    if (lowerType.includes("japanese")) return "Japanese";
    if (lowerType.includes("irish")) return "Irish";
    if (lowerType.includes("canadian")) return "Canadian";
    if (lowerType.includes("whiskey") || lowerType.includes("whisky")) return "Whiskey";
    return "Other";
  };
  
  const extractProof = (text: string): number | null => {
    // Look for proof or ABV patterns
    const proofMatch = text.match(/(\d+(?:\.\d+)?)\s*proof/i);
    if (proofMatch) return parseFloat(proofMatch[1]);
    
    const abvMatch = text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:abv|alcohol)/i);
    if (abvMatch) return parseFloat(abvMatch[1]) * 2; // Convert ABV to proof (roughly)
    
    return null;
  };
  
  const extractPrice = (text: string): number | null => {
    const priceMatch = text.match(/\$(\d+(?:\.\d+)?)/);
    return priceMatch ? parseFloat(priceMatch[1]) : null;
  };
  
  const extractCountry = (text: string): string | null => {
    const countries = ["USA", "Scotland", "Japan", "Ireland", "Canada"];
    for (const country of countries) {
      if (text.includes(country)) return country;
    }
    return null;
  };
  
  const extractRegion = (text: string): string | null => {
    const regions = [
      "Kentucky", "Tennessee", "Islay", "Speyside", "Highland", "Lowland", 
      "Campbeltown", "Islands"
    ];
    for (const region of regions) {
      if (text.includes(region)) return region;
    }
    return null;
  };
  
  const extractYear = (text: string): number | null => {
    const yearMatch = text.match(/(?:released|bottled|distilled).*?in (\d{4})/i);
    return yearMatch ? parseInt(yearMatch[1]) : null;
  };
  
  // Fallback to mock data
  const getMockSearchResults = async (query: string): Promise<SpiritSearchResult[]> => {
    // Simulate API call delay
    // Example data - in a real app, this would come from your API
    const mockDatabase: SpiritSearchResult[] = [
      {
        name: "Eagle Rare 10 Year",
        brand: "Buffalo Trace",
        type: "Bourbon",
        description: "A classic Kentucky straight bourbon whiskey aged for 10 years, known for its complex flavor profile.",
        proof: 90,
        price: 39.99,
        country: "USA",
        region: "Kentucky",
        distillery: "Buffalo Trace Distillery",
        releaseYear: 2022,
        imageUrl: "https://www.masterofmalt.com/whiskies/eagle-rare/eagle-rare-10-year-old-whiskey/1-litre/"
      },
      {
        name: "Blanton's Original",
        brand: "Blanton's",
        type: "Bourbon",
        description: "The first commercially available single barrel bourbon, with a distinctive bottle and stopper.",
        proof: 93,
        price: 64.99,
        country: "USA",
        region: "Kentucky",
        distillery: "Buffalo Trace Distillery",
        releaseYear: 2021,
        imageUrl: "https://www.masterofmalt.com/whiskies/blantons/blantons-original-single-barrel-bourbon-whiskey/"
      },
      {
        name: "Lagavulin 16",
        brand: "Lagavulin",
        type: "Scotch",
        description: "An intense, smoky Islay single malt with rich, deep flavors.",
        proof: 86,
        price: 89.99,
        country: "Scotland",
        region: "Islay",
        distillery: "Lagavulin Distillery",
        releaseYear: 2020,
        imageUrl: "https://www.masterofmalt.com/whiskies/lagavulin/lagavulin-16-year-old-whisky/"
      },
      {
        name: "Maker's Mark",
        brand: "Maker's Mark",
        type: "Bourbon",
        description: "A wheated bourbon known for its red wax seal and smooth flavor profile.",
        proof: 90,
        price: 29.99,
        country: "USA",
        region: "Kentucky",
        distillery: "Maker's Mark Distillery",
        releaseYear: 2022,
        imageUrl: "https://www.masterofmalt.com/whiskies/makers-mark-whisky/"
      }
    ];
    
    // Filter based on the query (case insensitive)
    const lowercaseQuery = query.toLowerCase();
    return mockDatabase.filter(
      item => 
        item.name.toLowerCase().includes(lowercaseQuery) || 
        item.brand.toLowerCase().includes(lowercaseQuery) ||
        (item.distillery && item.distillery.toLowerCase().includes(lowercaseQuery))
    );
  };
  
  // Apply search result to form
  const applySearchResult = (result: SpiritSearchResult) => {
    form.setValue('name', result.name);
    form.setValue('brand', result.brand);
    form.setValue('type', result.type);
    
    if (result.description) form.setValue('description', result.description);
    if (result.proof) form.setValue('proof', result.proof);
    if (result.price) form.setValue('price', result.price);
    if (result.country) form.setValue('country', result.country);
    if (result.region) form.setValue('region', result.region);
    if (result.distillery) form.setValue('distillery', result.distillery);
    if (result.releaseYear) form.setValue('releaseYear', result.releaseYear);
    
    if (result.imageUrl) {
      form.setValue('imageUrl', result.imageUrl);
      setPreviewUrl(result.imageUrl);
    }
    
    setShowResults(false);
  };
  
  // Watch the name field for auto-search
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'name' || name === 'brand' || name === 'distillery') {
        const query = value.name || '';
        setSearchQuery(query);
        debouncedSearch(query);
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form.watch, debouncedSearch]);
  
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
  
  // Manually trigger search
  const handleManualSearch = () => {
    const query = form.getValues('name');
    if (query) {
      debouncedSearch.flush(); // Immediately perform the search
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          {/* Auto Search Toggle */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="autoSearch"
                checked={autoSearchEnabled}
                onChange={(e) => setAutoSearchEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              <label htmlFor="autoSearch" className="text-sm font-medium text-amber-100">
                Enable Auto Search
              </label>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={handleManualSearch}
              className="flex items-center space-x-1 border-amber-800/30 hover:bg-amber-800/20 text-amber-100"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Button>
          </div>
          
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>Name <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. Eagle Rare 10 Year" 
                        {...field} 
                        className="bg-white text-black placeholder:text-black border-gray-300"
                      />
                    </FormControl>
                    <FormMessage />
                    
                    {/* Search Results Dropdown */}
                    {showResults && searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        <ul className="py-1 text-black">
                          {searchResults.map((result, index) => (
                            <li 
                              key={index}
                              className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                              onClick={() => applySearchResult(result)}
                            >
                              <div>
                                <div className="font-medium">{result.name}</div>
                                <div className="text-sm text-gray-600">
                                  {result.brand} · {result.type}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {isSearching && (
                      <div className="text-sm text-amber-400 mt-1 flex items-center">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Searching...
                      </div>
                    )}
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
                        className="bg-white text-black placeholder:text-black border-gray-300"
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
                          <SelectValue placeholder="Select spirit type" className="text-black" />
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
                          <SelectValue placeholder="Select category" className="text-black" />
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
                      className="min-h-[100px] bg-white text-black placeholder:text-black border-gray-300"
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
                        className="bg-white text-black placeholder:text-black border-gray-300"
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
                        className="bg-white text-black placeholder:text-black border-gray-300"
                      />
                    </FormControl>
                    <FormDescription className="text-black">Spirit proof (e.g., 80, 90.5, 100)</FormDescription>
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
                        className="bg-white text-black placeholder:text-black border-gray-300"
                      />
                    </FormControl>
                    <FormDescription className="text-black">Enter a rating from 0 to 10</FormDescription>
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
                          <SelectValue placeholder="Select country" className="text-black" />
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
                        className="bg-white text-black placeholder:text-black border-gray-300"
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
                        className="bg-white text-black placeholder:text-black border-gray-300"
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
                        className="bg-white text-black placeholder:text-black border-gray-300"
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
                  <FormDescription className="text-center text-black">
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
                      className="bg-white text-black placeholder:text-black border-gray-300"
                    />
                  </FormControl>
                  <FormDescription className="text-black">
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