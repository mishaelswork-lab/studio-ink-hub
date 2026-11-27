import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/** List of user ids the signed-in user has blocked (or who blocked them is not exposed). */
export const useBlockedUsers = () => {
  const { user } = useAuth();
  const [blocked, setBlocked] = useState<string[]>([]);

  useEffect(() => {
    if (!user) { setBlocked([]); return; }
    let cancelled = false;
    supabase.from("user_blocks").select("blocked_id").eq("blocker_id", user.id).then(({ data }) => {
      if (!cancelled) setBlocked((data || []).map(r => r.blocked_id));
    });
    return () => { cancelled = true; };
  }, [user]);

  return blocked;
};

/** Block / unblock a single user. */
export const useBlock = (targetUserId?: string | null) => {
  const { user } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !targetUserId) { setIsBlocked(false); return; }
    let cancelled = false;
    supabase.from("user_blocks").select("id")
      .eq("blocker_id", user.id).eq("blocked_id", targetUserId).maybeSingle()
      .then(({ data }) => { if (!cancelled) setIsBlocked(!!data); });
    return () => { cancelled = true; };
  }, [user, targetUserId]);

  const toggle = useCallback(async () => {
    if (!user) { toast.error("Please sign in first"); return; }
    if (!targetUserId) return;
    if (targetUserId === user.id) { toast.error("You cannot block yourself"); return; }
    setLoading(true);
    if (isBlocked) {
      const { error } = await supabase.from("user_blocks").delete()
        .eq("blocker_id", user.id).eq("blocked_id", targetUserId);
      if (error) toast.error("Could not unblock");
      else { setIsBlocked(false); toast.success("Unblocked"); }
    } else {
      const { error } = await supabase.from("user_blocks")
        .insert({ blocker_id: user.id, blocked_id: targetUserId });
      if (error) toast.error("Could not block");
      else { setIsBlocked(true); toast.success("Blocked. You will no longer see their content or receive messages."); }
    }
    setLoading(false);
  }, [user, targetUserId, isBlocked]);

  return { isBlocked, toggle, loading };
};


/** Block or unblock an artist without exposing the artist's auth user ID. */
export const useBlockArtist = (artistId?: string | null) => {
  const { user } = useAuth();
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !artistId) { setIsBlocked(false); return; }
    let cancelled = false;
    setLoading(true);
    supabase.rpc("is_artist_blocked", { p_artist_id: artistId }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) toast.error("Could not load block status");
      else setIsBlocked(data === true);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [user, artistId]);

  const toggle = useCallback(async () => {
    if (!user) { toast.error("Please sign in first"); return; }
    if (!artistId) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("toggle_artist_block", { p_artist_id: artistId });
    if (error) toast.error(error.message || "Could not update block");
    else {
      const nextBlocked = data === true;
      setIsBlocked(nextBlocked);
      toast.success(nextBlocked
        ? "Artist blocked. Existing chats and new bookings are restricted."
        : "Artist unblocked.");
    }
    setLoading(false);
  }, [user, artistId]);

  return { isBlocked, toggle, loading };
};
