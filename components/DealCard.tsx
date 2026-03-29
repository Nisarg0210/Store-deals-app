'use client';

import { Deal } from '@/lib/types';
import { getDiscountPercent, getExpiryLabel, isExpiringSoon } from '@/lib/deals';

interface DealCardProps {
  deal: Deal;
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
  onToggle?: (deal: Deal) => void;
  isAdmin?: boolean;
}

const BADGE_CLASS: Record<string, string> = {
  'Limited Time':    'badge-limited',
  'Clearance':       'badge-clearance',
  'Near Expiry':     'badge-near-expiry',
  'Franchise Deal':  'badge-franchise',
  'Store Clearance': 'badge-store-clearance',
  'Hot Deal':        'badge-hot',
  'Weekend Special': 'badge-weekend',
};

const CATEGORY_ICONS: Record<string, string> = {
  Snacks: '🍿', Drinks: '🥤', Dairy: '🥛', Frozen: '🧊',
  Bakery: '🥐', 'Personal Care': '🧴', Household: '🏠',
  Candy: '🍬', Health: '💊', Other: '📦',
};

export default function DealCard({ deal, onEdit, onDelete, onToggle, isAdmin }: DealCardProps) {
  const discount = getDiscountPercent(deal.originalPrice, deal.discountedPrice);
  const expiryLabel = getExpiryLabel(deal.expiryDate);
  const expiringSoon = isExpiringSoon(deal.expiryDate, 24);
  const categoryIcon = CATEGORY_ICONS[deal.category] ?? '📦';

  return (
    <div className={`deal-card card ${!deal.active && isAdmin ? 'deal-card--inactive' : ''}`}
         style={{ animationDelay: '0ms' }}>

      {/* Image / Placeholder */}
      <div className="deal-card__image">
        {deal.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deal.imageUrl} alt={deal.name} />
        ) : (
          <div className="deal-card__image-placeholder">
            <span>{categoryIcon}</span>
          </div>
        )}

        {/* Discount Badge */}
        {discount > 0 && (
          <div className="deal-card__discount">
            -{discount}%
          </div>
        )}

        {/* Expiry urgent indicator */}
        {expiringSoon && (
          <div className="deal-card__expiry-urgent">
            ⚡ {expiryLabel}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="deal-card__body">
        <div className="deal-card__meta">
          <span className={`badge ${BADGE_CLASS[deal.badge] ?? ''}`}>●&nbsp;{deal.badge}</span>
          <span className="deal-card__category">{categoryIcon} {deal.category}</span>
        </div>

        <h3 className="deal-card__name">{deal.name}</h3>
        <p className="deal-card__desc">{deal.description}</p>

        <div className="deal-card__pricing">
          <span className="deal-card__price-new">${deal.discountedPrice.toFixed(2)}</span>
          {deal.originalPrice !== deal.discountedPrice && (
            <span className="deal-card__price-old">${deal.originalPrice.toFixed(2)}</span>
          )}
        </div>

        {expiryLabel && !expiringSoon && (
          <div className="deal-card__expiry">🕐 {expiryLabel}</div>
        )}

        {/* Admin controls */}
        {isAdmin && (
          <div className="deal-card__actions">
            <button
              className={`btn btn-sm ${deal.active ? 'btn-secondary' : 'btn-success'}`}
              onClick={() => onToggle?.(deal)}
              title={deal.active ? 'Deactivate' : 'Activate'}
            >
              {deal.active ? '⏸ Hide' : '▶ Show'}
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => onEdit?.(deal)}
            >
              ✏️ Edit
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() => onDelete?.(deal)}
            >
              🗑
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
