
export interface Chalet {
  id: string;
  slug: string;
  name: string;
  description: string;
  capacity: string;
  amenities: string[];
  coverImage: string;
  images: string[];
  basePrice: number;
}

export interface ReservationData {
  chaletId: string;
  chaletName: string;
  checkIn: Date | null;
  checkOut: Date | null;
  guests: number;
}

export interface GalleryItem {
  id: string;
  chaletId: string; // 'general' ou ID do chalé
  type: 'image' | 'video';
  url: string;
  description: string;
  createdAt?: number;
}
