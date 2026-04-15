import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useFavorite = (itemType: "artist" | "reel" | "photo", itemId: string | undefined) => {
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !itemId) return;
    supabase.from("favorites").select("id").eq("user_id", user.id).eq("item_type", itemType).eq("item_id", itemId).maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [user, itemType, itemId]);

  const toggle = useCallback(async () => {
    if (!user || !itemId) { toast.error("Please sign in first"); return; }
    setLoading(true);
    if (isFavorite) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("item_type", itemType).eq("item_id", itemId);
      setIsFavorite(false);
      toast.success("Removed from favorites");
    } else {
      const { error } = await supabase.from("favorites").insert({ user_id: user.id, item_type: itemType, item_id: itemId });
      if (!error) { setIsFavorite(true); toast.success("Added to favorites!"); }
    }
    setLoading(false);
  }, [user, itemType, itemId, isFavorite]);

  return { isFavorite, toggle, loading };
};
