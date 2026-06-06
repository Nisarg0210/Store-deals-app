import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  runTransaction,
  setDoc,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { StaffAttribution } from './deals';
import {
  RewardsMember,
  RewardsTransaction,
  RewardsTransactionType,
} from './types';

const MEMBERS_COLLECTION = 'rewardsMembers';
const TRANSACTIONS_COLLECTION = 'rewardsTransactions';

export const POINTS_PER_DOLLAR = 2;
export const POINTS_PER_REDEMPTION = 100;
export const REDEMPTION_VALUE = 1;

const GUEST_STORAGE_KEY = 'jn_rewards_guest_id';

export function dollarsToPoints(dollars: number): number {
  return Math.round(dollars * POINTS_PER_DOLLAR);
}

export function redeemableDollars(points: number): number {
  return Math.floor(points / POINTS_PER_REDEMPTION) * REDEMPTION_VALUE;
}

export function pointsToRedeem(dollars: number): number {
  return dollars * POINTS_PER_REDEMPTION;
}

export function pointsToNextRedemption(points: number): number {
  const remainder = points % POINTS_PER_REDEMPTION;
  return remainder === 0 ? POINTS_PER_REDEMPTION : POINTS_PER_REDEMPTION - remainder;
}

function generateShortCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function timestampToIso(value: unknown): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function snapshotToMember(id: string, data: DocumentData): RewardsMember {
  return {
    id,
    type: data.type,
    shortCode: data.shortCode,
    email: data.email,
    displayName: data.displayName,
    points: data.points ?? 0,
    totalEarned: data.totalEarned ?? 0,
    totalRedeemed: data.totalRedeemed ?? 0,
    createdAt: timestampToIso(data.createdAt),
    updatedAt: timestampToIso(data.updatedAt),
  };
}

function snapshotToTransaction(id: string, data: DocumentData): RewardsTransaction {
  return {
    id,
    memberId: data.memberId,
    type: data.type,
    dollarAmount: data.dollarAmount,
    pointsDelta: data.pointsDelta,
    staffName: data.staffName,
    staffEmail: data.staffEmail,
    note: data.note,
    reverted: data.reverted ?? false,
    revertedByTransactionId: data.revertedByTransactionId,
    revertsTransactionId: data.revertsTransactionId,
    createdAt: timestampToIso(data.createdAt),
  };
}

function snapshotToTransactions(snapshot: QuerySnapshot<DocumentData>): RewardsTransaction[] {
  return snapshot.docs.map((d) => snapshotToTransaction(d.id, d.data()));
}

/* ── Local guest storage ─────────────────────────────────────── */

export function getStoredGuestId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(GUEST_STORAGE_KEY);
}

export function setStoredGuestId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GUEST_STORAGE_KEY, id);
}

export function clearStoredGuestId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_STORAGE_KEY);
}

/* ── QR helpers ──────────────────────────────────────────────── */

