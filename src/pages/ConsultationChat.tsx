import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  message: string | null;
  image_url: string | null;
  created_at: string;
}

const ConsultationChat = () => {
  const { consultationId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [consultation, setConsultation] = useState<any>(null);
  const [otherParty, setOtherParty] = useState<any>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !consultationId) return;

    const fetchData = async () => {
      const { data: c } = await supabase
        .from("consultations")
        .select("*")
        .eq("id", consultationId)
        .maybeSingle();

      if (!c) { navigate("/dashboard"); return; }
      setConsultation(c);

      // Fetch other party's info
      const otherId = c.customer_id === user.id ? c.artist_id : c.customer_id;
      const { data: artist } = await supabase.from("artists").select("name, avatar_url").eq("user_id", otherId).maybeSingle();
      const { data: profile } = await supabase.from("profiles").select("display_name, avatar_url").eq("user_id", otherId).maybeSingle();
      setOtherParty(artist || profile || { display_name: "User", avatar_url: null });

      const { data: msgs } = await supabase
        .from("consultation_messages")
        .select("*")
        .eq("consultation_id", consultationId)
        .order("created_at", { ascending: true });
      setMessages(msgs || []);
      setLoading(false);

      // Mark consultation as active
      if (c.status === "pending") {
        await supabase.from("consultations").update({ status: "active" }).eq("id", consultationId);
      }
    };
    fetchData();
  }, [user, consultationId]);

  // Realtime subscription
  useEffect(() => {
    if (!consultationId) return;
    const channel = supabase
      .channel(`chat-${consultationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "consultation_messages",
        filter: `consultation_id=eq.${consultationId}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [consultationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    const { error } = await supabase.from("consultation_messages").insert({
      consultation_id: consultationId!,
      sender_id: user.id,
      message: input.trim(),
    });
    if (error) toast.error("Failed to send message");
    else setInput("");
    setSending(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }

    const ext = file.name.split(".").pop();
    const path = `consultations/${consultationId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("reels-videos").upload(path, file);
    if (upErr) { toast.error("Upload failed"); return; }

    const { data: urlData } = supabase.storage.from("reels-videos").getPublicUrl(path);

    await supabase.from("consultation_messages").insert({
      consultation_id: consultationId!,
      sender_id: user.id,
      image_url: urlData.publicUrl,
    });
  };

  const otherName = otherParty?.name || otherParty?.display_name || "Artist";

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gold" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 pt-20 pb-4 px-4 max-w-3xl mx-auto w-full flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pt-2">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <img src={otherParty?.avatar_url || "https://via.placeholder.com/40"} alt={otherName} className="w-9 h-9 rounded-full object-cover border border-gold/30" />
          <div>
            <p className="text-foreground text-sm font-medium">{otherName}</p>
            <p className="text-muted-foreground text-xs">Design Consultation</p>
          </div>
        </div>

        {/* Design brief */}
        {consultation?.design_description && (
          <div className="bg-gold/5 border border-gold/20 rounded-lg p-3 mb-4">
            <p className="text-xs text-gold font-medium mb-1">Design Brief</p>
            <p className="text-sm text-foreground">{consultation.design_description}</p>
            {consultation.reference_images?.length > 0 && (
              <div className="flex gap-2 mt-2">
                {consultation.reference_images.map((img: string, i: number) => (
                  <img key={i} src={img} alt="ref" className="w-16 h-16 rounded object-cover border border-border" />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender_id === user?.id ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm ${
                msg.sender_id === user?.id
                  ? "bg-gold/20 text-foreground border border-gold/20"
                  : "bg-card text-foreground border border-border"
              }`}>
                {msg.image_url && (
                  <img src={msg.image_url} alt="shared" className="rounded-md max-w-full mb-2 max-h-48 object-cover" />
                )}
                {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <label className="h-12 w-12 flex items-center justify-center rounded-lg bg-card border border-border cursor-pointer hover:border-gold/30 transition-colors flex-shrink-0">
            <ImagePlus className="w-5 h-5 text-muted-foreground" />
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Type your message..."
            className="flex-1 h-12 px-4 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground"
          />
          <Button variant="gold" size="icon" className="h-12 w-12" onClick={handleSend} disabled={sending}>
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationChat;
