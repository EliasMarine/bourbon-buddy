'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Wine, User, Star, Calendar } from 'lucide-react';
import { getCoverPhotoUrl, getInitialLetter, DEFAULT_AVATAR_BG } from '@/lib/utils';

interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  joinedDate: string;
  spiritsCount: number;
  bio?: string;
}

interface WhiskeyBottle {
  id: string;
  name: string;
  brand: string;
  type: string;
  imageUrl?: string;
  rating?: number;
  notes?: string;
  dateAdded: string;
  proof?: number;
  price?: number;
}

// Mock data for development
const mockUser: UserProfile = {
  id: '1',
  name: 'Whiskey Enthusiast',
  joinedDate: '2024-01-15',
  spiritsCount: 12,
  bio: 'Passionate about discovering rare and unique bourbons. Always excited to share tasting notes and discuss the finer points of whiskey making.',
};

const mockCollection: WhiskeyBottle[] = [
  {
    id: '1',
    name: 'Eagle Rare 10 Year',
    brand: 'Buffalo Trace',
    type: 'Bourbon',
    imageUrl: 'https://www.buffalotracedistillery.com/content/dam/buffalotrace/products/eagle-rare/eagle-rare-10-year/eagle-rare-10-year-bottle.png',
    rating: 4.5,
    notes: 'Complex aroma of toffee, orange peel, herbs, honey, leather and oak. The taste is bold, dry and delicate with notes of candied almonds and rich cocoa.',
    dateAdded: '2024-02-01',
    proof: 90,
    price: 45,
  },
  {
    id: '2',
    name: 'Blanton\'s Original',
    brand: 'Blanton\'s',
    type: 'Bourbon',
    imageUrl: 'https://www.blantonsbourbon.com/sites/default/files/2019-09/Blantons_Original_Bottle.png',
    rating: 4.8,
    notes: 'A deep, satisfying nose of nutmeg and spices. Powerful dry vanilla notes in harmony with hints of honey amid strong caramel and corn.',
    dateAdded: '2024-02-15',
    proof: 93,
    price: 65,
  },
  {
    id: '3',
    name: 'Yamazaki 12 Year',
    brand: 'Suntory',
    type: 'Japanese Whisky',
    rating: 4.7,
    notes: 'Delicate and elegant with fruit notes and mizunara oak. Perfectly balanced with hints of peach, pineapple, grapefruit, clove, and candied orange.',
    dateAdded: '2024-03-01',
    proof: 86,
    price: 160,
  },
  {
    id: '4',
    name: 'Redbreast 12 Year',
    brand: 'Irish Distillers',
    type: 'Irish Whiskey',
    rating: 4.6,
    notes: 'Full flavored and complex; a harmonious balance of spicy, creamy, fruity, sherry and toasted notes.',
    dateAdded: '2024-03-15',
    proof: 80,
    price: 65,
  }
];

export default function UserProfilePage() {
  const { userId } = useParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [collection, setCollection] = useState<WhiskeyBottle[]>([]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        if (!session?.user?.id) {
          throw new Error('No session found');
        }
        
        // Check if viewing own profile
        const isOwnProfile = session.user.id === userId;
        
        if (isOwnProfile) {
          // Use session data for profile
          setUserProfile({
            id: session.user.id,
            name: session.user.name ?? 'Anonymous',
            avatar: session.user.image ?? undefined,
            joinedDate: new Date().toISOString(),
            spiritsCount: 0,
            bio: 'Your personal whiskey collection'
          });
          
          // Fetch own collection
          const collectionResponse = await fetch('/api/collection');
          if (!collectionResponse.ok) {
            throw new Error('Failed to fetch collection');
          }
          const collectionData = await collectionResponse.json();
          const formattedCollection = collectionData.spirits.map((spirit: any) => ({
            id: spirit.id,
            name: spirit.name,
            brand: spirit.brand,
            type: spirit.type,
            imageUrl: spirit.imageUrl,
            rating: spirit.rating,
            notes: spirit.notes,
            dateAdded: spirit.createdAt,
            proof: spirit.proof,
            price: spirit.price
          }));
          setCollection(formattedCollection);
          // Update spirits count
          setUserProfile(prev => prev ? { ...prev, spiritsCount: formattedCollection.length } : null);
        } else {
          // Fetch other user's profile
          const profileResponse = await fetch(`/api/users/${userId}`);
          if (!profileResponse.ok) {
            throw new Error('Failed to fetch user profile');
          }
          const profileData = await profileResponse.json();
          setUserProfile(profileData);

          // Fetch user's collection
          const collectionResponse = await fetch(`/api/users/${userId}/collection`);
          if (!collectionResponse.ok) {
            throw new Error('Failed to fetch collection');
          }
          const collectionData = await collectionResponse.json();
          setCollection(collectionData.bottles || []);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    if (userId && session?.user?.id) {
      fetchUserProfile();
    }
  }, [userId, session]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col items-center justify-center h-48">
          <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-amber-500 animate-spin"></div>
          <p className="mt-4 text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-200">User not found</h2>
          <p className="mt-2 text-gray-400">The requested profile could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* User Profile Header */}
      <div className="bg-gray-800 rounded-xl p-6 mb-8 shadow-lg">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24">
            {userProfile.avatar ? (
              <Image
                src={userProfile.avatar}
                alt={userProfile.name}
                fill
                className="rounded-full object-cover"
              />
            ) : (
              <div className={`w-24 h-24 ${DEFAULT_AVATAR_BG} rounded-full flex items-center justify-center`}>
                <span className="text-white text-2xl font-bold">
                  {getInitialLetter(userProfile.name)}
                </span>
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{userProfile.name}</h1>
            <div className="flex items-center gap-4 mt-2 text-gray-400">
              <div className="flex items-center gap-1">
                <Wine className="w-4 h-4" />
                <span>{userProfile.spiritsCount} spirits</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(userProfile.joinedDate).toLocaleDateString()}</span>
              </div>
            </div>
            {userProfile.bio && (
              <p className="mt-3 text-gray-300">{userProfile.bio}</p>
            )}
          </div>
        </div>
      </div>

      {/* Collection Grid */}
      <h2 className="text-2xl font-bold text-white mb-6">Whiskey Collection</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {collection.map((bottle) => (
          <div key={bottle.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
            <div className="relative h-48 bg-gray-900">
              {bottle.imageUrl ? (
                <Image
                  src={bottle.imageUrl}
                  alt={bottle.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Wine className="w-16 h-16 text-gray-700" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white">{bottle.name}</h3>
              <p className="text-gray-400">{bottle.brand}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="px-2 py-1 bg-gray-700 rounded-full text-sm text-gray-300">
                  {bottle.type}
                </span>
                {bottle.proof && (
                  <span className="px-2 py-1 bg-gray-700 rounded-full text-sm text-gray-300">
                    {bottle.proof} proof
                  </span>
                )}
              </div>
              {bottle.rating && (
                <div className="mt-3 flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-current" />
                  <span className="text-amber-500">{bottle.rating.toFixed(1)}</span>
                </div>
              )}
              {bottle.notes && (
                <p className="mt-3 text-sm text-gray-400 line-clamp-2">{bottle.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {collection.length === 0 && (
        <div className="text-center py-12">
          <Wine className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">This user hasn't added any bottles to their collection yet.</p>
        </div>
      )}
    </div>
  );
} 