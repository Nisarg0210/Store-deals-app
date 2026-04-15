export type DealBadge =
  | 'Store Clearance'
  | 'Franchise Deal'
  | 'Manager Special'
  | 'NearExpiry Deal'
  | 'Weekend Special'
  | 'Limited Time';

export type DealCategory =
  | 'Bakery'
  | 'Beverages'
  | 'Chips'
  | 'Chocolates & Candy'
  | 'Cleaning GM'
  | 'Dairy Cooler'
  | 'Frozen'
  | 'Grocery'
  | 'Medicine'
  | 'Pet'
  | 'Snacks'
  | 'Prepared Foods'
  | 'Alcohol';

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
  /** Staff who last created/updated this deal (admin-only display) */
  keptByName?: string;
  keptByEmail?: string;
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
