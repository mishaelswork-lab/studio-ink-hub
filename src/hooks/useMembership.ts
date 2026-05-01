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
        supabase.from("memberships").select("*").eq("user_id", user.id).eq("status", "active").gte("expires_at", new Date().toISOString()).order("created_at", { ascending: false }).limit(1).maybeSingle(),
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

  const incrementChatCount = async () => {
    if (!user || isMember) return;
    const newCount = chatCount + 1;
    await supabase.from("profiles").update({ chat_count: newCount }).eq("user_id", user.id);
    setChatCount(newCount);
  };

  return { isMember, membership, loading, canChat, chatsRemaining, incrementChatCount, chatCount };
};
