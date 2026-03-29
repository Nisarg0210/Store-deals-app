export type DealBadge =
  | 'Limited Time'
  | 'Clearance'
  | 'Near Expiry'
  | 'Franchise Deal'
  | 'Store Clearance'
  | 'Hot Deal'
  | 'Weekend Special';

export type DealCategory =
  | 'Snacks'
  | 'Drinks'
  | 'Dairy'
  | 'Frozen'
  | 'Bakery'
  | 'Personal Care'
  | 'Household'
  | 'Candy'
  | 'Health'
  | 'Other';

export type SortOption =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'discount_desc';

export interface Deal {
  id: string;
  name: string;
  description: string;
  category: DealCategory;
  badge: DealBadge;
  originalPrice: number;
  discountedPrice: number;
  imageUrl?: string;
  expiryDate?: string; // ISO date string
  active: boolean;
  createdAt: string; // ISO date string
  updatedAt: string;
}

export interface DealFormData {
  name: string;
  description: string;
  category: DealCategory;
  badge: DealBadge;
  originalPrice: number;
  discountedPrice: number;
  imageUrl?: string;
  expiryDate?: string;
  active: boolean;
}
