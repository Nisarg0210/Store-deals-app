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

/* ── Rewards Program ─────────────────────────────────────────── */

export type RewardsMemberType = 'registered' | 'guest';

export type RewardsTransactionType = 'earn' | 'redeem' | 'revert';

export interface RewardsMember {
  id: string;
  type: RewardsMemberType;
  shortCode: string;
  email?: string;
  displayName?: string;
  points: number;
  totalEarned: number;
  totalRedeemed: number;
  createdAt: string;
  updatedAt: string;
}

export interface RewardsTransaction {
  id: string;
  memberId: string;
  type: RewardsTransactionType;
  /** Purchase or redemption dollar amount */
  dollarAmount: number;
  /** Positive for earn/revert-of-redeem; negative for redeem/revert-of-earn */
  pointsDelta: number;
  staffName: string;
  staffEmail?: string;
  note?: string;
  reverted: boolean;
  revertedByTransactionId?: string;
  revertsTransactionId?: string;
  createdAt: string;
}

