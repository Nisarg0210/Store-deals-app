'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { getStaffDisplayName } from '@/lib/auth';
import { RewardsMember, RewardsTransaction } from '@/lib/types';
import {
  resolveMemberLookup,
  subscribeToMember,
  subscribeToMemberTransactions,
  earnPoints,
  redeemPoints,
  revertTransaction,
  redeemableDollars,
  dollarsToPoints,
  pointsToRedeem,
  POINTS_PER_DOLLAR,
  POINTS_PER_REDEMPTION,
} from '@/lib/rewards';

interface RewardsStaffPanelProps {
  user: User;
  onToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function RewardsStaffPanel({ user, onToast }: RewardsStaffPanelProps) {
  const [lookupInput, setLookupInput] = useState('');
  const [member, setMember] = useState<RewardsMember | null>(null);
  const [transactions, setTransactions] = useState<RewardsTransaction[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [redeemAmount, setRedeemAmount] = useState('1');
  const [actionLoading, setActionLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const scanContainerId = 'rewards-qr-scanner';

  const staff = {
    keptByName: getStaffDisplayName(user),
    keptByEmail: user.email ?? undefined,
  };

  const loadMember = useCallback(async (input: string) => {
    setLookupLoading(true);
    try {
      const found = await resolveMemberLookup(input);
      if (!found) {
        onToast('Member not found. Check the code or QR.', 'error');
        setMember(null);
        return;
      }
      setMember(found);
      setLookupInput(found.shortCode);
      onToast(`Loaded ${found.displayName || found.shortCode}`, 'info');
    } catch {
      onToast('Failed to look up member.', 'error');
    } finally {
      setLookupLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    if (!member) return;
    const unsub = subscribeToMember(member.id, setMember);
    const unsubTx = subscribeToMemberTransactions(member.id, setTransactions, 15);
    return () => {
      unsub();
      unsubTx();
    };
  }, [member?.id]);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  async function startScanner() {
    if (scanning) return;
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(scanContainerId, { verbose: false });
      scannerRef.current = scanner;

      const viewWidth = Math.min(window.innerWidth, 480);
      const boxSize = Math.max(200, Math.min(280, Math.floor(viewWidth * 0.82)));

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: boxSize, height: boxSize },
          aspectRatio: 1,
          disableFlip: false,
        },
        async (decoded) => {
          await scanner.stop().catch(() => {});
          scannerRef.current = null;
          setScanning(false);
          await loadMember(decoded);
        },
        () => {}
      );
    } catch {
      setScanning(false);
      onToast('Camera access denied or unavailable. Enter the member code below.', 'error');
    }
  }

