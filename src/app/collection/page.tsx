'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import SpiritCard from '@/components/collection/SpiritCard';
import AddSpiritForm from '@/components/collection/AddSpiritForm';
import { Spirit } from '@/types';
import { toast } from 'react-hot-toast';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';

export default function CollectionPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [spirits, setSpirits] = useState<Spirit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'loading') {
      setIsLoading(true);
      return;
    }
    if (session) {
      fetchCollection();
    }
  }, [session, status, router]);

  const fetchCollection = async () => {
    try {
      const response = await fetch('/api/collection');
      const data = await response.json();
      
      // Sort spirits to show favorites first
      const sortedSpirits = sortSpirits(data.spirits);
      setSpirits(sortedSpirits);
    } catch (error) {
      console.error('Failed to fetch collection:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to sort spirits - favorites first, then by name
  const sortSpirits = (spiritsList: Spirit[]): Spirit[] => {
    return [...spiritsList].sort((a, b) => {
      // First sort by favorite status (favorites first)
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      
      // Then sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
  };

  const handleToggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      const response = await fetch(`/api/collection/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isFavorite }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('Server response:', data);
        throw new Error(data.error || 'Failed to update favorite status');
      }

      // Update the local spirits state
      setSpirits(prevSpirits => {
        const updatedSpirits = prevSpirits.map(spirit => 
          spirit.id === id ? { ...spirit, isFavorite } : spirit
        );
        // Resort to maintain order with favorites first
        return sortSpirits(updatedSpirits);
      });

      // Show success message
      toast(
        isFavorite 
          ? 'Added to favorites' 
          : 'Removed from favorites',
        { icon: isFavorite ? '❤️' : '🤍' }
      );
    } catch (error) {
      console.error('Failed to update favorite status:', error);
      toast('Failed to update favorite status', { icon: '❌' });
    }
  };

  const handleAddSpirit = async (formData: FormData) => {
    setIsLoading(true);
    try {
      if (!session || !session.user) {
        console.error('No active session found');
        throw new Error('You must be logged in to add spirits');
      }

      formData.append('userId', session.user.id);
      
      console.log('Submitting with session user:', session.user);
      
      const convertedData = Object.fromEntries(formData.entries());
      console.log('Form data to be submitted:', convertedData);
      
      const response = await fetch('/api/collection', {
        method: 'POST',
        body: formData,
      });

      const responseData = await response.json();
      console.log('API response:', responseData);
      
      if (!response.ok) {
        console.error('Server response:', responseData);
        throw new Error(responseData.error || 'Failed to add spirit');
      }

      await fetchCollection();
      setIsFormVisible(false); // Hide form after successful submission
      return responseData;
    } catch (error) {
      console.error('Failed to add spirit:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSpirit = async (id: string) => {
    try {
      console.log(`Attempting to delete spirit with ID: ${id}`);
      
      const response = await fetch(`/api/collection/${id}`, {
        method: 'DELETE',
      });

      const responseData = await response.json();
      console.log('Delete response:', responseData);
      
      if (!response.ok) {
        console.error('Server response:', responseData);
        throw new Error(responseData.error || 'Failed to delete spirit');
      }

      console.log(`Successfully deleted spirit with ID: ${id}`);
      setSpirits(spirits.filter(spirit => spirit.id !== id));
      toast('Spirit removed successfully', { icon: '✅' });
    } catch (error) {
      console.error('Failed to delete spirit:', error);
      toast('Failed to remove spirit', { icon: '❌' });
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen relative">
      {/* Background image with overlay */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-black/50 z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10"></div>
        <div className="absolute inset-0 overflow-hidden">
          <Image 
            src="/images/backgrounds/Collection background/collection_background.jpg?v=1"
            alt="Collection background"
            fill
            priority
            className="object-cover"
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
      <div className="relative z-20">
        {/* Header Section */}
        <div className="relative bg-transparent backdrop-blur-sm">
          <div className="absolute inset-0 bg-black/20"></div>
          {/* Decorative elements */}
          <div className="absolute right-0 top-0 h-full w-1/3 overflow-hidden">
            <div className="absolute -right-10 top-10 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl"></div>
            <div className="absolute right-40 bottom-5 w-32 h-32 rounded-full bg-amber-500/20 blur-xl"></div>
          </div>
          <div className="container mx-auto px-4 py-16 pt-28 relative">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              {session?.user?.name ? `${session.user.name}'s Collection` : 'Collection'}
            </h1>
            <p className="text-gray-200 text-lg max-w-2xl">
              Track and manage your favorite spirits, add tasting notes, and rate your collection.
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="container mx-auto px-4 py-12 relative">
          {/* Decorative blurred circles */}
          <div className="absolute -left-20 top-40 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none opacity-30"></div>
          <div className="absolute right-10 bottom-20 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none opacity-20"></div>
          
          {/* Form Section - Collapsible */}
          <div className="mb-8">
            <button 
              onClick={() => setIsFormVisible(!isFormVisible)}
              className="w-full flex items-center justify-between bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-lg text-white font-semibold transition-all hover:bg-white/15"
            >
              <div className="flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Add to Your Collection
              </div>
              {isFormVisible ? 
                <ChevronUp className="w-5 h-5" /> : 
                <ChevronDown className="w-5 h-5" />
              }
            </button>
            
            {isFormVisible && (
              <div className="mt-2 bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 relative z-10 shadow-xl">
                <AddSpiritForm onAdd={handleAddSpirit} />
              </div>
            )}
          </div>

          {/* Collection Section */}
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-white">Your Spirits</h2>
              <div className="flex gap-2">
                {/* Add filters and sorting here in the future */}
              </div>
            </div>

            {isLoading ? (
              <div className="py-20 text-center bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
                <div className="w-12 h-12 border-t-2 border-amber-500 border-solid rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-300">Loading your collection...</p>
              </div>
            ) : spirits.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-white/20 rounded-lg bg-white/5 backdrop-blur-sm">
                <p className="text-xl text-gray-200 mb-4">Your collection is empty</p>
                <p className="text-gray-400">Add your first spirit using the form above</p>
                {!isFormVisible && (
                  <button 
                    onClick={() => setIsFormVisible(true)}
                    className="mt-6 bg-amber-500 hover:bg-amber-600 text-white py-2 px-4 rounded-md transition-colors flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Add Spirit
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {spirits.map((spirit) => (
                  <SpiritCard
                    key={spirit.id}
                    spirit={spirit}
                    onDelete={handleDeleteSpirit}
                    onToggleFavorite={handleToggleFavorite}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 