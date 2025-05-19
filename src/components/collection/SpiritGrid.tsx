'use client';

import { useState } from 'react';
import { Spirit } from '@/types';
import Image from 'next/image';
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '../../components/ui/card';
import { Button } from '../../components/ui/Button';
import Link from 'next/link';
import { Star, Edit, Trash2, Heart, Coffee } from 'lucide-react';

interface SpiritGridProps {
  spirits: Spirit[];
  onDelete?: () => void;
  onFavoriteToggle?: () => void;
}

export function SpiritGrid({ spirits, onDelete, onFavoriteToggle }: SpiritGridProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingFavoriteId, setLoadingFavoriteId] = useState<string | null>(null);
  
  // Handle spirit deletion
  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      
      const response = await fetch(`/api/collection/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete spirit');
      }
      
      console.log('Spirit deleted');
      
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting spirit:', error);
      console.error('Failed to delete spirit. Please try again.');
    } finally {
      setDeletingId(null);
      setIsDeleting(false);
    }
  };
  
  // Handle favorite toggle
  const handleFavoriteToggle = async (spirit: Spirit) => {
    try {
      setLoadingFavoriteId(spirit.id);
      
      const response = await fetch(`/api/collection/${spirit.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isFavorite: !spirit.isFavorite,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
      
      console.log(`${spirit.name} has been ${spirit.isFavorite ? 'removed from' : 'added to'} your favorites.`);
      
      if (onFavoriteToggle) {
        onFavoriteToggle();
      }
    } catch (error) {
      console.error('Error updating favorite status:', error);
      console.error('Failed to update favorite status. Please try again.');
    } finally {
      setLoadingFavoriteId(null);
    }
  };
  
  // Format price for display
  const formatPrice = (price: number | null) => {
    if (price === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(price);
  };
  
  // Format rating for display (convert from 0-100 to 0-10 scale)
  const formatRating = (rating: number | null) => {
    if (rating === null) return 'Not Rated';
    const ratingOutOfTen = rating / 10;
    return ratingOutOfTen.toFixed(1);
  };
  
  // Render no spirits message
  if (spirits.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-lg font-medium mb-2">No spirits found</p>
        <p className="text-muted-foreground">Try adjusting your filters or add a new spirit to your collection.</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {spirits.map((spirit) => (
        <Card 
          key={spirit.id} 
          className={`overflow-hidden transition-all hover:shadow-md ${spirit.isFavorite ? 'ring-2 ring-amber-500 ring-opacity-50' : ''}`}
        >
          {/* Image Section */}
          <div className="relative aspect-[3/4] h-48 overflow-hidden">
            {spirit.imageUrl ? (
              <Image
                src={spirit.imageUrl}
                alt={spirit.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                style={{ objectFit: 'contain' }}
                className="transition-all hover:scale-105 bg-gray-800/50"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/bottle-placeholder.png';
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-800/50">
                <Coffee className="h-20 w-20 text-amber-700/30" />
              </div>
            )}
            
            {/* Favorite Button Overlay */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/20 backdrop-blur-sm hover:bg-black/40"
              onClick={() => handleFavoriteToggle(spirit)}
              disabled={loadingFavoriteId === spirit.id}
            >
              <Heart 
                className={`h-5 w-5 ${spirit.isFavorite ? 'fill-amber-500 text-amber-500' : 'text-white'}`} 
              />
            </Button>
          </div>
          
          <CardHeader className="p-4">
            <CardTitle className="text-lg line-clamp-1 text-amber-100">{spirit.name}</CardTitle>
            <p className="text-sm text-amber-100/70 line-clamp-1">{spirit.brand}</p>
          </CardHeader>
          
          <CardContent className="p-4 pt-0">
            <div className="flex items-center gap-1 mb-2">
              <Star className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-amber-100">
                {formatRating(spirit.rating)}
              </span>
              {spirit.type && (
                <span className="ml-auto text-xs py-0.5 px-2 bg-gray-700/50 text-amber-200 rounded-full border border-amber-800/20">
                  {spirit.type}
                </span>
              )}
            </div>
            
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-amber-100/70">Price</p>
                <p className="font-semibold text-amber-100">{formatPrice(spirit.price)}</p>
              </div>
              {spirit.proof && (
                <div>
                  <p className="text-amber-100/70">Proof</p>
                  <p className="font-semibold text-amber-100">{spirit.proof}</p>
                </div>
              )}
              {spirit.bottleLevel !== null && (
                <div>
                  <p className="text-amber-100/70">Level</p>
                  <p className="font-semibold text-amber-100">{spirit.bottleLevel}%</p>
                </div>
              )}
            </div>
          </CardContent>
          
          <CardFooter className="p-4 pt-0 flex justify-between">
            <Button 
              variant="outline" 
              size="sm"
              asChild
              className="border-amber-800/30 hover:bg-amber-800/20 text-amber-100"
            >
              <Link href={`/collection/spirit/${spirit.id}`}>
                View Details
              </Link>
            </Button>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-amber-100/70 hover:text-amber-100 hover:bg-amber-800/20"
                asChild
              >
                <Link href={`/collection/spirit/${spirit.id}/edit`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                onClick={() => setDeletingId(spirit.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      ))}
      
      {/* Delete Confirmation Dialog */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-b from-gray-900 to-gray-800 border border-amber-800/30 p-6 rounded-lg max-w-md w-full text-amber-100">
            <h3 className="text-xl font-bold mb-4">Are you sure?</h3>
            <p className="mb-6 text-amber-100/80">
              This action cannot be undone. This will permanently remove this spirit from your collection.
            </p>
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDeletingId(null)}
                disabled={isDeleting}
                className="border-amber-800/30 hover:bg-amber-800/20 text-amber-100"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deletingId) {
                    handleDelete(deletingId);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 