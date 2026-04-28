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
 * Rule: 2 points per $1 spent (purchase amount rounded to nearest dollar first).
 * Creates the customer document if it doesn't already exist.
 */
export async function awardPoints(
  customerId: string,
  purchaseAmount: number
): Promise<number> {
  const roundedDollars = Math.round(purchaseAmount); // e.g. $20.29 → 20, $20.55 → 21
  const pointsToAdd = roundedDollars * POINTS_PER_DOLLAR_EARN;
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
 * Subtract points (to correct an accidental entry).
 * Mirrors awardPoints rounding: purchase amount rounded to nearest dollar × 2.
 */
export async function subtractPoints(
  customerId: string,
  amount: number
): Promise<number> {
  const roundedDollars = Math.round(amount);
  const pointsToSubtract = roundedDollars * POINTS_PER_DOLLAR_EARN;
  if (pointsToSubtract <= 0) return 0;

  const ref = doc(db, CUSTOMERS, customerId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    throw new Error('Customer not found.');
  }

  const currentPoints = snap.data().points ?? 0;
  // Don't let it go below 0
  const actualDeduction = Math.min(currentPoints, pointsToSubtract);

  await updateDoc(ref, {
    points: increment(-actualDeduction),
    lastVisitAt: serverTimestamp(),
  });

  return actualDeduction;
}

/**
 * Redeem points from a customer's balance.
 * Rule: every 100 points = $1.00 discount.
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

  return pointsToRedeem / POINTS_PER_DOLLAR_REDEEM; // dollars
}

/** Constants for the reward thresholds */
export const POINTS_PER_DOLLAR_EARN = 2;     // earn 2 pts per $1 spent
export const POINTS_PER_DOLLAR_REDEEM = 100; // 100 pts = $1 off
export const MIN_REDEEM = 100;               // minimum 100 pts to redeem ($1 off)
export const REDEEM_150 = 150;               // optional: 150 pts = $1.50 off
