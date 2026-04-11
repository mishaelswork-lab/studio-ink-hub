import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ArrowLeft, Mail, Phone, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/layout/Navbar";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ProfilePage = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("reels-videos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("reels-videos")
        .getPublicUrl(path);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);

      setProfile((prev: any) => ({ ...prev, avatar_url: avatarUrl }));
      toast.success("Profile picture updated!");
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <div className="pt-20 px-4 max-w-lg mx-auto">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted-foreground text-sm mb-6 hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <h1 className="font-heading text-2xl font-bold text-foreground mb-8">My Profile</h1>

        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <Avatar className="w-24 h-24 border-2 border-gold/30">
              <AvatarImage src={profile?.avatar_url} alt={displayName} />
              <AvatarFallback className="text-lg bg-gold/10 text-gold">{initials}</AvatarFallback>
            </Avatar>
            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-white" />
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
            </label>
          </div>
          <p className="text-muted-foreground text-xs mt-2">Tap to change photo</p>
        </div>

        {/* Read-only fields */}
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <UserIcon className="w-3.5 h-3.5" /> Display Name
            </label>
            <Input value={displayName} readOnly className="bg-card opacity-70 cursor-not-allowed" />
          </div>

          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Mail className="w-3.5 h-3.5" /> Email
            </label>
            <Input value={user?.email || "Not set"} readOnly className="bg-card opacity-70 cursor-not-allowed" />
          </div>

          <div>
            <label className="text-sm text-muted-foreground flex items-center gap-1.5 mb-1.5">
              <Phone className="w-3.5 h-3.5" /> Phone
            </label>
            <Input value={profile?.phone || user?.phone || "Not set"} readOnly className="bg-card opacity-70 cursor-not-allowed" />
          </div>
        </div>

        <p className="text-muted-foreground text-xs mt-4">
          Contact your support to update name, email, or phone number.
        </p>

        <Button variant="destructive" className="w-full mt-8" onClick={() => { signOut(); navigate("/"); }}>
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default ProfilePage;
