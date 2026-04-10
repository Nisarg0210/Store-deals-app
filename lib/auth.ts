import { useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from './firebase';

/** Display name for staff attribution (Firebase displayName or email local-part) */
export function getStaffDisplayName(user: User | null | undefined): string {
  if (!user) return 'Staff';
  const name = user.displayName?.trim();
  if (name) return name;
  const email = user.email?.split('@')[0];
  return email || 'Staff';
}

/** Sign in with email and password */
export async function signIn(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

/** Sign out the current user */
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/** Hook: observe auth state */
export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, loading };
}
