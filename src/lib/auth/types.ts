export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
}

/**
 * Auth provider abstraction. The active implementation is whatever
 * `./index.ts` exports; swapping to Clerk or Auth.js later means writing a
 * new provider that satisfies this interface and re-pointing the barrel
 * export -- no call sites elsewhere in the app should need to change.
 */
export interface AuthProvider {
  getCurrentUser(): Promise<SessionUser | null>;
  signIn(input: { email: string; displayName?: string }): Promise<SessionUser>;
  signOut(): Promise<void>;
}
