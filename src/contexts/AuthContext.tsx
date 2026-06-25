import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
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

const ROLES_KEY = "artspace.roles";
const ARTIST_KEY = "artspace.artistProfile";

const cacheGet = <T,>(k: string): T | null => {
  try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; }
};
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
  // Hydrate from sessionStorage so re-mounts don't re-fetch.
  const [roles, setRoles] = useState<string[]>(() => cacheGet<string[]>(ROLES_KEY) || []);
  const [artistProfile, setArtistProfile] = useState<any | null>(() => cacheGet<any>(ARTIST_KEY));

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const next = data?.map(r => r.role) || [];
    setRoles(next);
    cacheSet(ROLES_KEY, next);
    return next;
  };

  const fetchArtistProfile = async (userId: string) => {
    const { data } = await supabase.from("artists").select("*").eq("user_id", userId).maybeSingle();
    setArtistProfile(data);
    cacheSet(ARTIST_KEY, data);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchRoles(user.id);
      await fetchArtistProfile(user.id);
    }
  };

  useEffect(() => {
    let bootstrapped = false;
    const hydrate = (s: Session | null) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // Defer non-critical work; don't block first paint.
        setTimeout(() => {
          fetchRoles(s.user.id);
          fetchArtistProfile(s.user.id);
        }, 0);
      } else {
        setRoles([]);
        setArtistProfile(null);
        cacheClear();
      }
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!bootstrapped) return; // initial getSession will hydrate first
      hydrate(s);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      bootstrapped = true;
      hydrate(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
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
