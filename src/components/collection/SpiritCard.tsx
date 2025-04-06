'use client';

import React, { useState } from 'react';
import { Spirit } from '@/types';
import { Star, Trash2, Tag, Droplets, Wine, Heart } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import BottleLevelIndicator from './BottleLevelIndicator';
import ConfirmationDialog from '../ui/ConfirmationDialog';

interface SpiritCardProps {
  spirit: Spirit;
  onDelete?: (id: string) => void;
  onToggleFavorite?: (id: string, isFavorite: boolean) => void;
}

export default function SpiritCard({ spirit, onDelete, onToggleFavorite }: SpiritCardProps) {
  // State for delete confirmation dialog
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Determine the rating using a 10-point scale
  const rating = spirit.rating ? Number(spirit.rating) : 0;
  const displayRating = Math.round(rating * 10) / 10; // Round to 1 decimal place
  const fullGlasses = Math.floor(rating);
  const hasHalfGlass = rating % 1 >= 0.5;
  const emptyGlasses = 10 - fullGlasses - (hasHalfGlass ? 1 : 0);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation when clicking delete
    e.stopPropagation(); // Stop event from bubbling up
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(spirit.id);
    }
    setIsDeleteConfirmOpen(false);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event from bubbling up
    if (onToggleFavorite) {
      onToggleFavorite(spirit.id, !spirit.isFavorite);
    }
  };

  return (
    <>
      <Link href={`/collection/spirit/${spirit.id}`} className="block">
        <div className="bg-white/5 backdrop-blur-sm rounded-xl overflow-hidden border border-white/10 hover:border-amber-500/30 transition-all hover:shadow-lg hover:shadow-amber-500/10 group cursor-pointer">
          <div className="relative h-60 w-full bg-white flex items-center justify-center">
            {spirit.imageUrl ? (
              <img
                src={spirit.imageUrl}
                alt={spirit.name}
                className="object-contain max-h-56 max-w-[80%] transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                <span className="text-gray-500">No image</span>
              </div>
            )}
            {/* Type badge */}
            <div className="absolute top-3 left-3 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span className="capitalize">{spirit.type}</span>
            </div>
            {/* Star badge for isFavorite - keeping for compatibility with detail page */}
            {spirit.isFavorite && (
              <div className="absolute top-3 right-3 bg-amber-500 text-white p-1.5 rounded-full">
                <Star className="w-4 h-4 fill-white" />
              </div>
            )}
          </div>
          <div className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white group-hover:text-amber-500 transition-colors">{spirit.name}</h3>
                <p className="text-gray-400">{spirit.brand}</p>
              </div>
              {spirit.proof && (
                <div className="bg-amber-800/30 text-amber-400 px-2 py-1 rounded text-sm font-bold flex items-center gap-1">
                  <Droplets className="w-3 h-3" />
                  {spirit.proof}°
                </div>
              )}
            </div>
            
            {/* Rating */}
            {rating > 0 && (
              <div className="flex items-center mt-3">
                <div className="flex">
                  {/* Full glasses */}
                  {Array.from({ length: fullGlasses }).map((_, i) => (
                    <Wine 
                      key={`full-${i}`} 
                      className="w-3.5 h-3.5 text-amber-500 fill-amber-500" 
                    />
                  ))}
                  
                  {/* Half glass */}
                  {hasHalfGlass && (
                    <div className="relative w-3.5 h-3.5">
                      <Wine className="absolute w-3.5 h-3.5 text-gray-600" />
                      <div className="absolute top-0 left-0 w-1/2 h-full overflow-hidden">
                        <Wine className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      </div>
                    </div>
                  )}
                  
                  {/* Empty glasses */}
                  {Array.from({ length: emptyGlasses }).map((_, i) => (
                    <Wine 
                      key={`empty-${i}`} 
                      className="w-3.5 h-3.5 text-gray-600" 
                    />
                  ))}
                </div>
                <span className="text-gray-400 text-sm ml-2">({displayRating}/10)</span>
              </div>
            )}
            
            {/* Tasting notes */}
            {(spirit.nose || spirit.palate || spirit.finish) && (
              <div className="mt-4 space-y-1">
                {spirit.nose && (
                  <div className="text-sm">
                    <span className="text-amber-500 font-medium">Nose:</span> 
                    <span className="text-gray-300"> {spirit.nose}</span>
                  </div>
                )}
                {spirit.palate && (
                  <div className="text-sm">
                    <span className="text-amber-500 font-medium">Palate:</span> 
                    <span className="text-gray-300"> {spirit.palate}</span>
                  </div>
                )}
                {spirit.finish && (
                  <div className="text-sm">
                    <span className="text-amber-500 font-medium">Finish:</span> 
                    <span className="text-gray-300"> {spirit.finish}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Description */}
            {spirit.description && (
              <p className="text-sm text-gray-400 mt-3">{spirit.description}</p>
            )}
            
            {/* Bottle Level */}
            <div className="mt-2 flex items-center">
              <BottleLevelIndicator 
                level={spirit.bottleLevel || 0} 
                size="sm"
                compact={true}
                interactive={false}
              />
            </div>
            
            {/* Footer/Actions */}
            <div className="flex justify-between items-center mt-4">
              <button 
                onClick={handleFavoriteClick}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  spirit.isFavorite ? 'bg-amber-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${spirit.isFavorite ? 'fill-white' : ''}`} />
                {spirit.isFavorite ? 'Favorite' : 'Add to Favorites'}
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteClick}
                  className="p-2 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
                  title="Delete spirit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Link>
      
      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isDeleteConfirmOpen}
        title="Delete Spirit"
        message={`Are you sure you want to delete "${spirit.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        danger={true}
      />
    </>
  );
} 