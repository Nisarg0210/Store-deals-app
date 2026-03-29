'use client';

import { signOut } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface AdminHeaderProps {
  email?: string | null;
  activeDeals: number;
  totalDeals: number;
}

export default function AdminHeader({ email, activeDeals, totalDeals }: AdminHeaderProps) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="admin-header">
      <div className="container flex-between" style={{ paddingTop: '1rem', paddingBottom: '1rem' }}>
        {/* Left: Brand */}
        <div className="admin-header__brand">
          <div className="admin-header__logo">🏷️</div>
          <div>
            <h1 className="admin-header__title">Deals Admin</h1>
            <p className="admin-header__sub">Manage your store deals</p>
          </div>
        </div>

        {/* Center: Stats */}
        <div className="admin-header__stats">
          <div className="admin-stat">
            <span className="admin-stat__value" style={{ color: 'var(--green)' }}>{activeDeals}</span>
            <span className="admin-stat__label">Active</span>
          </div>
          <div className="admin-stat__divider" />
          <div className="admin-stat">
            <span className="admin-stat__value">{totalDeals}</span>
            <span className="admin-stat__label">Total</span>
          </div>
          <div className="admin-stat__divider" />
          <div className="admin-stat">
            <span className="admin-stat__value" style={{ color: 'var(--text-muted)' }}>
              {totalDeals - activeDeals}
            </span>
            <span className="admin-stat__label">Hidden</span>
          </div>
        </div>

        {/* Right: User + Sign out */}
        <div className="admin-header__user">
          <div className="admin-header__avatar">
            {email?.[0]?.toUpperCase() ?? 'A'}
          </div>
          <div className="admin-header__email-wrap">
            <span className="admin-header__email">{email}</span>
            <a href="/" target="_blank" className="admin-header__view-link">
              👁 View Public Page ↗
            </a>
          </div>
          <button
            id="admin-signout-btn"
            className="btn btn-secondary btn-sm"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? '…' : '🚪 Sign Out'}
          </button>
        </div>
      </div>
    </header>
  );
}
