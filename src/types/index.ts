export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  collection?: Spirit[];
}

export interface Spirit {
  id: string;
  name: string;
  brand: string;
  type: string;
  category: string;
  description: string | null;
  imageUrl: string | null;
  proof: number | null;
  price: number | null;
  rating: number | null;
  nose: string | null;
  palate: string | null;
  finish: string | null;
  notes: string | null;
  dateAcquired: string | null;
  bottleSize: string | null;
  distillery: string | null;
  bottleLevel: number | null;
  isFavorite: boolean;
  country: string | null;
  region: string | null;
  releaseYear: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  ownerId: string;
}

export interface SpiritFilter {
  name?: string;
  brand?: string;
  type?: string;
  category?: string;
  country?: string;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  minProof?: number;
  maxProof?: number;
  minRating?: number;
  maxRating?: number;
  minYear?: number;
  maxYear?: number;
  favorite?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SortParams {
  field: keyof Spirit;
  direction: 'asc' | 'desc';
}

export interface SpiritResponse {
  data: Spirit[];
  metadata: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
}

export interface Stream {
  id: string;
  title: string;
  host: User;
  participants: User[];
  spirit?: Spirit;
  isLive: boolean;
  startedAt: Date;
} 