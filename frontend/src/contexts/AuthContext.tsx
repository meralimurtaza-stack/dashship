/**
 * AuthContext.tsx
 *
 * Manages authentication state for DashShip using Supabase Auth.
 * 
 * Architecture decision: Every user — including anonymous "just trying it out"
 * users — gets a real Supabase user record. This means:
 *   - All writes always go to Supabase (no sessionStorage branch needed)
 *   - RLS policies work for everyone via auth.uid()
 *   - When anonymous users sign up, Supabase converts their account in-place
 *     (same user ID), so all projects/conversations/dashboards transfer automatically
 *
 * Three auth states:
 *   1. loading=true  → checking for existing session (page load / refresh)
 *   2. user=null     → no session yet (Home page, hasn't clicked anything)
 *   3. user exists   → either anonymous (is_anonymous=true) or real account
 *
 * Spec references: §3 (Auth & gating strategy), §9.1 (Entry flows E1-E8)
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';
import type { User, AuthError } from '@supabase/supabase-js';

// ─── Types ────────────────────────────────────────────────────────

interface AuthContextType {
  /** The current Supabase user. null = not signed in at all (fresh visitor). */
  user: User | null;

  /**
   * True if the user exists but hasn't created a real account yet.
   * Drives the persistent banner: "Sign up to access from any device"
   * Also gates PUBLISH — anonymous users must sign up before publishing.
   */
  isAnonymous: boolean;

  /**
   * True while checking for an existing session on page load.
   * The app should show a loading state (or nothing) until this is false,
   * to prevent the "flash of logged-out content" on refresh.
   */
  loading: boolean;

  /**
   * Create an anonymous Supabase user.
   * Called when user clicks "Just trying it out" on the auth modal,
   * or automatically when they take their first action (upload, chat).
   * After this, user.id exists and all Supabase writes work.
   */
  signInAnonymously: () => Promise<{ error: AuthError | null }>;

  /**
   * Sign up with email/password.
   *
   * If the current user is anonymous, this CONVERTS them to a real account.
   * Supabase keeps the same user ID — all their data stays linked.
   * 
   * If there's no current user, this creates a fresh account.
   */
  signUpWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;

  /**
   * Sign in an existing user with email/password.
   * Used by the "Log in" flow for returning users.
   */
  signInWithEmail: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;

  /**
   * Sign out and clear the session.
   * After this, user is null and they're back to the unauthenticated Home page.
   */
  signOut: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Session initialisation ──────────────────────────────────
  // On mount, check if there's an existing session (e.g. user refreshed
  // the page). Supabase stores the session token in localStorage
  // automatically, so this picks it up.
  //
  // We also subscribe to auth state changes — this fires when:
  //   - User signs in (anonymous or real)
  //   - User signs out
  //   - Session refreshes (token expiry)
  //   - Anonymous user converts to real account

  useEffect(() => {
    // 1. Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 2. Listen for all auth changes going forward
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED')) {
        // Session expired or refresh failed — silently re-auth
        // so the user is never bounced to the homepage mid-work.
        console.warn(`[Auth] Session lost (${event}). Re-creating anonymous session.`);
        supabase.auth.signInAnonymously();
        return;
      }
      setUser(session?.user ?? null);
      // Don't set loading here — it's only for the initial check
    });

    // 3. Cleanup listener on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ── Sign in anonymously ─────────────────────────────────────
  // Creates a real Supabase user with is_anonymous=true.
  // The user gets a proper UUID that works with RLS policies.
  // All data they create is saved to Supabase immediately.

  const signInAnonymously = useCallback(async () => {
    const { error } = await supabase.auth.signInAnonymously();
    // The onAuthStateChange listener will update `user` state
    return { error };
  }, []);

  // ── Sign up with email ──────────────────────────────────────
  // Two scenarios:
  //
  // A) Current user is anonymous → CONVERT to real account.
  //    Supabase's updateUser() on an anonymous session adds the
  //    email/password credential to the existing user. Same user ID.
  //    All foreign keys (projects, conversations) stay valid.
  //
  // B) No current user → CREATE fresh account.
  //    Standard Supabase signUp. Returns a new user ID.

  const signUpWithEmail = useCallback(
    async (email: string, password: string) => {
      if (user?.is_anonymous) {
        // Scenario A: Convert anonymous → real
        // updateUser() adds email+password to the existing anonymous user
        const { error } = await supabase.auth.updateUser({
          email,
          password,
        });
        return { error };
      } else {
        // Scenario B: Fresh sign-up (no existing session)
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        return { error };
      }
    },
    [user]
  );

  // ── Sign in with email ──────────────────────────────────────
  // Returning user with an existing account.

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    },
    []
  );

  // ── Sign out ────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // onAuthStateChange listener will set user to null
  }, []);

  // ── Derived state ───────────────────────────────────────────

  const isAnonymous = user?.is_anonymous === true;

  // ── Provide ─────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user,
        isAnonymous,
        loading,
        signInAnonymously,
        signUpWithEmail,
        signInWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
