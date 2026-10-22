import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: string[];
  artistProfile: any | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, loading: true, roles: [], artistProfile: null,
  signOut: async () => {}, refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const ROLES_KEY = "tart.roles";
const ARTIST_KEY = "tart.artistProfile";

const cacheSet = (k: string, v: unknown) => {
  try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ }
};
const cacheClear = () => {
  try { sessionStorage.removeItem(ROLES_KEY); sessionStorage.removeItem(ARTIST_KEY); } catch { /* noop */ }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [artistProfile, setArtistProfile] = useState<any | null>(null);
  const activeUserId = useRef<string | null>(null);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const next = data?.map(r => r.role) || [];
    if (activeUserId.current !== userId) return [];
    setRoles(next);
    cacheSet(ROLES_KEY, next);
    return next;
  };

  const fetchArtistProfile = async (userId: string) => {
    const { data } = await supabase.from("artists").select("*").eq("user_id", userId).maybeSingle();
    if (activeUserId.current !== userId) return;
    setArtistProfile(data);
    cacheSet(ARTIST_KEY, data);
  };

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchRoles(user.id), fetchArtistProfile(user.id)]);
    }
  };

  useEffect(() => {
    let bootstrapped = false;
    const hydrate = (s: Session | null) => {
      activeUserId.current = s?.user.id ?? null;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setLoading(true);
        // Defer outside the auth callback, then resolve roles before protected navigation.
        setTimeout(() => {
          Promise.all([fetchRoles(s.user.id), fetchArtistProfile(s.user.id)]).finally(() => {
            if (activeUserId.current === s.user.id) setLoading(false);
          });
        }, 0);
      } else {
        setRoles([]);
        setArtistProfile(null);
        cacheClear();
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!bootstrapped) return; // initial getSession will hydrate first
      // Focus and token refresh must not replace unsaved artist form edits.
      if (s?.user.id === activeUserId.current && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
        setSession(s);
        return;
      }
      hydrate(s);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      bootstrapped = true;
      hydrate(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    activeUserId.current = null;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setArtistProfile(null);
    cacheClear();
  };

  const value = useMemo(
    () => ({ user, session, loading, roles, artistProfile, signOut, refreshProfile }),
    [user, session, loading, roles, artistProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
