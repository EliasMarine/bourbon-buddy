'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { SpiritResponse, SpiritFilter } from '@/types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/select';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Loader2, Plus, Filter } from 'lucide-react';
import { SpiritForm } from './SpiritForm';
import { SpiritGrid } from './SpiritGrid';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function CollectionView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Form dialog state
  const [showFormDialog, setShowFormDialog] = useState(false);
  
  // Filter states
  const [name, setName] = useState(searchParams?.get('name') || '');
  const [type, setType] = useState(searchParams?.get('type') || '');
  const [country, setCountry] = useState(searchParams?.get('country') || '');
  const [minPrice, setMinPrice] = useState(searchParams?.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams?.get('maxPrice') || '');
  const [minProof, setMinProof] = useState(searchParams?.get('minProof') || '');
  const [maxProof, setMaxProof] = useState(searchParams?.get('maxProof') || '');
  
  // Pagination state
  const [page, setPage] = useState(Number(searchParams?.get('page')) || 1);
  
  // Sort state
  const [sortBy, setSortBy] = useState(searchParams?.get('sortBy') || 'createdAt');
  const [sortDir, setSortDir] = useState(searchParams?.get('sortDir') || 'desc');
  
  // Build query string from states
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (type) params.set('type', type);
    if (country) params.set('country', country);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (minProof) params.set('minProof', minProof);
    if (maxProof) params.set('maxProof', maxProof);
    if (page > 1) params.set('page', page.toString());
    params.set('sortBy', sortBy);
    params.set('sortDir', sortDir);
    return params.toString();
  };
  
  // Fetch data with SWR
  const { data, error, isLoading, mutate } = useSWR<SpiritResponse>(
    `/api/collection?${buildQueryString()}`,
    fetcher
  );
  
  // Handle filter changes
  const applyFilters = () => {
    setPage(1); // Reset to first page when filters change
    const queryString = buildQueryString();
    router.push(`/collection?${queryString}`);
  };
  
  // Handle form success
  const handleFormSuccess = () => {
    setShowFormDialog(false);
    mutate(); // Refresh data
  };
  
  // Handle pagination
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };
  
  const handleNextPage = () => {
    if (data && data.metadata && page < data.metadata.totalPages) {
      setPage(page + 1);
    }
  };
  
  // Handle sort change
  const handleSortChange = (value: string) => {
    // Split the value into field and direction
    const [field, direction] = value.split('-');
    setSortBy(field);
    setSortDir(direction);
  };
  
  return (
    <div className="space-y-6">
      {/* Filter Section */}
      <div className="sticky top-20 z-30 pb-4 pt-2 backdrop-blur-sm bg-background/80">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Filters</h2>
            <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Spirit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add to Collection</DialogTitle>
                </DialogHeader>
                <SpiritForm onSuccess={handleFormSuccess} />
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search by name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="Bourbon">Bourbon</SelectItem>
                  <SelectItem value="Scotch">Scotch</SelectItem>
                  <SelectItem value="Rye">Rye</SelectItem>
                  <SelectItem value="Irish">Irish</SelectItem>
                  <SelectItem value="Japanese">Japanese</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Countries</SelectItem>
                  <SelectItem value="USA">USA</SelectItem>
                  <SelectItem value="Scotland">Scotland</SelectItem>
                  <SelectItem value="Ireland">Ireland</SelectItem>
                  <SelectItem value="Japan">Japan</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Select 
                value={`${sortBy}-${sortDir}`} 
                onValueChange={handleSortChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Newest First</SelectItem>
                  <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                  <SelectItem value="price-asc">Price (Low-High)</SelectItem>
                  <SelectItem value="price-desc">Price (High-Low)</SelectItem>
                  <SelectItem value="rating-desc">Rating (High-Low)</SelectItem>
                  <SelectItem value="rating-asc">Rating (Low-High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <Input
                type="number"
                placeholder="Min Price"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Max Price"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Min Proof"
                value={minProof}
                onChange={(e) => setMinProof(e.target.value)}
              />
            </div>
            <div>
              <Input
                type="number"
                placeholder="Max Proof"
                value={maxProof}
                onChange={(e) => setMaxProof(e.target.value)}
              />
            </div>
          </div>
          
          <Button onClick={applyFilters} className="w-full">
            <Filter className="h-4 w-4 mr-2" />
            Apply Filters
          </Button>
        </div>
      </div>
      
      {/* Results Section */}
      <div className="pt-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-lg text-destructive">
              Failed to load spirits. Please try again.
            </p>
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center p-8 border rounded-lg bg-muted/20">
            <h3 className="text-lg font-medium mb-2">No spirits found</h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your filters or add a new spirit to your collection.
            </p>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Spirit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add to Collection</DialogTitle>
                </DialogHeader>
                <SpiritForm onSuccess={handleFormSuccess} />
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-muted-foreground">
                Showing {((page - 1) * 9) + 1} to {Math.min(page * 9, data?.metadata.totalItems || 0)} of {data?.metadata.totalItems || 0} spirits
              </p>
            </div>
            
            <SpiritGrid 
              spirits={data?.data || []} 
              onDelete={() => mutate()} 
              onFavoriteToggle={() => mutate()}
            />
            
            {/* Pagination */}
            {data && data.metadata && data.metadata.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-8">
                <Button 
                  variant="outline" 
                  onClick={handlePreviousPage}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                
                <span className="text-sm font-medium">
                  Page {page} of {data.metadata.totalPages}
                </span>
                
                <Button 
                  variant="outline" 
                  onClick={handleNextPage}
                  disabled={page >= (data.metadata.totalPages)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 