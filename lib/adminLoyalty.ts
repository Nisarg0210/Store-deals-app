import {
  doc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const CUSTOMERS = 'customers';

export interface CustomerData {
  points: number;
  authProvider: string;
  email?: string;
  createdAt?: unknown;
  lastVisitAt?: unknown;
}

/** Fetch a customer's full data (for the admin scanner panel). */
export async function getCustomerData(customerId: string): Promise<CustomerData | null> {
  const ref = doc(db, CUSTOMERS, customerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data() as CustomerData;
}

/**
 * Award points to a customer based on purchase amount.
 * Rule: 1 point per $1 spent (rounded down).
 * Creates the customer document if it doesn't already exist.
 */
export async function awardPoints(
  customerId: string,
  purchaseAmount: number
): Promise<number> {
  const pointsToAdd = Math.floor(purchaseAmount);
  if (pointsToAdd <= 0) return 0;

  const ref = doc(db, CUSTOMERS, customerId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // Customer scanned QR code from a cleared browser — auto-create doc
    await setDoc(ref, {
      points: pointsToAdd,
      authProvider: 'guest',
      createdAt: serverTimestamp(),
      lastVisitAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, {
      points: increment(pointsToAdd),
      lastVisitAt: serverTimestamp(),
    });
  }
  return pointsToAdd;
}

/**
 * Redeem points from a customer's balance.
 * Rule: 100 points = $1.00 discount.
 * Returns the dollar value redeemed, or throws if insufficient balance.
 */
export async function redeemPoints(
  customerId: string,
  pointsToRedeem: number
): Promise<number> {
  const ref = doc(db, CUSTOMERS, customerId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Customer not found.');

  const currentPoints: number = snap.data().points ?? 0;
  if (currentPoints < pointsToRedeem) {
    throw new Error(`Insufficient points. Customer has ${currentPoints} pts.`);
  }

  await updateDoc(ref, {
    points: increment(-pointsToRedeem),
    lastVisitAt: serverTimestamp(),
  });

  return pointsToRedeem / 100; // dollars
}

/** Constants for the reward thresholds */
export const POINTS_PER_DOLLAR_EARN = 1;     // earn 1 pt per $1 spent
export const POINTS_PER_DOLLAR_REDEEM = 100; // 100 pts = $1 off
export const MIN_REDEEM = 500;               // minimum 500 pts to redeem ($5 off)
