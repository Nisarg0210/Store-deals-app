/**
 * Restrict /admin to staff emails listed in NEXT_PUBLIC_STAFF_EMAILS (comma-separated).
 * When unset, any signed-in user may access admin (legacy behaviour — set the env in production).
 */
export function isStaffEmail(email: string | null | undefined): boolean {
  const list = process.env.NEXT_PUBLIC_STAFF_EMAILS?.trim();
  if (!list) return true;
  if (!email) return false;
  const allowed = list.split(',').map((e) => e.trim().toLowerCase());
  return allowed.includes(email.toLowerCase());
}
