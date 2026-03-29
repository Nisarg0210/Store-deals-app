import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { Deal, DealFormData } from './types';

const COLLECTION = 'deals';

function snapshotToDeals(snapshot: QuerySnapshot<DocumentData>): Deal[] {
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      description: data.description,
      category: data.category,
      badge: data.badge,
      originalPrice: data.originalPrice,
      discountedPrice: data.discountedPrice,
      imageUrl: data.imageUrl,
      expiryDate: data.expiryDate,
      active: data.active,
      createdAt: data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : data.createdAt ?? new Date().toISOString(),
      updatedAt: data.updatedAt instanceof Timestamp
        ? data.updatedAt.toDate().toISOString()
        : data.updatedAt ?? new Date().toISOString(),
    } as Deal;
  });
}

/** Fetch all deals once (admin use) */
export async function getDeals(): Promise<Deal[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshotToDeals(snapshot);
}

/** Fetch only active deals once */
export async function getActiveDeals(): Promise<Deal[]> {
  const q = query(
    collection(db, COLLECTION),
    where('active', '==', true),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshotToDeals(snapshot);
}

/** Real-time listener for active deals (public board) */
export function subscribeToActiveDeals(callback: (deals: Deal[]) => void): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('active', '==', true),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshotToDeals(snapshot));
  });
}

/** Real-time listener for all deals (admin) */
export function subscribeToAllDeals(callback: (deals: Deal[]) => void): () => void {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshotToDeals(snapshot));
  });
}

/** Create a new deal */
export async function createDeal(data: DealFormData): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/** Update an existing deal */
export async function updateDeal(id: string, data: Partial<DealFormData>): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/** Toggle deal active status */
export async function toggleDeal(id: string, active: boolean): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, { active, updatedAt: serverTimestamp() });
}

/** Delete a deal */
export async function deleteDeal(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}

/** Calculate discount percentage */
export function getDiscountPercent(original: number, discounted: number): number {
  if (original <= 0) return 0;
  return Math.round(((original - discounted) / original) * 100);
}

/** Check if deal is expiring within N hours */
export function isExpiringSoon(expiryDate: string | undefined, hours = 48): boolean {
  if (!expiryDate) return false;
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  const diff = expiry - now;
  return diff > 0 && diff < hours * 3600 * 1000;
}

/** Get human-readable time-until-expiry */
export function getExpiryLabel(expiryDate: string | undefined): string | null {
  if (!expiryDate) return null;
  const expiry = new Date(expiryDate).getTime();
  const now = Date.now();
  const diffMs = expiry - now;
  if (diffMs <= 0) return 'Expired';
  const diffH = Math.floor(diffMs / (1000 * 3600));
  const diffD = Math.floor(diffH / 24);
  if (diffD > 1) return `${diffD}d left`;
  if (diffH > 0) return `${diffH}h left`;
  const diffM = Math.floor(diffMs / (1000 * 60));
  return `${diffM}m left`;
}
