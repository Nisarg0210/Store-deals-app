'use client';

import { useState, useMemo } from 'react';
import { Deal, DealCategory, SortOption } from '@/lib/types';
import DealCard from './DealCard';

const CATEGORIES: DealCategory[] = [
  'Snacks','Drinks','Dairy','Frozen','Bakery',
  'Personal Care','Household','Candy','Health','Other',
];

interface DealGridProps {
  deals: Deal[];
  loading?: boolean;
  isAdmin?: boolean;
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
  onToggle?: (deal: Deal) => void;
}

export default function DealGrid({ deals, loading, isAdmin, onEdit, onDelete, onToggle }: DealGridProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<DealCategory | 'All'>('All');
  const [sort, setSort] = useState<SortOption>('newest');

  const filtered = useMemo(() => {
    let list = [...deals];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.badge.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (category !== 'All') {
      list = list.filter(d => d.category === category);
    }

    // Sort
    switch (sort) {
      case 'price_asc':
        list.sort((a, b) => a.discountedPrice - b.discountedPrice);
        break;
      case 'price_desc':
        list.sort((a, b) => b.discountedPrice - a.discountedPrice);
        break;
      case 'discount_desc':
        list.sort((a, b) => {
          const discA = (a.originalPrice - a.discountedPrice) / a.originalPrice;
          const discB = (b.originalPrice - b.discountedPrice) / b.originalPrice;
          return discB - discA;
        });
        break;
      case 'newest':
      default:
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [deals, search, category, sort]);

  return (
    <div className="deal-grid-wrapper">
      {/* Controls */}
      <div className="deal-grid__controls">
        {/* Search */}
        <div className="deal-grid__search-wrap">
          <span className="deal-grid__search-icon">🔍</span>
          <input
            id="deal-search"
            type="text"
            className="form-input deal-grid__search"
            placeholder="Search deals..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Sort */}
        <select
          id="deal-sort"
          className="form-select deal-grid__sort"
          value={sort}
          onChange={e => setSort(e.target.value as SortOption)}
        >
          <option value="newest">Newest First</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
          <option value="discount_desc">Biggest Discount</option>
        </select>
      </div>

      {/* Category Chips */}
      <div className="deal-grid__categories">
        <button
          className={`category-chip ${category === 'All' ? 'category-chip--active' : ''}`}
          onClick={() => setCategory('All')}
        >
          All
          <span className="category-chip__count">{deals.length}</span>
        </button>
        {CATEGORIES.map(cat => {
          const count = deals.filter(d => d.category === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              className={`category-chip ${category === cat ? 'category-chip--active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
              <span className="category-chip__count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Results info */}
      {!loading && (
        <p className="deal-grid__count">
          {filtered.length === 0
            ? 'No deals found'
            : `Showing ${filtered.length} deal${filtered.length !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="deal-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="deal-card-skeleton">
              <div className="skeleton" style={{ height: 180 }} />
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="skeleton" style={{ height: 20, width: '60%' }} />
                <div className="skeleton" style={{ height: 14, width: '90%' }} />
                <div className="skeleton" style={{ height: 14, width: '70%' }} />
                <div className="skeleton" style={{ height: 28, width: '40%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <h3>No deals found</h3>
          <p>Try adjusting your search or category filters.</p>
        </div>
      ) : (
        <div className="deal-grid">
          {filtered.map((deal, i) => (
            <div key={deal.id} className="animate-fadeInUp" style={{ animationDelay: `${i * 0.04}s` }}>
              <DealCard
                deal={deal}
                isAdmin={isAdmin}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggle={onToggle}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
