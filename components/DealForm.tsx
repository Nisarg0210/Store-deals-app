'use client';

import { useState, useEffect } from 'react';
import { Deal, DealFormData, DealBadge, DealCategory } from '@/lib/types';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const BADGES: DealBadge[] = [
  'Limited Time','Clearance','Near Expiry','Franchise Deal',
  'Store Clearance','Hot Deal','Weekend Special',
];

const CATEGORIES: DealCategory[] = [
  'Snacks','Drinks','Dairy','Frozen','Bakery',
  'Personal Care','Household','Candy','Health','Other',
];

interface DealFormProps {
  deal?: Deal | null;         // null = create mode
  onSave: (data: DealFormData) => Promise<void>;
  onClose: () => void;
}

const EMPTY: DealFormData = {
  name: '',
  description: '',
  category: 'Snacks',
  badge: 'Hot Deal',
  originalPrice: 0,
  discountedPrice: 0,
  imageUrl: '',
  expiryDate: '',
  active: true,
};

export default function DealForm({ deal, onSave, onClose }: DealFormProps) {
  const [form, setForm] = useState<DealFormData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (deal) {
      setForm({
        name: deal.name,
        description: deal.description,
        category: deal.category,
        badge: deal.badge,
        originalPrice: deal.originalPrice,
        discountedPrice: deal.discountedPrice,
        imageUrl: deal.imageUrl ?? '',
        expiryDate: deal.expiryDate
          ? deal.expiryDate.split('T')[0]
          : '',
        active: deal.active,
      });
    } else {
      setForm(EMPTY);
    }
  }, [deal]);

  function set<K extends keyof DealFormData>(key: K, value: DealFormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const storageRef = ref(storage, `deals/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      set('imageUrl', url);
    } catch {
      setError('Image upload failed. Check Firebase Storage rules.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) return setError('Deal name is required.');
    if (form.originalPrice <= 0) return setError('Original price must be > 0.');
    if (form.discountedPrice < 0) return setError('Discounted price cannot be negative.');
    if (form.discountedPrice > form.originalPrice) return setError('Discounted price must be ≤ original price.');

    const data: DealFormData = {
      ...form,
      originalPrice: Number(form.originalPrice),
      discountedPrice: Number(form.discountedPrice),
      expiryDate: form.expiryDate
        ? new Date(form.expiryDate).toISOString()
        : undefined,
      imageUrl: form.imageUrl || undefined,
    };

    setSaving(true);
    try {
      await onSave(data);
      onClose();
    } catch {
      setError('Failed to save deal. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const discount = form.originalPrice > 0 && form.discountedPrice <= form.originalPrice
    ? Math.round(((form.originalPrice - form.discountedPrice) / form.originalPrice) * 100)
    : 0;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={deal ? 'Edit Deal' : 'New Deal'}>
        <div className="modal-header">
          <h3>{deal ? '✏️ Edit Deal' : '➕ New Deal'}</h3>
          <button className="btn btn-secondary btn-icon" onClick={onClose} title="Close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Row 1: Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="df-name">Deal Name *</label>
              <input id="df-name" className="form-input" type="text" placeholder="e.g. Lay's Classic Chips"
                value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>

            {/* Row 2: Description */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label" htmlFor="df-desc">Description</label>
              <textarea id="df-desc" className="form-textarea" placeholder="Brief description of the deal..."
                value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
            </div>

            {/* Row 3: Category + Badge */}
            <div className="form-row" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="df-cat">Category</label>
                <select id="df-cat" className="form-select"
                  value={form.category} onChange={e => set('category', e.target.value as DealCategory)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="df-badge">Badge</label>
                <select id="df-badge" className="form-select"
                  value={form.badge} onChange={e => set('badge', e.target.value as DealBadge)}>
                  {BADGES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            {/* Row 4: Prices */}
            <div className="form-row" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="df-orig">Original Price ($) *</label>
                <input id="df-orig" className="form-input" type="number" step="0.01" min="0.01" placeholder="0.00"
                  value={form.originalPrice || ''} onChange={e => set('originalPrice', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="df-disc">
                  Discounted Price ($) *
                  {discount > 0 && <span style={{ color: 'var(--green)', marginLeft: '0.5rem', fontWeight: 700 }}>−{discount}%</span>}
                </label>
                <input id="df-disc" className="form-input" type="number" step="0.01" min="0" placeholder="0.00"
                  value={form.discountedPrice || ''} onChange={e => set('discountedPrice', parseFloat(e.target.value) || 0)} />
              </div>
            </div>

            {/* Row 5: Expiry Date */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label" htmlFor="df-expiry">Expiry Date (optional)</label>
              <input id="df-expiry" className="form-input" type="date"
                value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
            </div>

            {/* Row 6: Image Upload */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label" htmlFor="df-img">Product Image</label>
              <div className="image-upload-area">
                {form.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.imageUrl} alt="Preview" className="image-preview" />
                )}
                <div className="image-upload-controls">
                  <input id="df-img" type="file" accept="image/*" onChange={handleImageUpload}
                    style={{ display: 'none' }} />
                  <label htmlFor="df-img" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                    {uploading ? '⏳ Uploading…' : form.imageUrl ? '🔄 Replace Image' : '📷 Upload Image'}
                  </label>
                  {form.imageUrl && (
                    <button type="button" className="btn btn-danger btn-sm"
                      onClick={() => set('imageUrl', '')}>✕ Remove</button>
                  )}
                </div>
                <input className="form-input" type="url" placeholder="Or paste image URL..."
                  value={form.imageUrl} onChange={e => set('imageUrl', e.target.value)}
                  style={{ marginTop: '0.5rem' }} />
              </div>
            </div>

            {/* Row 7: Active toggle */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="toggle-label">
                <input type="checkbox" className="toggle-input"
                  checked={form.active} onChange={e => set('active', e.target.checked)} />
                <span className="toggle-track">
                  <span className="toggle-thumb" />
                </span>
                <span style={{ fontSize: '0.875rem', color: form.active ? 'var(--green)' : 'var(--text-muted)' }}>
                  {form.active ? '✓ Active — visible on deals board' : 'Hidden from public board'}
                </span>
              </label>
            </div>

            {error && (
              <div className="form-error" style={{ marginTop: '1rem' }}>
                ⚠️ {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
              {saving ? '⏳ Saving…' : deal ? 'Save Changes' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
