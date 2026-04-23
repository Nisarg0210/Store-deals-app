'use client';

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { useAuthState, getStaffDisplayName } from '@/lib/auth';
import { createDeal, updateDeal, deleteDeal, toggleDeal, subscribeToAllDeals, isExpired } from '@/lib/deals';
import { Deal, DealFormData } from '@/lib/types';
import AdminHeader from '@/components/AdminHeader';
import DealGrid from '@/components/DealGrid';
import DealForm from '@/components/DealForm';
import QRCodePanel from '@/components/QRCodePanel';
import Toast from '@/components/Toast';

// LoginForm moved to AdminGuard

/* ── Toast state type ────────────────────────────────────────────────── */
interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

/* ── Admin Dashboard ─────────────────────────────────────────────────── */
function AdminDashboard({ user }: { user: User }) {
  const userEmail = user.email ?? '';
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Deal | null>(null);
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [tab, setTab] = useState<'deals' | 'qr'>('deals');
  const [dealFilter, setDealFilter] = useState<'all' | 'active' | 'hidden'>('all');

  const publicUrl = typeof window !== 'undefined'
    ? window.location.origin
    : 'https://yourstore.com';

  // Real-time listener
  useEffect(() => {
    const unsub = subscribeToAllDeals((d) => {
      setDeals(d);
      setLoading(false);
    });
    return unsub;
  }, []);

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }
  function removeToast(id: number) {
    setToasts(prev => prev.filter(t => t.id !== id));
  }

  /* ── CRUD handlers ─ */
  async function handleSave(data: DealFormData) {
    const staff = {
      keptByName: getStaffDisplayName(user),
      keptByEmail: user.email ?? undefined,
    };
    if (editingDeal) {
      await updateDeal(editingDeal.id, data, staff);
      showToast('Deal updated successfully!');
    } else {
      await createDeal(data, staff);
      showToast('New deal created!');
    }
    setFormOpen(false);
    setEditingDeal(null);
  }

  function openCreate() {
    setEditingDeal(null);
    setFormOpen(true);
  }
  function openEdit(deal: Deal) {
    setEditingDeal(deal);
    setFormOpen(true);
  }

  async function handleToggle(deal: Deal) {
    try {
      await toggleDeal(deal.id, !deal.active);
      showToast(`Deal ${!deal.active ? 'activated' : 'hidden'}.`);
    } catch {
      showToast('Failed to update deal.', 'error');
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;
    try {
      await deleteDeal(deleteConfirm.id);
      showToast('Deal deleted.');
    } catch {
      showToast('Failed to delete deal.', 'error');
    } finally {
      setDeleteConfirm(null);
    }
  }

  const activeDealsCount = deals.filter(d => d.active && !isExpired(d.expiryDate)).length;
  const hiddenDealsCount = deals.filter(d => !d.active || isExpired(d.expiryDate)).length;

  const filteredDeals = deals.filter(d => {
    if (dealFilter === 'active') return d.active && !isExpired(d.expiryDate);
    if (dealFilter === 'hidden') return !d.active || isExpired(d.expiryDate);
    return true;
  });

  return (
    <>
      <div className="bg-mesh" />

      <AdminHeader
        email={userEmail}
        displayName={user.displayName ?? undefined}
        activeDeals={activeDealsCount}
        totalDeals={deals.length}
      />

      {/* ── Tab Bar ─────────────────────────────────────────────────── */}
      <div className="admin-tabs">
        <div className="container">
          <div className="tab-bar">
            <button
              id="tab-deals"
              className={`tab-btn ${tab === 'deals' ? 'tab-btn--active' : ''}`}
              onClick={() => setTab('deals')}
            >
              🏷️ Deals ({deals.length})
            </button>
            <button
              id="tab-qr"
              className={`tab-btn ${tab === 'qr' ? 'tab-btn--active' : ''}`}
              onClick={() => setTab('qr')}
            >
              🔲 QR Code
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────── */}
      <main className="admin-main">
        <div className="container">
          {tab === 'deals' ? (
            <>
              {/* Action bar */}
              <div className="admin-action-bar">
                <div>
                  <h2 style={{ fontSize: '1.25rem' }}>All Deals</h2>
                  <p style={{ fontSize: '0.85rem' }}>
                    {activeDealsCount} active · {hiddenDealsCount} hidden
                  </p>
                </div>
                <button
                  id="create-deal-btn"
                  className="btn btn-primary"
                  onClick={openCreate}
                >
                  ＋ New Deal
                </button>
              </div>

              {/* Active / Hidden filter */}
              <div className="admin-deal-filter">
                <button
                  id="filter-all"
                  className={`admin-filter-btn ${dealFilter === 'all' ? 'admin-filter-btn--active' : ''}`}
                  onClick={() => setDealFilter('all')}
                >
                  All <span className="admin-filter-count">{deals.length}</span>
                </button>
                <button
                  id="filter-active"
                  className={`admin-filter-btn admin-filter-btn--green ${dealFilter === 'active' ? 'admin-filter-btn--active' : ''}`}
                  onClick={() => setDealFilter('active')}
                >
                  ✅ Active <span className="admin-filter-count">{activeDealsCount}</span>
                </button>
                <button
                  id="filter-hidden"
                  className={`admin-filter-btn admin-filter-btn--muted ${dealFilter === 'hidden' ? 'admin-filter-btn--active' : ''}`}
                  onClick={() => setDealFilter('hidden')}
                >
                  🚫 Hidden <span className="admin-filter-count">{hiddenDealsCount}</span>
                </button>
              </div>

              <DealGrid
                deals={filteredDeals}
                loading={loading}
                isAdmin
                onEdit={openEdit}
                onDelete={setDeleteConfirm}
                onToggle={handleToggle}
              />
            </>
          ) : (
            <div className="qr-page-layout">
              <QRCodePanel url={`${publicUrl}?ref=qr`} storeName="The Market ON James North" />
              <div className="qr-instructions card">
                <h3>📋 How to use</h3>
                <ol>
                  <li>Print the QR code and display it at your store entrance or checkout.</li>
                  <li>Customers scan it with their phone camera to see all active deals instantly.</li>
                  <li>The deals board updates in <strong>real time</strong> — no refresh needed.</li>
                  <li>Toggle deals on/off from the Deals tab to instantly show or hide them.</li>
                </ol>
                <div className="divider" style={{ margin: '1rem 0' }} />
                <h3>💡 Tips</h3>
                <ul>
                  <li>Use <strong>Deal type</strong> (e.g. Near Expiry) when editing a deal — it appears only here for staff, not on the public board.</li>
                  <li>Set an <strong>Expiry Date</strong> so customers see a countdown timer.</li>
                  <li>Upload product photos for better visual appeal.</li>
                  <li>Use the <strong>Biggest Discount</strong> sort to promote high-value deals.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Deal Form Modal ───────────────────────────────────────────── */}
      {formOpen && (
        <DealForm
          deal={editingDeal}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingDeal(null); }}
        />
      )}

      {/* ── Delete Confirm Modal ──────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3>🗑️ Delete Deal</h3>
              <button className="btn btn-secondary btn-icon" onClick={() => setDeleteConfirm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete <strong>&ldquo;{deleteConfirm.name}&rdquo;</strong>?
                This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button id="confirm-delete-btn" className="btn btn-danger" onClick={handleDelete}>
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toasts ───────────────────────────────────────────────────── */}
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}
    </>
  );
}

/* ── Page entry point ────────────────────────────────────────────────── */
export default function AdminPage() {
  const { user } = useAuthState();
  if (!user) return null; // Handled by AdminGuard wrapper
  return <AdminDashboard user={user} />;
}