export function buildMemberQrUrl(memberId: string, origin?: string): string {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/rewards?member=${memberId}`;
}

export function parseMemberIdFromScan(data: string): string | null {
  const trimmed = data.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const member = url.searchParams.get('member');
    if (member) return member;
  } catch {
    // not a URL
  }

  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

/* ── Member CRUD ─────────────────────────────────────────────── */

async function createUniqueShortCode(): Promise<string> {
  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      const code = generateShortCode();
      const q = query(collection(db, MEMBERS_COLLECTION), where('shortCode', '==', code), limit(1));
      const snap = await getDocs(q);
      if (snap.empty) return code;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('permission') || msg.includes('PERMISSION_DENIED')) {
      throw new Error('Firestore permission denied — rewards rules must be deployed.');
    }
    throw err;
  }
  throw new Error('Could not generate member code. Please try again.');
}

export async function createGuestMember(guestId: string): Promise<RewardsMember> {
  const ref = doc(db, MEMBERS_COLLECTION, guestId);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return snapshotToMember(guestId, existing.data());
  }

  const shortCode = await createUniqueShortCode();
  const now = serverTimestamp();
  await setDoc(ref, {
    type: 'guest',
    shortCode,
    points: 0,
    totalEarned: 0,
    totalRedeemed: 0,
    createdAt: now,
    updatedAt: now,
  });

  const created = await getDoc(ref);
  return snapshotToMember(guestId, created.data()!);
}

export async function createRegisteredMember(
  uid: string,
  email: string,
  displayName?: string
): Promise<RewardsMember> {
  const ref = doc(db, MEMBERS_COLLECTION, uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    return snapshotToMember(uid, existing.data());
  }

  const shortCode = await createUniqueShortCode();
  const now = serverTimestamp();
  await setDoc(ref, {
    type: 'registered',
    shortCode,
    email,
    displayName: displayName?.trim() || email.split('@')[0],
    points: 0,
    totalEarned: 0,
    totalRedeemed: 0,
    createdAt: now,
    updatedAt: now,
  });

  const created = await getDoc(ref);
  return snapshotToMember(uid, created.data()!);
}

export async function mergeGuestIntoRegistered(
  guestId: string,
  registeredId: string
): Promise<RewardsMember> {
  const guestRef = doc(db, MEMBERS_COLLECTION, guestId);
  const regRef = doc(db, MEMBERS_COLLECTION, registeredId);

  return runTransaction(db, async (tx) => {
    const guestSnap = await tx.get(guestRef);
    const regSnap = await tx.get(regRef);
    if (!guestSnap.exists() || !regSnap.exists()) {
      throw new Error('Could not merge accounts.');
    }

    const guest = guestSnap.data();
    const reg = regSnap.data();
    const mergedPoints = (reg.points ?? 0) + (guest.points ?? 0);
    const mergedEarned = (reg.totalEarned ?? 0) + (guest.totalEarned ?? 0);
    const mergedRedeemed = (reg.totalRedeemed ?? 0) + (guest.totalRedeemed ?? 0);

    tx.update(regRef, {
      points: mergedPoints,
      totalEarned: mergedEarned,
      totalRedeemed: mergedRedeemed,
      updatedAt: serverTimestamp(),
    });

    tx.update(guestRef, {
      points: 0,
      mergedInto: registeredId,
      updatedAt: serverTimestamp(),
    });

    return snapshotToMember(registeredId, {
      ...reg,
      points: mergedPoints,
      totalEarned: mergedEarned,
      totalRedeemed: mergedRedeemed,
    });
  });
}

export async function getMemberById(id: string): Promise<RewardsMember | null> {
  const snap = await getDoc(doc(db, MEMBERS_COLLECTION, id));
  if (!snap.exists()) return null;
  return snapshotToMember(snap.id, snap.data());
}

export async function getMemberByShortCode(code: string): Promise<RewardsMember | null> {
  const normalized = code.trim().toUpperCase();
  const q = query(
    collection(db, MEMBERS_COLLECTION),
    where('shortCode', '==', normalized),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return snapshotToMember(d.id, d.data());
}

export async function resolveMemberLookup(input: string): Promise<RewardsMember | null> {
  const memberId = parseMemberIdFromScan(input);
  if (memberId) {
    const byId = await getMemberById(memberId);
    if (byId) return byId;
  }
  if (/^[A-Z0-9]{6,10}$/i.test(input.trim())) {
    return getMemberByShortCode(input);
  }
  return null;
}

export function subscribeToMember(
  memberId: string,
  callback: (member: RewardsMember | null) => void
): () => void {
  return onSnapshot(doc(db, MEMBERS_COLLECTION, memberId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback(snapshotToMember(snap.id, snap.data()));
  });
}

export function subscribeToMemberTransactions(
  memberId: string,
  callback: (transactions: RewardsTransaction[]) => void,
  max = 20
): () => void {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    where('memberId', '==', memberId),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshotToTransactions(snapshot));
  });
}

export function subscribeToRecentTransactions(
  callback: (transactions: RewardsTransaction[]) => void,
  max = 30
): () => void {
  const q = query(
    collection(db, TRANSACTIONS_COLLECTION),
    orderBy('createdAt', 'desc'),
    limit(max)
  );
  return onSnapshot(q, (snapshot) => {
    callback(snapshotToTransactions(snapshot));
  });
}

/* ── Points operations ───────────────────────────────────────── */

export async function earnPoints(
  memberId: string,
  purchaseDollars: number,
  staff: StaffAttribution
): Promise<{ member: RewardsMember; transaction: RewardsTransaction }> {
  if (purchaseDollars <= 0) throw new Error('Purchase amount must be greater than zero.');
  const points = dollarsToPoints(purchaseDollars);

  return runTransaction(db, async (tx) => {
    const memberRef = doc(db, MEMBERS_COLLECTION, memberId);
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists()) throw new Error('Member not found.');

    const data = memberSnap.data();
    const newPoints = (data.points ?? 0) + points;
    const newEarned = (data.totalEarned ?? 0) + points;

    tx.update(memberRef, {
      points: newPoints,
      totalEarned: newEarned,
      updatedAt: serverTimestamp(),
    });

    const txRef = doc(collection(db, TRANSACTIONS_COLLECTION));
    tx.set(txRef, {
      memberId,
      type: 'earn' as RewardsTransactionType,
      dollarAmount: purchaseDollars,
      pointsDelta: points,
      staffName: staff.keptByName,
      staffEmail: staff.keptByEmail ?? null,
      reverted: false,
      createdAt: serverTimestamp(),
    });

    return {
      member: snapshotToMember(memberId, {
        ...data,
        points: newPoints,
        totalEarned: newEarned,
      }),
      transaction: {
        id: txRef.id,
        memberId,
        type: 'earn',
        dollarAmount: purchaseDollars,
        pointsDelta: points,
        staffName: staff.keptByName,
        staffEmail: staff.keptByEmail,
        reverted: false,
        createdAt: new Date().toISOString(),
      },
    };
  });
}

export async function redeemPoints(
  memberId: string,
  redeemDollars: number,
  staff: StaffAttribution
): Promise<{ member: RewardsMember; transaction: RewardsTransaction }> {
  if (redeemDollars <= 0) throw new Error('Redemption amount must be greater than zero.');
  const pointsCost = pointsToRedeem(redeemDollars);

  return runTransaction(db, async (tx) => {
    const memberRef = doc(db, MEMBERS_COLLECTION, memberId);
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists()) throw new Error('Member not found.');

    const data = memberSnap.data();
    const currentPoints = data.points ?? 0;
    if (currentPoints < pointsCost) {
      throw new Error(`Not enough points. Need ${pointsCost}, has ${currentPoints}.`);
    }

    const newPoints = currentPoints - pointsCost;
    const newRedeemed = (data.totalRedeemed ?? 0) + pointsCost;

    tx.update(memberRef, {
      points: newPoints,
      totalRedeemed: newRedeemed,
      updatedAt: serverTimestamp(),
    });

    const txRef = doc(collection(db, TRANSACTIONS_COLLECTION));
    tx.set(txRef, {
      memberId,
      type: 'redeem' as RewardsTransactionType,
      dollarAmount: redeemDollars,
      pointsDelta: -pointsCost,
      staffName: staff.keptByName,
      staffEmail: staff.keptByEmail ?? null,
      reverted: false,
      createdAt: serverTimestamp(),
    });

    return {
      member: snapshotToMember(memberId, {
        ...data,
        points: newPoints,
        totalRedeemed: newRedeemed,
      }),
      transaction: {
        id: txRef.id,
        memberId,
        type: 'redeem',
        dollarAmount: redeemDollars,
        pointsDelta: -pointsCost,
        staffName: staff.keptByName,
        staffEmail: staff.keptByEmail,
        reverted: false,
        createdAt: new Date().toISOString(),
      },
    };
  });
}

export async function revertTransaction(
  transactionId: string,
  staff: StaffAttribution
): Promise<{ member: RewardsMember; transaction: RewardsTransaction }> {
  return runTransaction(db, async (tx) => {
    const originalRef = doc(db, TRANSACTIONS_COLLECTION, transactionId);
    const originalSnap = await tx.get(originalRef);
    if (!originalSnap.exists()) throw new Error('Transaction not found.');

    const original = originalSnap.data();
    if (original.reverted) throw new Error('This transaction was already reverted.');
    if (original.type === 'revert') throw new Error('Cannot revert a reversal.');

    const memberRef = doc(db, MEMBERS_COLLECTION, original.memberId);
    const memberSnap = await tx.get(memberRef);
    if (!memberSnap.exists()) throw new Error('Member not found.');

    const memberData = memberSnap.data();
    const currentPoints = memberData.points ?? 0;
    const inverseDelta = -original.pointsDelta;
    const newPoints = currentPoints + inverseDelta;

    if (newPoints < 0) {
      throw new Error('Cannot revert — member no longer has enough points.');
    }

    let totalEarned = memberData.totalEarned ?? 0;
    let totalRedeemed = memberData.totalRedeemed ?? 0;
    if (original.type === 'earn') {
      totalEarned = Math.max(0, totalEarned - original.pointsDelta);
    } else if (original.type === 'redeem') {
      totalRedeemed = Math.max(0, totalRedeemed + original.pointsDelta);
    }

    tx.update(memberRef, {
      points: newPoints,
      totalEarned,
      totalRedeemed,
      updatedAt: serverTimestamp(),
    });

    tx.update(originalRef, {
      reverted: true,
      updatedAt: serverTimestamp(),
    });

    const revertRef = doc(collection(db, TRANSACTIONS_COLLECTION));
    tx.set(revertRef, {
      memberId: original.memberId,
      type: 'revert' as RewardsTransactionType,
      dollarAmount: original.dollarAmount,
      pointsDelta: inverseDelta,
      staffName: staff.keptByName,
      staffEmail: staff.keptByEmail ?? null,
      revertsTransactionId: transactionId,
      reverted: false,
      note: `Reverted ${original.type} transaction`,
      createdAt: serverTimestamp(),
    });

    tx.update(originalRef, {
      revertedByTransactionId: revertRef.id,
    });

    return {
      member: snapshotToMember(original.memberId, {
        ...memberData,
        points: newPoints,
        totalEarned,
        totalRedeemed,
      }),
      transaction: {
        id: revertRef.id,
        memberId: original.memberId,
        type: 'revert',
        dollarAmount: original.dollarAmount,
        pointsDelta: inverseDelta,
        staffName: staff.keptByName,
        staffEmail: staff.keptByEmail,
        revertsTransactionId: transactionId,
        note: `Reverted ${original.type} transaction`,
        reverted: false,
        createdAt: new Date().toISOString(),
      },
    };
  });
}
