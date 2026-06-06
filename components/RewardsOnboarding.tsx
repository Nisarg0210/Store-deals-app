'use client';

import { useState } from 'react';
import { signUpRewards, signIn } from '@/lib/auth';
import {
  createGuestMember,
  createRegisteredMember,
  mergeGuestIntoRegistered,
  getStoredGuestId,
  setStoredGuestId,
  clearStoredGuestId,
} from '@/lib/rewards';

interface RewardsOnboardingProps {
  onReady: (memberId: string, mode: 'guest' | 'registered') => void;
}

export default function RewardsOnboarding({ onReady }: RewardsOnboardingProps) {
  const [mode, setMode] = useState<'choose' | 'register' | 'login'>('choose');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGuest() {
    setLoading(true);
    setError('');
    try {
      let guestId = getStoredGuestId();
      if (!guestId) {
        guestId = crypto.randomUUID();
        setStoredGuestId(guestId);
      }
      await createGuestMember(guestId);
      onReady(guestId, 'guest');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        msg.includes('permission') || msg.includes('PERMISSION_DENIED')
          ? 'Rewards database is not configured yet. Ask staff to update Firestore rules, then try again.'
          : 'Could not start rewards wallet. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await signUpRewards(email, password, name);
      await createRegisteredMember(user.uid, user.email ?? email, name || user.displayName || undefined);
      const guestId = getStoredGuestId();
      if (guestId && guestId !== user.uid) {
        await mergeGuestIntoRegistered(guestId, user.uid);
        clearStoredGuestId();
      }
      onReady(user.uid, 'registered');
    } catch {
      setError('Registration failed. Email may already be in use.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await signIn(email, password);
      await createRegisteredMember(user.uid, user.email ?? email, user.displayName ?? undefined);
      const guestId = getStoredGuestId();
      if (guestId && guestId !== user.uid) {
        await mergeGuestIntoRegistered(guestId, user.uid);
        clearStoredGuestId();
      }
      onReady(user.uid, 'registered');
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'choose') {
    return (
      <div className="rewards-onboard animate-fadeInUp">
        <div className="rewards-onboard__hero">
          <span className="rewards-onboard__icon" aria-hidden>✦</span>
          <h1 className="rewards-onboard__title">
            Earn <span className="gradient-text">rewards</span> every visit
          </h1>
          <p className="rewards-onboard__sub">
            $1 spent = 2 points · 100 points = $1 off your next purchase
          </p>
        </div>

        <div className="rewards-onboard__cards">
          <button
            type="button"
            className="rewards-choice-card rewards-choice-card--primary"
            onClick={() => setMode('register')}
            disabled={loading}
          >
            <span className="rewards-choice-card__icon">🔐</span>
            <span className="rewards-choice-card__title">Create account</span>
            <span className="rewards-choice-card__desc">
              Keep your points forever — sign in on any device
            </span>
          </button>

          <button
            type="button"
            className="rewards-choice-card"
            onClick={handleGuest}
            disabled={loading}
          >
            <span className="rewards-choice-card__icon">⚡</span>
            <span className="rewards-choice-card__title">Quick start</span>
            <span className="rewards-choice-card__desc">
              No sign-up — points saved on this browser only
            </span>
            <span className="rewards-choice-card__warn">
              Lost if you clear browser data or change phones
            </span>
          </button>
        </div>

        <p className="rewards-onboard__login-hint">
          Already have an account?{' '}
          <button type="button" className="rewards-link-btn" onClick={() => setMode('login')}>
            Sign in
          </button>
        </p>

        {error && <p className="rewards-error">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rewards-onboard animate-fadeInUp">
      <button type="button" className="rewards-back-btn" onClick={() => { setMode('choose'); setError(''); }}>
        ← Back
      </button>

      <div className="rewards-onboard__hero">
        <h2 className="rewards-onboard__title" style={{ fontSize: '1.75rem' }}>
          {mode === 'register' ? 'Create your account' : 'Welcome back'}
        </h2>
        <p className="rewards-onboard__sub">
          {mode === 'register'
            ? 'Your points sync across every device you sign in on.'
            : 'Sign in to access your saved rewards.'}
        </p>
      </div>

      <form className="rewards-form card" onSubmit={mode === 'register' ? handleRegister : handleLogin}>
        {mode === 'register' && (
          <div className="form-group">
            <label className="form-label" htmlFor="rw-name">Name</label>
            <input
              id="rw-name"
              className="form-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
        )}
        <div className="form-group">
          <label className="form-label" htmlFor="rw-email">Email</label>
          <input
            id="rw-email"
            className="form-input"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="rw-password">Password</label>
          <input
            id="rw-password"
            className="form-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
        </div>

        {error && <p className="rewards-error">{error}</p>}

        <button type="submit" className="btn btn-primary btn-lg rewards-form__submit" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'register' ? 'Create account & get QR' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
