'use client';

import { useEffect, useState, useMemo } from 'react';
import { Deal } from '@/lib/types';
import { subscribeToActiveDeals } from '@/lib/deals';
import DealGrid from '@/components/DealGrid';
import CategoryFilter from '@/components/CategoryFilter';
import SearchBar from '@/components/SearchBar';
import SortDropdown, { SortOption } from '@/components/SortDropdown';

export default function PublicPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  const unexpiredDeals = useMemo(() => {
    const now = Date.now();
    return deals.filter(d => {
      if (!d.expiryDate) return true;
      return new Date(d.expiryDate).getTime() > now;
    });
  }, [deals]);

  const categories = useMemo(() => {
    const cats = new Set(unexpiredDeals.map(d => d.category));
    return Array.from(cats);
  }, [unexpiredDeals]);

  const filteredDeals = useMemo(() => {
    let result = unexpiredDeals;
    
    if (selectedCategory !== 'All') {
      result = result.filter(d => d.category === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));
    }
    
    return result.sort((a, b) => {
      if (sortOption === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOption === 'price-asc') {
        return a.discountedPrice - b.discountedPrice;
      }
      if (sortOption === 'price-desc') {
        return b.discountedPrice - a.discountedPrice;
      }
      if (sortOption === 'discount-desc') {
        const discountA = a.originalPrice > 0 ? (a.originalPrice - a.discountedPrice) / a.originalPrice : 0;
        const discountB = b.originalPrice > 0 ? (b.originalPrice - b.discountedPrice) / b.originalPrice : 0;
        return discountB - discountA;
      }
      return 0;
    });
  }, [unexpiredDeals, selectedCategory, searchQuery, sortOption]);

  useEffect(() => {
    const unsub = subscribeToActiveDeals((d) => {
      setDeals(d);
      setLoading(false);
      setLastUpdated(new Date());
    });
    return unsub;
  }, []);

  const totalSavings = unexpiredDeals.reduce((sum, d) => sum + (d.originalPrice - d.discountedPrice), 0);

  return (
    <>
      <div className="bg-mesh" />

      <div className="public-topbar">
        <div className="container public-topbar__inner">
          <a href="/" className="public-topbar__brand">
            <span className="public-topbar__mark" aria-hidden>🏪</span>
            <span>
              <span className="public-topbar__name">The Market ON James North</span>
              <span className="public-topbar__tagline">Today&apos;s offers</span>
            </span>
          </a>
          <div className="public-topbar__live">
            <span className="live-dot" aria-hidden />
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <header className="public-hero">
        <div className="container">
          <div className="public-hero__inner animate-fadeInUp">
            <div className="public-hero__badge">
              <span className="live-dot" />
              Deals board
            </div>

            <h1 className="public-hero__title">
              Save more on <span className="gradient-text">groceries &amp; more</span>
            </h1>
            <p className="public-hero__sub">
              Updated in real time for everyone who scans our in-store QR code — no app required.
            </p>

            {/* Stats strip */}
            {!loading && unexpiredDeals.length > 0 && (
              <div className="public-hero__stats animate-fadeInUp stagger-2">
                <div className="hero-stat">
                  <span className="hero-stat__val">{unexpiredDeals.length}</span>
                  <span className="hero-stat__label">Active Deals</span>
                </div>
                <div className="hero-stat__sep" />
                <div className="hero-stat">
                  <span className="hero-stat__val" style={{ color: 'var(--green)' }}>
                    ${totalSavings.toFixed(0)}+
                  </span>
                  <span className="hero-stat__label">Total Savings</span>
                </div>
                <div className="hero-stat__sep" />
                <div className="hero-stat">
                  <span className="hero-stat__val" style={{ color: 'var(--amber)' }}>
                    {Math.round(unexpiredDeals.reduce((s, d) => s + (d.originalPrice > 0 ? (d.originalPrice - d.discountedPrice) / d.originalPrice * 100 : 0), 0) / (unexpiredDeals.length || 1))}%
                  </span>
                  <span className="hero-stat__label">Avg Discount</span>
                </div>
              </div>
            )}

            {lastUpdated && (
              <p className="public-hero__update">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* ── Deals Grid ───────────────────────────────────────────────── */}
      <main className="public-main">
        <div className="container">
          {loading ? (
            <DealGrid deals={[]} loading />
          ) : deals.length === 0 ? (
            <div className="empty-state" style={{ minHeight: '50vh' }}>
              <div style={{ fontSize: '4rem' }}>🏷️</div>
              <h2>No Active Deals Right Now</h2>
              <p>Check back soon — our staff updates deals throughout the day!</p>
            </div>
          ) : (
            <div>
              <CategoryFilter 
                categories={categories} 
                selectedCategory={selectedCategory} 
                onSelectCategory={setSelectedCategory} 
              />
              <div className="public-filters">
                <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                <SortDropdown sortOption={sortOption} onSortChange={setSortOption} />
              </div>
              
              {filteredDeals.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem 1rem' }}>
                  <p>No deals match your search criteria.</p>
                  <button type="button" className="btn btn-secondary public-clear-filters" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}>Clear Filters</button>
                </div>
              ) : (
                <DealGrid deals={filteredDeals} loading={false} hideControls />
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="public-footer">
        <div className="container">
          <p className="public-footer__text">The Market ON James North · offers update live</p>
          <a href="/admin" className="public-footer__admin-link">Staff sign in</a>
        </div>
      </footer>
    </>
  );
}
