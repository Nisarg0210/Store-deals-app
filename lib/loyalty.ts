import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import { db, auth } from './firebase';

const GUEST_KEY = 'loyalty_guest_id';
const CUSTOMERS = 'customers';

/* ── Guest ID ────────────────────────────────────────────────────── */

/** Returns the existing guest ID from localStorage, or generates a new one. */
export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

/** Saves a new guest ID to localStorage (used after account linking). */
export function saveGuestId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(GUEST_KEY, id);
  }
}

/* ── Firestore helpers ───────────────────────────────────────────── */

/** Ensures the customer document exists in Firestore; creates it if not. */
export async function ensureCustomerDoc(customerId: string): Promise<void> {
  const ref = doc(db, CUSTOMERS, customerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      points: 0,
      authProvider: 'guest',
      createdAt: serverTimestamp(),
      lastVisitAt: serverTimestamp(),
    });
  }
}

/** Real-time listener for a customer's points balance. */
export function subscribeToPoints(
  customerId: string,
  callback: (points: number) => void
): () => void {
  const ref = doc(db, CUSTOMERS, customerId);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      callback(snap.data().points ?? 0);
    } else {
      callback(0);
    }
  });
}

/* ── Account linking (Email / Password) ─────────────────────────── */

export interface LinkResult {
  success: boolean;
  error?: string;
}

/**
 * Creates a new Firebase Auth account and migrates the guest points to
 * the new UID-based document. Removes the old guest doc.
 */
export async function signUpAndLink(
  email: string,
  password: string,
  currentGuestId: string
): Promise<LinkResult> {
  try {
    // 1. Create Firebase Auth user
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    // 2. Get current guest data
    const guestRef = doc(db, CUSTOMERS, currentGuestId);
    const guestSnap = await getDoc(guestRef);
    const guestPoints = guestSnap.exists() ? (guestSnap.data().points ?? 0) : 0;

    // 3. Create new UID-based document with migrated points
    await setDoc(doc(db, CUSTOMERS, uid), {
      points: guestPoints,
      authProvider: 'email',
      email,
      createdAt: serverTimestamp(),
      lastVisitAt: serverTimestamp(),
    });

    // 4. Update localStorage to use the UID going forward
    saveGuestId(uid);

    return { success: true };
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : 'Failed to create account.';
    // Firebase error codes → human messages
    if (msg.includes('email-already-in-use'))
      return { success: false, error: 'This email is already registered. Try logging in instead.' };
    if (msg.includes('weak-password'))
      return { success: false, error: 'Password must be at least 6 characters.' };
    return { success: false, error: msg };
  }
}

/**
 * Signs in with email/password and restores the saved UID as the local guest ID.
 */
export async function logInAndRestore(
  email: string,
  password: string
): Promise<LinkResult> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    // Ensure doc exists (in case they log in on a brand-new device)
    const ref = doc(db, CUSTOMERS, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        points: 0,
        authProvider: 'email',
        email,
        createdAt: serverTimestamp(),
        lastVisitAt: serverTimestamp(),
      });
    }

    saveGuestId(uid);
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Login failed.';
    if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found'))
      return { success: false, error: 'Invalid email or password.' };
    return { success: false, error: msg };
  }
}

/** Sign out the loyalty customer account. */
export async function loyaltySignOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/** Observe loyalty auth state */
export function onLoyaltyAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/** Update last visit timestamp */
export async function touchLastVisit(customerId: string): Promise<void> {
  try {
    const ref = doc(db, CUSTOMERS, customerId);
    await updateDoc(ref, { lastVisitAt: serverTimestamp() });
  } catch {
    // Silently ignore if doc doesn't exist yet
  }
}
