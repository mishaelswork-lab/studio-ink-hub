import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { registerPush } from "@/lib/push";
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [artistProfile, setArtistProfile] = useState<any | null>(null);

  const fetchRoles = async (userId: string) => {
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    setRoles(data?.map(r => r.role) || []);
    return data?.map(r => r.role) || [];
  };

  const fetchArtistProfile = async (userId: string) => {
    const { data } = await supabase.from("artists").select("*").eq("user_id", userId).maybeSingle();
    setArtistProfile(data);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchRoles(user.id);
      await fetchArtistProfile(user.id);
    }
  };

  const updateLastActive = async (userId: string) => {
    await supabase.from("profiles").update({ last_active_at: new Date().toISOString() }).eq("user_id", userId);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRoles(session.user.id);
        await fetchArtistProfile(session.user.id);
        updateLastActive(session.user.id);
        // Register web push (silent if denied)
        setTimeout(() => { registerPush(session.user.id); }, 1500);
      } else {
        setRoles([]);
        setArtistProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRoles(session.user.id);
        await fetchArtistProfile(session.user.id);
        updateLastActive(session.user.id);
        setTimeout(() => { registerPush(session.user.id); }, 1500);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRoles([]);
    setArtistProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, artistProfile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
