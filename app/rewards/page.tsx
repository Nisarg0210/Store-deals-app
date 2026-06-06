'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthState } from '@/lib/auth';
import {
  getStoredGuestId,
  clearStoredGuestId,
  createRegisteredMember,
  getMemberById,
} from '@/lib/rewards';
import RewardsOnboarding from '@/components/RewardsOnboarding';
import RewardsWallet from '@/components/RewardsWallet';

function RewardsPageContent() {
  const searchParams = useSearchParams();
  const signInView = searchParams.get('signin') === '1' ? 'login' as const : 'choose' as const;
  const { user, loading: authLoading } = useAuthState();
  const [memberId, setMemberId] = useState<string | null>(null);
  const [mode, setMode] = useState<'guest' | 'registered' | null>(null);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (authLoading) return;

      try {
        if (user) {
          await createRegisteredMember(
            user.uid,
            user.email ?? '',
            user.displayName ?? undefined
          );
          setMemberId(user.uid);
          setMode('registered');
          return;
        }

        const guestId = getStoredGuestId();
        if (guestId) {
          const member = await getMemberById(guestId);
          if (member) {
            setMemberId(guestId);
            setMode('guest');
            return;
          }
          // Stale local ID (e.g. after rules change) — clear and show onboarding
          clearStoredGuestId();
        }
      } catch {
        clearStoredGuestId();
      } finally {
        setInitLoading(false);
      }
    }

    init();
  }, [user, authLoading]);

  function handleReady(id: string, m: 'guest' | 'registered') {
    setMemberId(id);
    setMode(m);
  }

  const showWallet = memberId && mode;

  return (
    <>
      <div className="bg-mesh" />

      <div className="public-topbar">
        <div className="container public-topbar__inner">
          <Link href="/" className="public-topbar__brand">
            <span className="public-topbar__mark" aria-hidden>🏪</span>
            <span>
              <span className="public-topbar__name">The Market ON James North</span>
              <span className="public-topbar__tagline">Rewards program</span>
            </span>
          </Link>
          <div className="public-topbar__actions">
            <Link href="/rewards?signin=1" className="public-topbar__signin-link">
              Sign in
            </Link>
            <Link href="/" className="rewards-nav-link">
              ← Deals
            </Link>
          </div>
        </div>
      </div>

      <main className="rewards-page">
        <div className="container">
          {initLoading || authLoading ? (
            <div className="rewards-page__loading">
              <div className="skeleton" style={{ height: 120, borderRadius: 16, maxWidth: 480, margin: '0 auto' }} />
            </div>
          ) : showWallet ? (
            <RewardsWallet memberId={memberId} mode={mode} />
          ) : (
            <RewardsOnboarding onReady={handleReady} initialView={signInView} />
          )}
        </div>
      </main>

      <footer className="public-footer">
        <div className="container">
          <p className="public-footer__text">The Market ON James North · Rewards</p>
          <Link href="/admin" className="public-footer__admin-link">Staff sign in</Link>
        </div>
      </footer>
    </>
  );
}

export default function RewardsPage() {
  return (
    <Suspense fallback={
      <div className="rewards-page">
        <div className="container">
          <div className="rewards-page__loading">
            <div className="skeleton" style={{ height: 120, borderRadius: 16, maxWidth: 480, margin: '2rem auto' }} />
          </div>
        </div>
      </div>
    }>
      <RewardsPageContent />
    </Suspense>
  );
}