  async function stopScanner() {
    if (scannerRef.current) {
      await scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  }

  async function handleEarn() {
    if (!member) return;
    const amount = parseFloat(purchaseAmount);
    if (!amount || amount <= 0) {
      onToast('Enter a valid purchase amount.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const result = await earnPoints(member.id, amount, staff);
      setMember(result.member);
      const pts = dollarsToPoints(amount);
      onToast(`Added ${pts} points ($${amount.toFixed(2)} purchase)`);
      setPurchaseAmount('');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to add points.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRedeem() {
    if (!member) return;
    const dollars = parseFloat(redeemAmount);
    if (!dollars || dollars <= 0) {
      onToast('Enter a valid redemption amount.', 'error');
      return;
    }
    const maxRedeem = redeemableDollars(member.points);
    if (dollars > maxRedeem) {
      onToast(`Maximum redeemable: $${maxRedeem}`, 'error');
      return;
    }
    setActionLoading(true);
    try {
      const result = await redeemPoints(member.id, dollars, staff);
      setMember(result.member);
      onToast(`Redeemed $${dollars.toFixed(2)} (${pointsToRedeem(dollars)} points)`);
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Redemption failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRevert(tx: RewardsTransaction) {
    if (tx.reverted || tx.type === 'revert') return;
    if (!confirm(`Revert this ${tx.type} transaction (${tx.pointsDelta >= 0 ? '+' : ''}${tx.pointsDelta} pts)?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const result = await revertTransaction(tx.id, staff);
      setMember(result.member);
      onToast('Transaction reverted.');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Revert failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  const maxRedeem = member ? redeemableDollars(member.points) : 0;
  const previewPoints = purchaseAmount ? dollarsToPoints(parseFloat(purchaseAmount) || 0) : 0;

  return (
    <div className="rewards-staff">
      {/* Lookup */}
      <section className="rewards-staff__lookup card">
        <h3>Find customer</h3>
        <p className="rewards-staff__hint">Scan their QR code or enter their member code</p>

        <div className="rewards-staff__scan-area">
          <div
            id={scanContainerId}
            className={`rewards-scanner ${scanning ? 'rewards-scanner--active' : ''}`}
          />
          {!scanning && (
            <div className="rewards-scanner__placeholder">
              <span>📷</span>
              <p>Camera scanner</p>
            </div>
          )}
        </div>

        <div className="rewards-staff__scan-actions">
          {!scanning ? (
            <button type="button" className="btn btn-primary" onClick={startScanner}>
              Open scanner
            </button>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={stopScanner}>
              Close scanner
            </button>
          )}
        </div>

        <div className="rewards-staff__manual">
          <div className="form-group">
            <label className="form-label" htmlFor="member-lookup">Member code or ID</label>
            <div className="rewards-staff__lookup-row">
              <input
                id="member-lookup"
                className="form-input"
                type="text"
                placeholder="e.g. AB3K7NP2"
                value={lookupInput}
                onChange={(e) => setLookupInput(e.target.value.toUpperCase())}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => loadMember(lookupInput)}
                disabled={lookupLoading || !lookupInput.trim()}
              >
                {lookupLoading ? '…' : 'Load'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {member && (
        <>
          {/* Member card */}
          <section className="rewards-staff__member card">
            <div className="rewards-staff__member-header">
              <div>
                <h3>{member.displayName || 'Customer'}</h3>
                <span className="rewards-member-code">{member.shortCode}</span>
                {member.email && (
                  <span className="rewards-staff__email">{member.email}</span>
                )}
              </div>
              <div className="rewards-staff__member-badge">
                {member.type === 'registered' ? '🔐 Account' : '⚡ Browser'}
              </div>
            </div>

            <div className="rewards-staff__member-stats">
              <div className="rewards-staff__stat">
                <span className="rewards-staff__stat-val">{member.points.toLocaleString()}</span>
                <span className="rewards-staff__stat-label">Points</span>
              </div>
              <div className="rewards-staff__stat-sep" />
              <div className="rewards-staff__stat">
                <span className="rewards-staff__stat-val" style={{ color: 'var(--green)' }}>
                  ${maxRedeem}
                </span>
                <span className="rewards-staff__stat-label">Can redeem</span>
              </div>
            </div>
          </section>

          {/* Earn points */}
          <section className="rewards-staff__action card">
            <h3>💵 Add points from purchase</h3>
            <p className="rewards-staff__hint">
              ${'1'} spent = {POINTS_PER_DOLLAR} points
            </p>
            <div className="rewards-staff__action-row">
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label" htmlFor="purchase-amt">Purchase amount ($)</label>
                <input
                  id="purchase-amt"
                  className="form-input"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={purchaseAmount}
                  onChange={(e) => setPurchaseAmount(e.target.value)}
                />
              </div>
              <button
                type="button"
                className="btn btn-success btn-lg"
                onClick={handleEarn}
                disabled={actionLoading || !purchaseAmount}
              >
                +{previewPoints || '…'} pts
              </button>
            </div>
          </section>

          {/* Redeem */}
          {maxRedeem > 0 && (
            <section className="rewards-staff__action card rewards-staff__action--redeem">
              <h3>🎁 Redeem points</h3>
              <p className="rewards-staff__hint">
                {POINTS_PER_REDEMPTION} points = $1 off (max ${maxRedeem} available)
              </p>
              <div className="rewards-staff__redeem-btns">
                {Array.from({ length: maxRedeem }, (_, i) => i + 1)
                  .filter((d) => d <= 5)
                  .map((d) => (
                    <button
                      key={d}
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => { setRedeemAmount(String(d)); }}
                      disabled={actionLoading}
                    >
                      ${d}
                    </button>
                  ))}
              </div>
              <div className="rewards-staff__action-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="redeem-amt">Redeem amount ($)</label>
                  <input
                    id="redeem-amt"
                    className="form-input"
                    type="number"
                    min="1"
                    max={maxRedeem}
                    step="1"
                    value={redeemAmount}
                    onChange={(e) => setRedeemAmount(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleRedeem}
                  disabled={actionLoading}
                >
                  Redeem
                </button>
              </div>
            </section>
          )}

          {/* Transactions + revert */}
          <section className="rewards-staff__history card">
            <h3>Recent transactions</h3>
            {transactions.length === 0 ? (
              <p className="rewards-staff__hint">No transactions yet for this customer.</p>
            ) : (
              <ul className="rewards-staff__tx-list">
                {transactions.map((tx) => (
                  <li key={tx.id} className="rewards-staff__tx-item">
                    <div className="rewards-staff__tx-info">
                      <span className={`rewards-staff__tx-type rewards-staff__tx-type--${tx.type}`}>
                        {tx.type}
                      </span>
                      <span className="rewards-staff__tx-detail">
                        {tx.pointsDelta >= 0 ? '+' : ''}{tx.pointsDelta} pts
                        {tx.dollarAmount > 0 && ` · $${tx.dollarAmount.toFixed(2)}`}
                      </span>
                      <span className="rewards-staff__tx-date">
                        {new Date(tx.createdAt).toLocaleString()} · {tx.staffName}
                      </span>
                      {tx.reverted && <span className="rewards-history__reverted">Reverted</span>}
                    </div>
                    {!tx.reverted && tx.type !== 'revert' && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRevert(tx)}
                        disabled={actionLoading}
                      >
                        Revert
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
