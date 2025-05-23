'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { 
  Wine, User, Star, Calendar, ArrowLeft, 
  DollarSign, Percent, Info, Share2, BookOpen,
  MessageCircle, Grid, Heart, History, Bookmark,
  ChevronDown
} from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';
import BottlePlaceholder from '@/components/ui/icons/BottlePlaceholder';

interface UserProfile {
  id: string;
  name: string;
  avatar?: string;
  joinedDate: string;
  spiritsCount: number;
  bio?: string;
  favorite?: string;
  location?: string;
  followers?: number;
  following?: number;
  isFollowing?: boolean;
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

// Static helper functions
const getInitialLetter = (name: string): string => {
  return name.charAt(0).toUpperCase();
};

const DEFAULT_AVATAR_BG = 'bg-amber-600';

// Sort options for the collection
type SortOption = 'recent' | 'rating' | 'price_high' | 'price_low' | 'alphabetical';

export default function UserProfilePage() {
  const { userId } = useParams();
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [collection, setCollection] = useState<WhiskeyBottle[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [activeTab, setActiveTab] = useState<'collection' | 'notes' | 'activity'>('collection');

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        
        if (!userId) {
          throw new Error('No user ID provided');
        }
        
        // Check if viewing own profile (if logged in)
        const isOwnProfile = session?.user?.id === userId;
        
        // Fetch user profile (this would be a real API call in production)
        try {
          const profileResponse = await fetch(`/api/users/${userId}`);
          if (!profileResponse.ok) {
            // If API fails, use mock data for demo purposes
            if (isOwnProfile) {
              setUserProfile({
                id: session?.user?.id || 'self',
                name: session?.user?.name || 'Your Profile',
                avatar: session?.user?.image || undefined,
                joinedDate: new Date().toISOString(),
                spiritsCount: 12,
                bio: 'Your personal whiskey collection',
                favorite: 'Eagle Rare 10 Year',
                location: 'Louisville, KY',
                followers: 124,
                following: 87,
                isFollowing: false
              });
            } else {
              // Mock data for other profiles
              setUserProfile({
                id: userId as string,
                name: 'Whiskey Enthusiast',
                joinedDate: '2024-01-15',
                spiritsCount: 24,
                bio: 'Passionate about discovering rare and unique bourbons. Always excited to share tasting notes and discuss the finer points of whiskey making.',
                favorite: 'Blanton\'s Original',
                location: 'Lexington, KY',
                followers: 547,
                following: 213,
                isFollowing: false
              });
            }
          } else {
            const profileData = await profileResponse.json();
            setUserProfile(profileData);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Fallback to mock data
          setUserProfile({
            id: userId as string,
            name: 'Bourbon Collector',
            joinedDate: '2023-12-01',
            spiritsCount: 18,
            bio: 'Exploring the world of fine whiskeys one bottle at a time. Specializing in small batch and limited release bourbons.',
            favorite: 'Weller Special Reserve',
            location: 'Nashville, TN',
            followers: 328,
            following: 156,
            isFollowing: false
          });
        }

        // Fetch user's collection (this would be a real API call in production)
        try {
          const collectionResponse = await fetch(`/api/users/${userId}/collection`);
          if (!collectionResponse.ok) {
            // If API fails, use mock data for demo purposes
            setCollection([
              {
                id: '1',
                name: 'Eagle Rare 10 Year',
                brand: 'Buffalo Trace',
                type: 'Bourbon',
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
              },
              {
                id: '5',
                name: 'Michter\'s Small Batch',
                brand: 'Michter\'s',
                type: 'Bourbon',
                rating: 4.4,
                notes: 'Rich caramel with balanced vanilla, stone fruit, smoke, and spice. Excellent richness with no roughness.',
                dateAdded: '2024-01-10',
                proof: 91.4,
                price: 50,
              },
              {
                id: '6',
                name: 'Lagavulin 16',
                brand: 'Lagavulin',
                type: 'Scotch',
                rating: 4.9,
                notes: 'Deep, dry and exceptionally peaty. Probably the most pungent of all Islay malts, with deep, smoky flavors.',
                dateAdded: '2024-02-20',
                proof: 86,
                price: 110,
              }
            ]);
          } else {
            const collectionData = await collectionResponse.json();
            setCollection(collectionData.bottles || []);
          }
        } catch (error) {
          console.error('Error fetching collection:', error);
          // Use mock data as fallback
          setCollection([
            {
              id: '1',
              name: 'Eagle Rare 10 Year',
              brand: 'Buffalo Trace',
              type: 'Bourbon',
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
          ]);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, session]);

  // Sort the collection based on the selected option
  const sortedCollection = [...collection].sort((a, b) => {
    switch (sortOption) {
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'price_high':
        return (b.price || 0) - (a.price || 0);
      case 'price_low':
        return (a.price || 0) - (b.price || 0);
      case 'alphabetical':
        return a.name.localeCompare(b.name);
      case 'recent':
      default:
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
    }
  });

  // Handle follow/unfollow
  const handleFollowToggle = () => {
    if (!session) {
      toast.error('You must be logged in to follow users');
      return;
    }
    
    // In a real app, this would be an API call
    setUserProfile(prev => 
      prev ? {
        ...prev, 
        isFollowing: !prev.isFollowing,
        followers: prev.isFollowing ? (prev.followers || 0) - 1 : (prev.followers || 0) + 1
      } : null
    );
    
    toast.success(userProfile?.isFollowing ? 
      `Unfollowed ${userProfile.name}` : 
      `Now following ${userProfile?.name}`
    );
  };

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
    <div className="min-h-screen">
      {/* Hero background with gradient overlay */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/90 via-gray-900/80 to-gray-900"></div>
        <div className="relative z-10 pt-8 pb-16">
          <div className="container mx-auto px-4">
            {/* Back button */}
            <div className="mb-6">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                <span>Back</span>
              </button>
            </div>
            
            {/* User Profile Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="relative"
              >
                <div className="rounded-full border-4 border-amber-600 shadow-xl">
                  <UserAvatar
                    src={userProfile.avatar}
                    name={userProfile.name}
                    size={160}
                  />
                </div>
              </motion.div>
              
              <div className="flex-1">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <h1 className="text-3xl md:text-4xl font-bold text-white">{userProfile.name}</h1>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-gray-300">
                    <div className="flex items-center gap-1">
                      <Wine className="w-4 h-4 text-amber-500" />
                      <span>{userProfile.spiritsCount} spirits</span>
                    </div>
                    {userProfile.location && (
                      <div className="flex items-center gap-1">
                        <Info className="w-4 h-4 text-amber-500" />
                        <span>{userProfile.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      <span>Since {new Date(userProfile.joinedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                  
                  {userProfile.bio && (
                    <p className="mt-4 text-gray-300 max-w-3xl">{userProfile.bio}</p>
                  )}
                  
                  <div className="mt-6 flex flex-wrap gap-4">
                    {userProfile.followers !== undefined && (
                      <div className="flex gap-6">
                        <div className="text-center">
                          <div className="text-xl font-bold text-white">{userProfile.followers}</div>
                          <div className="text-sm text-gray-400">Followers</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xl font-bold text-white">{userProfile.following}</div>
                          <div className="text-sm text-gray-400">Following</div>
                        </div>
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex gap-3 ml-auto">
                      <button 
                        className="bg-gray-800/70 backdrop-blur-sm text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                        onClick={() => {
                          // In a real app, this would copy the profile URL
                          toast.success('Profile link copied to clipboard');
                        }}
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Share</span>
                      </button>
                      
                      {session && userId !== session.user?.id && (
                        <button 
                          className={`${userProfile.isFollowing ? 'bg-gray-800/70 text-gray-300' : 'bg-amber-600 text-white'} px-4 py-2 rounded-lg transition-colors flex items-center gap-2 hover:opacity-90`}
                          onClick={handleFollowToggle}
                        >
                          {userProfile.isFollowing ? (
                            <>
                              <User className="w-4 h-4" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <User className="w-4 h-4" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 -mt-8 mb-16 relative z-20">
        {/* Tabs */}
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl overflow-hidden mb-8 border border-gray-700/40 shadow-lg">
          <div className="flex overflow-x-auto">
            <button
              className={`py-4 px-6 font-medium flex items-center gap-2 ${activeTab === 'collection' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-gray-300 hover:text-white'}`}
              onClick={() => setActiveTab('collection')}
            >
              <Grid className="w-4 h-4" />
              <span>Collection</span>
            </button>
            <button
              className={`py-4 px-6 font-medium flex items-center gap-2 ${activeTab === 'notes' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-gray-300 hover:text-white'}`}
              onClick={() => setActiveTab('notes')}
            >
              <BookOpen className="w-4 h-4" />
              <span>Tasting Notes</span>
            </button>
            <button
              className={`py-4 px-6 font-medium flex items-center gap-2 ${activeTab === 'activity' ? 'text-amber-500 border-b-2 border-amber-500' : 'text-gray-300 hover:text-white'}`}
              onClick={() => setActiveTab('activity')}
            >
              <History className="w-4 h-4" />
              <span>Activity</span>
            </button>
          </div>
        </div>
        
        {/* Collection Tab Content */}
        {activeTab === 'collection' && (
          <>
            <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Wine className="h-5 w-5 mr-2 text-amber-500" />
                {userProfile.name}'s Collection
                <span className="ml-3 text-sm font-normal text-gray-400">
                  {collection.length} bottles
                </span>
              </h2>
              
              {/* Sort options */}
              <div className="relative">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="bg-gray-800/70 backdrop-blur-sm border border-gray-700 rounded-lg text-white px-4 py-2 appearance-none pr-10 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="recent">Recently Added</option>
                  <option value="rating">Highest Rated</option>
                  <option value="price_high">Price: High to Low</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="alphabetical">A-Z</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            
            {/* Favorite spirit callout if one exists */}
            {userProfile.favorite && (
              <div className="bg-gradient-to-r from-amber-800/30 to-amber-900/30 backdrop-blur-sm rounded-xl p-6 mb-8 border border-amber-700/20">
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <h3 className="text-lg font-semibold text-amber-500">Favorite Spirit</h3>
                </div>
                <div className="text-xl text-white">{userProfile.favorite}</div>
              </div>
            )}
            
            {/* Collection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedCollection.map((bottle) => (
                <Link 
                  key={bottle.id} 
                  href={`/spirits/${bottle.id}`}
                >
                  <motion.div 
                    whileHover={{ y: -5 }}
                    className="bg-gray-800/70 backdrop-blur-sm rounded-xl overflow-hidden transition-all duration-300 border border-gray-700/50 hover:border-amber-500/30 shadow-lg h-full group"
                  >
                    <div className="relative h-56">
                      {bottle.imageUrl ? (
                        <Image
                          src={bottle.imageUrl}
                          alt={bottle.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-amber-900/20">
                          <BottlePlaceholder
                            width={60}
                            height={150}
                            color={
                              bottle.type === 'Bourbon' ? '#d97706' :
                              bottle.type === 'Rye' ? '#b91c1c' :
                              bottle.type === 'Scotch' ? '#854d0e' :
                              bottle.type === 'Irish Whiskey' ? '#15803d' :
                              bottle.type === 'Japanese Whisky' ? '#b45309' :
                              '#7c2d12'
                            }
                          />
                        </div>
                      )}
                      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent">
                        <div className="inline-block bg-amber-600/20 text-amber-500 text-xs font-medium rounded-full px-2 py-1">
                          {bottle.type}
                        </div>
                      </div>
                      <div className="absolute top-3 right-3 px-2 py-1 bg-gray-900/80 backdrop-blur-sm rounded-lg flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              bottle.rating && i < Math.floor(bottle.rating)
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-gray-500'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-gray-900/95 via-gray-900/70 to-transparent h-1/2"></div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-white text-xl group-hover:text-amber-500 transition-colors mb-1">{bottle.name}</h3>
                      <p className="text-amber-500 mb-3">{bottle.brand}</p>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {bottle.price && (
                          <div className="bg-gray-700/50 text-gray-300 text-xs font-medium rounded-full px-2 py-1 flex items-center">
                            <DollarSign className="w-3 h-3 mr-1" />
                            ${bottle.price}
                          </div>
                        )}
                        {bottle.proof && (
                          <div className="bg-gray-700/50 text-gray-300 text-xs font-medium rounded-full px-2 py-1 flex items-center">
                            <Percent className="w-3 h-3 mr-1" />
                            {bottle.proof} Proof
                          </div>
                        )}
                      </div>
                      
                      {bottle.notes && (
                        <p className="text-gray-400 text-sm line-clamp-2 mb-3">{bottle.notes}</p>
                      )}
                      
                      <div className="pt-3 border-t border-gray-700 flex items-center">
                        <span className="text-sm text-gray-400">
                          Added {new Date(bottle.dateAdded).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                        <div className="ml-auto text-amber-500 text-sm group-hover:translate-x-1 transition-transform">
                          View Details
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
            
            {collection.length === 0 && (
              <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 text-center border border-gray-700/50">
                <Wine className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-300 mb-2">This user hasn't added any bottles to their collection yet.</p>
              </div>
            )}
          </>
        )}
        
        {/* Notes Tab Content */}
        {activeTab === 'notes' && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 text-center border border-gray-700/50">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300 mb-2">Tasting notes section coming soon!</p>
          </div>
        )}
        
        {/* Activity Tab Content */}
        {activeTab === 'activity' && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 text-center border border-gray-700/50">
            <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-300 mb-2">Activity feed coming soon!</p>
          </div>
        )}
      </div>
    </div>
  );
} 