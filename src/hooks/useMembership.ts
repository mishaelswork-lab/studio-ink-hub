import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type MembershipRecord = {
  id: string;
  user_id: string;
  plan: string;
  amount: number;
  currency: string;
  status: string;
  started_at: string;
  expires_at: string | null;
};

export const useMembership = () => {
  const { user } = useAuth();
  const [isMember, setIsMember] = useState(false);
  const [membership, setMembership] = useState<MembershipRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatCount, setChatCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setIsMember(false);
      setMembership(null);
      setChatCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const fetchMembership = async () => {
      try {
        const now = new Date().toISOString();
        const [{ data: mem }, { data: profile }] = await Promise.all([
          supabase.from("memberships").select("id,user_id,plan,amount,currency,status,started_at,expires_at")
            .eq("user_id", user.id).eq("status", "active")
            .or(`expires_at.is.null,expires_at.gt.${now}`)
            .order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("profiles").select("chat_count").eq("id", user.id).maybeSingle(),
        ]);
        if (cancelled) return;
        const active = mem as MembershipRecord | null;
        setMembership(active);
        setIsMember(!!active);
        setChatCount(profile?.chat_count ?? 0);
      } catch {
        if (!cancelled) {
          setMembership(null);
          setIsMember(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchMembership();
    return () => { cancelled = true; };
  }, [user]);

  const canChat = isMember || chatCount < 3;
  const chatsRemaining = isMember ? Infinity : Math.max(0, 3 - chatCount);

  const incrementChatCount = async () => {
    if (!user || isMember) return;
    const { data: profile } = await supabase.from("profiles").select("chat_count").eq("id", user.id).maybeSingle();
    setChatCount(profile?.chat_count ?? 0);
  };

  return { isMember, membership, loading, canChat, chatsRemaining, incrementChatCount, chatCount };
};
