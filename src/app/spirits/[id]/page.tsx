'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  ArrowLeft, Star, Heart, Edit, Trash, Share, 
  Instagram, Wine, Info, Calendar, DollarSign 
} from 'lucide-react';
import ConfirmationDialog from '@/components/ui/ConfirmationDialog';

interface SpiritDetails {
  id: string;
  name: string;
  brand: string;
  type: string;
  description: string | null;
  proof: number | null;
  price: number | null;
  rating: number | null;
  dateAcquired: string | null;
  imageUrl: string | null;
  isFavorite: boolean;
  nose: string | null;
  palate: string | null;
  finish: string | null;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    avatar: string | null;
  }
}

export default function SpiritPage() {
  const params = useParams();
  const { data: session, status } = useSession({ required: true });
  const router = useRouter();
  const [spirit, setSpirit] = useState<SpiritDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  
  const spiritId = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';

  // Fetch spirit details
  useEffect(() => {
    const fetchSpirit = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/spirits/${spiritId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Spirit not found');
          }
          throw new Error('Failed to fetch spirit details');
        }
        
        const data = await response.json();
        setSpirit(data.spirit);
        setIsOwner(data.isOwner);
        setIsFavorite(data.spirit.isFavorite);
      } catch (err) {
        console.error('Error fetching spirit:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        toast.error('Failed to load spirit details');
      } finally {
        setLoading(false);
      }
    };

    if (session && spiritId) {
      fetchSpirit();
    }
  }, [spiritId, session]);

  // Toggle favorite
  const toggleFavorite = async () => {
    if (!spirit) return;
    
    try {
      const response = await fetch(`/api/collection/${spirit.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isFavorite: !isFavorite,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }
      
      setIsFavorite(!isFavorite);
      toast.success(isFavorite ? 'Removed from favorites' : 'Added to favorites');
    } catch (err) {
      console.error('Error updating favorite status:', err);
      toast.error('Failed to update favorite status');
    }
  };

  // Delete spirit
  const deleteSpirit = async () => {
    if (!spirit || !isOwner) return;
    
    try {
      const response = await fetch(`/api/collection/${spirit.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete spirit');
      }
      
      toast.success('Spirit deleted successfully');
      router.push('/collection');
    } catch (err) {
      console.error('Error deleting spirit:', err);
      toast.error('Failed to delete spirit');
    }
  };

  // Share spirit
  const copyShareLink = () => {
    const url = `${window.location.origin}/spirits/${spiritId}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        toast.success('Link copied to clipboard');
        setIsShareOpen(false);
      })
      .catch(() => {
        toast.error('Failed to copy link');
      });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="flex flex-col items-center justify-center h-48">
          <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-amber-500 animate-spin"></div>
          <p className="mt-4 text-gray-400">Loading spirit details...</p>
        </div>
      </div>
    );
  }

  if (error || !spirit) {
    return (
      <div className="container mx-auto px-4 py-8 mt-20">
        <div className="bg-gray-800 rounded-lg p-8 text-center max-w-md mx-auto">
          <h2 className="text-xl text-white mb-4">{error || 'Spirit not found'}</h2>
          <p className="text-gray-400 mb-6">The spirit you're looking for may have been removed or doesn't exist.</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 mt-16">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center text-gray-400 hover:text-white mb-6"
      >
        <ArrowLeft size={20} className="mr-1" />
        <span>Back</span>
      </button>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirm}
        title="Delete Spirit"
        message={`Are you sure you want to delete "${spirit?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel" 
        onConfirm={deleteSpirit}
        onCancel={() => setDeleteConfirm(false)}
        danger={true}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Image */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800 rounded-lg overflow-hidden h-96 relative">
            {spirit.imageUrl ? (
              <Image
                src={spirit.imageUrl}
                alt={spirit.name}
                fill
                className="object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-700">
                <Wine className="w-24 h-24 text-gray-600" />
              </div>
            )}
          </div>

          {/* Owner Information */}
          <div className="mt-6 bg-gray-800 rounded-lg p-4">
            <h3 className="text-white text-sm mb-3">Added by</h3>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden relative">
                {spirit.owner.avatar ? (
                  <Image 
                    src={spirit.owner.avatar} 
                    alt={spirit.owner.name} 
                    fill 
                    className="object-cover" 
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-amber-600 text-white font-semibold">
                    {spirit.owner.name[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="ml-3">
                <p className="text-white font-medium">{spirit.owner.name}</p>
                {!isOwner && (
                  <Link 
                    href={`/profile/${spirit.ownerId}`}
                    className="text-xs text-amber-500 hover:text-amber-400"
                  >
                    View Profile
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isOwner ? (
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Link 
                href={`/collection/edit/${spirit.id}`}
                className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 px-4 flex items-center justify-center"
              >
                <Edit size={18} className="mr-2" />
                Edit
              </Link>
              <button 
                onClick={() => setDeleteConfirm(true)}
                className="bg-red-900/50 hover:bg-red-900/80 text-red-200 rounded-lg py-2 px-4 flex items-center justify-center"
              >
                <Trash size={18} className="mr-2" />
                Delete
              </button>
            </div>
          ) : (
            <div className="mt-6 flex flex-col space-y-3">
              <button 
                onClick={toggleFavorite}
                className={`rounded-lg py-2 px-4 flex items-center justify-center ${
                  isFavorite 
                    ? 'bg-amber-700 text-white hover:bg-amber-800' 
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                <Heart 
                  size={18} 
                  className={`mr-2 ${isFavorite ? 'fill-white' : ''}`} 
                />
                {isFavorite ? 'Favorited' : 'Add to Favorites'}
              </button>
              <button 
                onClick={() => setIsShareOpen(true)}
                className="bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 px-4 flex items-center justify-center"
              >
                <Share size={18} className="mr-2" />
                Share Spirit
              </button>
            </div>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex flex-wrap items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{spirit.name}</h1>
                <p className="text-amber-500 text-xl mb-1">{spirit.brand}</p>
                <p className="text-gray-400">{spirit.type}</p>
              </div>
              <div className="flex items-center mt-2 sm:mt-0">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-6 h-6 ${
                      spirit.rating && i < spirit.rating
                        ? 'text-amber-500 fill-amber-500'
                        : 'text-gray-500'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Spirit metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {spirit.proof && (
                <div className="bg-gray-700 rounded-lg p-3 flex items-center">
                  <Info className="text-amber-500 w-5 h-5 mr-3" />
                  <div>
                    <p className="text-xs text-gray-400">Proof</p>
                    <p className="text-white">{spirit.proof}</p>
                  </div>
                </div>
              )}
              {spirit.price && (
                <div className="bg-gray-700 rounded-lg p-3 flex items-center">
                  <DollarSign className="text-amber-500 w-5 h-5 mr-3" />
                  <div>
                    <p className="text-xs text-gray-400">Price</p>
                    <p className="text-white">${spirit.price.toFixed(2)}</p>
                  </div>
                </div>
              )}
              {spirit.dateAcquired && (
                <div className="bg-gray-700 rounded-lg p-3 flex items-center">
                  <Calendar className="text-amber-500 w-5 h-5 mr-3" />
                  <div>
                    <p className="text-xs text-gray-400">Acquired</p>
                    <p className="text-white">{new Date(spirit.dateAcquired).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {spirit.description && (
              <div className="mb-8">
                <h2 className="text-white text-xl font-semibold mb-3">Description</h2>
                <p className="text-gray-300">{spirit.description}</p>
              </div>
            )}

            {/* Tasting Notes */}
            <div className="mb-8">
              <h2 className="text-white text-xl font-semibold mb-4">Tasting Notes</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-amber-500 mb-2 font-medium">Nose</h3>
                  <p className="text-gray-300">{spirit.nose || 'No notes added'}</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-amber-500 mb-2 font-medium">Palate</h3>
                  <p className="text-gray-300">{spirit.palate || 'No notes added'}</p>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-amber-500 mb-2 font-medium">Finish</h3>
                  <p className="text-gray-300">{spirit.finish || 'No notes added'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl text-white mb-4">Share Spirit</h3>
            <p className="text-gray-300 mb-4">
              Share this spirit with other bourbon enthusiasts.
            </p>
            <div className="flex space-x-3 mb-6">
              <button
                onClick={copyShareLink}
                className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 flex items-center justify-center"
              >
                Copy Link
              </button>
              <a
                href={`https://twitter.com/intent/tweet?text=Check out this ${spirit.type}: ${spirit.name} by ${spirit.brand}&url=${encodeURIComponent(
                  `${window.location.origin}/spirits/${spiritId}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-[#1DA1F2] text-white rounded-lg hover:bg-[#1a94df] flex items-center justify-center"
              >
                Twitter
              </a>
              <a
                href={`https://www.instagram.com/`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 bg-[#C13584] text-white rounded-lg hover:bg-[#b13078] flex items-center justify-center"
              >
                <Instagram size={18} className="mr-1" />
                Instagram
              </a>
            </div>
            <button
              onClick={() => setIsShareOpen(false)}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 