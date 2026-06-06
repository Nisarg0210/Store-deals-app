'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RewardsMember, RewardsTransaction } from '@/lib/types';
import {
  subscribeToMember,
  subscribeToMemberTransactions,
  buildMemberQrPayload,
  redeemableDollars,
  pointsToNextRedemption,
  POINTS_PER_DOLLAR,
  POINTS_PER_REDEMPTION,
} from '@/lib/rewards';

interface RewardsWalletProps {
  memberId: string;
  mode: 'guest' | 'registered';
}

function formatTransactionType(type: RewardsTransaction['type']): string {
  if (type === 'earn') return 'Points earned';
  if (type === 'redeem') return 'Redeemed';
  return 'Reversed';
}

function useQrSize() {
  const [size, setSize] = useState(280);

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      if (w < 400) setSize(Math.min(300, w - 48));
      else if (w < 768) setSize(280);
      else setSize(260);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return size;
}

export default function RewardsWallet({ memberId, mode }: RewardsWalletProps) {
  const [member, setMember] = useState<RewardsMember | null>(null);
  const [transactions, setTransactions] = useState<RewardsTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrFullscreen, setQrFullscreen] = useState(false);
  const qrSize = useQrSize();

  const qrPayload = useMemo(
    () => (member?.shortCode ? buildMemberQrPayload(member.shortCode) : ''),
    [member?.shortCode]
  );

  useEffect(() => {
    const unsubMember = subscribeToMember(memberId, (m) => {
      setMember(m);
      setLoading(false);
    });
    const unsubTx = subscribeToMemberTransactions(memberId, setTransactions);
    return () => {
      unsubMember();
      unsubTx();
    };
  }, [memberId]);

  const openFullscreen = useCallback(() => {
    setQrFullscreen(true);
    document.documentElement.style.overflow = 'hidden';
  }, []);

  const closeFullscreen = useCallback(() => {
    setQrFullscreen(false);
    document.documentElement.style.overflow = '';
  }, []);

  useEffect(() => {
    if (!qrFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [qrFullscreen, closeFullscreen]);

  const points = member?.points ?? 0;
  const redeemable = redeemableDollars(points);
  const toNext = pointsToNextRedemption(points);
  const progress = ((points % POINTS_PER_REDEMPTION) / POINTS_PER_REDEMPTION) * 100;

  if (loading) {
    return (
      <div className="rewards-wallet rewards-wallet--loading">
        <div className="skeleton" style={{ height: 280, borderRadius: 24 }} />
        <div className="skeleton" style={{ height: 200, borderRadius: 24, marginTop: 16 }} />
      </div>
    );
  }

  return (
    <>
      <div className="rewards-wallet animate-fadeInUp">
        <section className="rewards-balance-card">
          <div className="rewards-balance-card__glow" aria-hidden />
          <div className="rewards-balance-card__top">
            <span className="rewards-balance-card__label">Your balance</span>
            {mode === 'guest' && (
              <span className="rewards-balance-card__badge rewards-balance-card__badge--guest">
                Browser only
              </span>
            )}
            {mode === 'registered' && (
              <span className="rewards-balance-card__badge rewards-balance-card__badge--registered">
                Account saved
              </span>
            )}
          </div>

          <div className="rewards-balance-card__points">
            <span className="rewards-balance-card__value">{points.toLocaleString()}</span>
            <span className="rewards-balance-card__unit">points</span>
          </div>

          <div className="rewards-balance-card__meta">
            <div className="rewards-meta-item">
              <span className="rewards-meta-item__val" style={{ color: 'var(--green)' }}>
                ${redeemable.toFixed(0)}
              </span>
              <span className="rewards-meta-item__label">Ready to redeem</span>
            </div>
            <div className="rewards-meta-item__sep" />
            <div className="rewards-meta-item">
              <span className="rewards-meta-item__val">{toNext}</span>
              <span className="rewards-meta-item__label">Pts to next $1</span>
            </div>
          </div>

          <div className="rewards-progress">
            <div className="rewards-progress__track">
              <div className="rewards-progress__fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="rewards-progress__hint">
              {redeemable > 0
                ? `Ask staff to redeem $${redeemable} at checkout`
                : `${toNext} more points until your next $1 off`}
            </span>
          </div>
        </section>

        <section className="rewards-qr-card card rewards-qr-card--scan">
          <div className="rewards-qr-card__header">
            <h2>Show at checkout</h2>
            <p>Hold steady — staff scans this code to add or redeem points</p>
          </div>

          <div className="rewards-qr-card__code">
            <div className="rewards-qr-plate">
              {qrPayload && (
                <QRCodeSVG
                  value={qrPayload}
                  size={qrSize}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                  includeMargin
                  marginSize={2}
                />
              )}
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg rewards-qr-enlarge"
            onClick={openFullscreen}
          >
            ⛶ Enlarge for scanning
          </button>

          <div className="rewards-qr-card__code-display">
            <span className="form-label">Member code (backup)</span>
            <span className="rewards-member-code">{member?.shortCode ?? '—'}</span>
            <span className="form-hint">Staff can type this code if the scan fails</span>
          </div>
        </section>

        {mode === 'guest' && (
          <div className="rewards-warning card">
            <span className="rewards-warning__icon" aria-hidden>⚠️</span>
            <div>
              <strong>Points saved on this device only</strong>
              <p>
                Create an account to keep your points if you change phones or clear browser data.
              </p>
            </div>
          </div>
        )}

        <section className="rewards-rules card">
          <h3>How it works</h3>
          <ul className="rewards-rules__list">
            <li>
              <span className="rewards-rules__icon">💵</span>
              <span>Earn <strong>{POINTS_PER_DOLLAR} points</strong> for every $1 you spend</span>
            </li>
            <li>
              <span className="rewards-rules__icon">🎁</span>
              <span>Redeem <strong>{POINTS_PER_REDEMPTION} points</strong> for <strong>$1 off</strong></span>
            </li>
            <li>
              <span className="rewards-rules__icon">📱</span>
              <span>Tap enlarge, then show staff your QR at checkout</span>
            </li>
          </ul>
        </section>

        <section className="rewards-history card">
          <h3>Recent activity</h3>
          {transactions.length === 0 ? (
            <p className="rewards-history__empty">No activity yet — make your first purchase to earn points!</p>
          ) : (
            <ul className="rewards-history__list">
              {transactions.map((tx) => (
                <li key={tx.id} className={`rewards-history__item rewards-history__item--${tx.type}`}>
                  <div className="rewards-history__left">
                    <span className="rewards-history__type">{formatTransactionType(tx.type)}</span>
                    <span className="rewards-history__date">
                      {new Date(tx.createdAt).toLocaleString()}
                    </span>
                    {tx.reverted && (
                      <span className="rewards-history__reverted">Reverted</span>
                    )}
                  </div>
                  <div className="rewards-history__right">
                    <span className={`rewards-history__points ${tx.pointsDelta >= 0 ? 'positive' : 'negative'}`}>
                      {tx.pointsDelta >= 0 ? '+' : ''}{tx.pointsDelta} pts
                    </span>
                    {tx.dollarAmount > 0 && (
                      <span className="rewards-history__amount">${tx.dollarAmount.toFixed(2)}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {qrFullscreen && qrPayload && (
        <div
          className="rewards-qr-fullscreen"
          role="dialog"
          aria-label="Enlarged rewards QR code"
          onClick={closeFullscreen}
        >
          <div className="rewards-qr-fullscreen__inner" onClick={(e) => e.stopPropagation()}>
            <p className="rewards-qr-fullscreen__hint">Show this to staff at checkout</p>
            <div className="rewards-qr-plate rewards-qr-plate--fullscreen">
              <QRCodeSVG
                value={qrPayload}
                size={Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 64 : 340)}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                includeMargin
                marginSize={3}
              />
            </div>
            <span className="rewards-member-code rewards-member-code--fullscreen">
              {member?.shortCode}
            </span>
            <button type="button" className="btn btn-secondary btn-lg" onClick={closeFullscreen}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
