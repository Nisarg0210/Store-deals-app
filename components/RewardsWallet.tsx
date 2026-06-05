'use client';

import { useEffect, useState, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { RewardsMember, RewardsTransaction } from '@/lib/types';
import {
  subscribeToMember,
  subscribeToMemberTransactions,
  buildMemberQrUrl,
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

export default function RewardsWallet({ memberId, mode }: RewardsWalletProps) {
  const [member, setMember] = useState<RewardsMember | null>(null);
  const [transactions, setTransactions] = useState<RewardsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const qrUrl = useMemo(() => buildMemberQrUrl(memberId), [memberId]);

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
    <div className="rewards-wallet animate-fadeInUp">
      {/* Points hero */}
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

      {/* QR Code */}
      <section className="rewards-qr-card card">
        <div className="rewards-qr-card__header">
          <h2>Show at checkout</h2>
          <p>Staff scans this to add or redeem your points</p>
        </div>

        <div className="rewards-qr-card__code">
          <div className="qr-frame rewards-qr-frame">
            <div className="qr-corner qr-corner--tl" />
            <div className="qr-corner qr-corner--tr" />
            <div className="qr-corner qr-corner--bl" />
            <div className="qr-corner qr-corner--br" />
            <QRCodeSVG
              value={qrUrl}
              size={200}
              bgColor="transparent"
              fgColor="#f0f0f8"
              level="H"
              includeMargin={false}
            />
          </div>
        </div>

        <div className="rewards-qr-card__code-display">
          <span className="form-label">Member code</span>
          <span className="rewards-member-code">{member?.shortCode ?? '—'}</span>
          <span className="form-hint">Staff can enter this code if scanning isn&apos;t available</span>
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

      {/* How it works */}
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
            <span>Show your QR code at checkout every time</span>
          </li>
        </ul>
      </section>

      {/* Transaction history */}
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
  );
}
