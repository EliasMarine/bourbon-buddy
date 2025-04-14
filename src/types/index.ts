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
  type: string;
  brand: string;
  description?: string;
  imageUrl?: string;
  webImageUrl?: string;
  proof?: number;
  price?: number;
  rating?: number;
  nose?: string | string[];
  palate?: string | string[];
  finish?: string | string[];
  notes?: string;
  isFavorite?: boolean;
  bottleLevel?: number;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
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