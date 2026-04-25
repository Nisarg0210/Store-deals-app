'use client';

import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  getOrCreateGuestId,
  ensureCustomerDoc,
  subscribeToPoints,
  signUpAndLink,
  logInAndRestore,
  loyaltySignOut,
  onLoyaltyAuthChange,
} from '@/lib/loyalty';
import { MIN_REDEEM, POINTS_PER_DOLLAR_REDEEM } from '@/lib/adminLoyalty';

interface Props {
  onClose: () => void;
}

type AuthView = 'card' | 'signup' | 'login';

export default function LoyaltyModal({ onClose }: Props) {
  const [customerId, setCustomerId] = useState('');
  const [points, setPoints] = useState(0);
  const [authView, setAuthView] = useState<AuthView>('card');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState('');
  const [showPw, setShowPw] = useState(false);

  /* ── Initialise ────────────────────────────────────────────────── */
  useEffect(() => {
    const id = getOrCreateGuestId();
    setCustomerId(id);
    ensureCustomerDoc(id);

    const unsubPoints = subscribeToPoints(id, setPoints);
    const unsubAuth = onLoyaltyAuthChange((user) => {
      if (user) {
        setIsLoggedIn(true);
        setUserEmail(user.email ?? '');
      } else {
        setIsLoggedIn(false);
        setUserEmail('');
      }
    });

    return () => {
      unsubPoints();
      unsubAuth();
    };
  }, []);

  /* ── Close on Esc ──────────────────────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  /* ── Handlers ──────────────────────────────────────────────────── */
  const handleSignUp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError('');
      setFormLoading(true);
      const result = await signUpAndLink(email, password, customerId);
      setFormLoading(false);
      if (result.success) {
        setFormSuccess('Account secured! Your points are safe. 🎉');
        setAuthView('card');
      } else {
        setFormError(result.error ?? 'Something went wrong.');
      }
    },
    [email, password, customerId]
  );

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError('');
      setFormLoading(true);
      const result = await logInAndRestore(email, password);
      setFormLoading(false);
      if (result.success) {
        // Refresh the subscription with the new UID
        const newId = localStorage.getItem('loyalty_guest_id') ?? customerId;
        setCustomerId(newId);
        setFormSuccess('Welcome back! Your points have been restored. 🎉');
        setAuthView('card');
      } else {
        setFormError(result.error ?? 'Something went wrong.');
      }
    },
    [email, password, customerId]
  );

  const handleSignOut = async () => {
    await loyaltySignOut();
    setFormSuccess('');
  };

  const resetForm = (view: AuthView) => {
    setEmail('');
    setPassword('');
    setFormError('');
    setFormSuccess('');
    setAuthView(view);
  };

  const dollarValue = (points / POINTS_PER_DOLLAR_REDEEM).toFixed(2);
  const canRedeem = points >= MIN_REDEEM;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="My Loyalty Card"
    >
      <div className="modal loyalty-modal" style={{ maxWidth: 420 }}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="modal-header">
          <h3>
            {authView === 'signup' ? '🔐 Save My Account' :
             authView === 'login' ? '👋 Welcome Back' :
             '🎁 My Loyalty Card'}
          </h3>
          <button
            className="btn btn-secondary btn-icon"
            onClick={onClose}
            aria-label="Close loyalty modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ paddingTop: '1rem' }}>

          {/* ── Main Card View ──────────────────────────────────── */}
          {authView === 'card' && (
            <>
              {/* Success flash */}
              {formSuccess && (
                <div className="loyalty-success-banner">
                  {formSuccess}
                </div>
              )}

              {/* Points Balance */}
              <div className="loyalty-balance-card">
                <span className="loyalty-balance-label">Your Points Balance</span>
                <span className="loyalty-balance-points">{points.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                <span className="loyalty-balance-sub">
                  {canRedeem
                    ? `🎉 Worth $${dollarValue} off! Ask cashier to redeem.`
                    : `Earn ${Math.ceil(MIN_REDEEM - points)} more pts to unlock $${(MIN_REDEEM / POINTS_PER_DOLLAR_REDEEM).toFixed(0)} off`}
                </span>
                {canRedeem && (
                  <div className="loyalty-redeem-badge">Ready to Redeem!</div>
                )}
              </div>

              {/* QR Code */}
              {customerId && (
                <div className="loyalty-qr-wrap">
                  <div className="loyalty-qr-frame">
                    <QRCodeSVG
                      value={customerId}
                      size={180}
                      bgColor="transparent"
                      fgColor="#f0f0f8"
                      level="M"
                    />
                  </div>
                  <p className="loyalty-qr-hint">Show this to the cashier to earn or redeem points</p>
                </div>
              )}

              {/* Progress Bar */}
              <div className="loyalty-progress-wrap">
                <div className="loyalty-progress-bar">
                  <div
                    className="loyalty-progress-fill"
                    style={{ width: `${Math.min(100, (points / MIN_REDEEM) * 100)}%` }}
                  />
                </div>
                <span className="loyalty-progress-label">{points.toLocaleString(undefined, { maximumFractionDigits: 2 })} / {MIN_REDEEM} pts for next reward</span>
              </div>

              <div className="divider" style={{ margin: '1.25rem 0' }} />

              {/* Account Section */}
              {isLoggedIn ? (
                <div className="loyalty-account-row">
                  <div>
                    <span className="loyalty-account-status">✅ Account Secured</span>
                    <span className="loyalty-account-email">{userEmail}</span>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleSignOut}>
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="loyalty-save-prompt">
                  <span className="loyalty-save-icon">⚠️</span>
                  <div className="loyalty-save-text">
                    <strong>Don't lose your points!</strong>
                    <span>Save your account so points survive browser resets or new devices.</span>
                  </div>
                  <div className="loyalty-save-actions">
                    <button
                      id="loyalty-signup-btn"
                      className="btn btn-primary btn-sm"
                      onClick={() => resetForm('signup')}
                    >
                      Save Account
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => resetForm('login')}
                    >
                      Log In
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Sign Up View ─────────────────────────────────────── */}
          {authView === 'signup' && (
            <form onSubmit={handleSignUp} className="loyalty-form">
              <p style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                Create a free account to permanently save your points. If you ever clear your browser or switch phones, just log back in.
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="loyalty-email">Email</label>
                <input
                  id="loyalty-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="form-group" style={{ marginTop: '0.875rem' }}>
                <label className="form-label" htmlFor="loyalty-password">Password</label>
                <div className="password-wrap">
                  <input
                    id="loyalty-password"
                    type={showPw ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Min. 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPw((p) => !p)}
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              {formError && <div className="form-error" style={{ marginTop: '0.75rem' }}>⚠️ {formError}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => resetForm('card')}>
                  Back
                </button>
                <button
                  id="loyalty-signup-submit"
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {formLoading ? '⏳ Saving…' : '🔐 Save My Points'}
                </button>
              </div>
              <p style={{ textAlign: 'center', marginTop: '0.875rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Already have an account?{' '}
                <button type="button" className="loyalty-text-btn" onClick={() => resetForm('login')}>
                  Log in
                </button>
              </p>
            </form>
          )}

          {/* ── Log In View ──────────────────────────────────────── */}
          {authView === 'login' && (
            <form onSubmit={handleLogin} className="loyalty-form">
              <p style={{ marginBottom: '1.25rem', fontSize: '0.875rem' }}>
                Log in to restore your saved points to this device.
              </p>
              <div className="form-group">
                <label className="form-label" htmlFor="loyalty-login-email">Email</label>
                <input
                  id="loyalty-login-email"
                  type="email"
                  className="form-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="form-group" style={{ marginTop: '0.875rem' }}>
                <label className="form-label" htmlFor="loyalty-login-password">Password</label>
                <div className="password-wrap">
                  <input
                    id="loyalty-login-password"
                    type={showPw ? 'text' : 'password'}
                    className="form-input"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPw((p) => !p)}
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              {formError && <div className="form-error" style={{ marginTop: '0.75rem' }}>⚠️ {formError}</div>}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => resetForm('card')}>
                  Back
                </button>
                <button
                  id="loyalty-login-submit"
                  type="submit"
                  className="btn btn-primary"
                  disabled={formLoading}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  {formLoading ? '⏳ Logging in…' : '👋 Restore My Points'}
                </button>
              </div>
              <p style={{ textAlign: 'center', marginTop: '0.875rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                New here?{' '}
                <button type="button" className="loyalty-text-btn" onClick={() => resetForm('signup')}>
                  Save your account
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
