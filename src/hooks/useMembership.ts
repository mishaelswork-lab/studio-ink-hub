import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useMembership = () => {
  const { user } = useAuth();
  const [isMember, setIsMember] = useState(false);
  const [membership, setMembership] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chatCount, setChatCount] = useState(0);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetch = async () => {
      const [{ data: mem }, { data: prof }] = await Promise.all([
        supabase.from("memberships").select("*").eq("user_id", user.id).eq("status", "active").or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("profiles").select("chat_count").eq("user_id", user.id).maybeSingle(),
      ]);
      setMembership(mem);
      setIsMember(!!mem);
      setChatCount(prof?.chat_count ?? 0);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const canChat = isMember || chatCount < 3;
  const chatsRemaining = isMember ? Infinity : Math.max(0, 3 - chatCount);

  // chat_count is derived server-side from real consultations; here we only
  // re-read it so the UI stays in sync after a chat starts.
  const incrementChatCount = async () => {
    if (!user || isMember) return;
    const { data: prof } = await supabase.from("profiles").select("chat_count").eq("user_id", user.id).maybeSingle();
    setChatCount(prof?.chat_count ?? 0);
  };

  return { isMember, membership, loading, canChat, chatsRemaining, incrementChatCount, chatCount };
};
