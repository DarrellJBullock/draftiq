import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { signValue, verifyValue } from "./sign";
import type { AuthProvider, SessionUser } from "./types";

const SESSION_COOKIE = "draftiq_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Local/demo auth: no password, just "sign in" as an email + display name.
 * Good enough to make the app fully usable out of the box; the interface it
 * implements is what a future Clerk/Auth.js provider would also satisfy.
 */
export const demoAuthProvider: AuthProvider = {
  async getCurrentUser() {
    const store = await cookies();
    const userId = verifyValue(store.get(SESSION_COOKIE)?.value);
    if (!userId) return null;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    return { id: user.id, email: user.email, displayName: user.displayName };
  },

  async signIn({ email, displayName }) {
    const user = await prisma.user.upsert({
      where: { email },
      update: displayName ? { displayName } : {},
      create: { email, displayName: displayName || email.split("@")[0]!, authProvider: "demo" },
    });

    const store = await cookies();
    store.set(SESSION_COOKIE, signValue(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return { id: user.id, email: user.email, displayName: user.displayName } satisfies SessionUser;
  },

  async signOut() {
    const store = await cookies();
    store.delete(SESSION_COOKIE);
  },
};
