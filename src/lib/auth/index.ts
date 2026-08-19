import { prisma } from "@/lib/db/prisma";
import { demoAuthProvider } from "./demo-provider";
import type { SessionUser } from "./types";

export type { SessionUser, AuthProvider } from "./types";

/** Active auth provider. Swap this line to point at a Clerk/Auth.js provider later. */
const provider = demoAuthProvider;

export const getCurrentUser = () => provider.getCurrentUser();
export const signOut = () => provider.signOut();

const DEMO_EMAIL = "demo@draftiq.app";
const DEMO_DISPLAY_NAME = "Demo Manager";

/**
 * Read-only session resolution safe to call from Server Components (which
 * cannot set cookies): uses the signed session cookie if present, otherwise
 * falls back to the seeded demo user without attempting to write one.
 */
export async function getCurrentUserOrDemo(): Promise<SessionUser> {
  const existing = await provider.getCurrentUser();
  if (existing) return existing;

  const demo = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, displayName: DEMO_DISPLAY_NAME, authProvider: "demo" },
  });
  return { id: demo.id, email: demo.email, displayName: demo.displayName };
}

/**
 * Writes the session cookie for the demo user. Only callable from a Server
 * Action or Route Handler (Next.js forbids cookie writes during rendering).
 */
export async function requireUser(): Promise<SessionUser> {
  const existing = await provider.getCurrentUser();
  if (existing) return existing;
  return provider.signIn({ email: DEMO_EMAIL, displayName: DEMO_DISPLAY_NAME });
}
