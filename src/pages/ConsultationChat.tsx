import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, ImagePlus, Check, CheckCheck, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DeliveryStatus = "sending" | "sent" | "failed";

interface Message {
  id: string;
  sender_id: string;
  message: string | null;
  image_url: string | null;
  created_at: string;
  _status?: DeliveryStatus;
  _tempId?: string;
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

      const otherId = c.customer_id === user.id ? c.artist_id : c.customer_id;
      const [{ data: artist }, { data: profile }] = await Promise.all([
        supabase.from("artists").select("name, avatar_url").eq("user_id", otherId).maybeSingle(),
        supabase.from("profiles").select("display_name, avatar_url").eq("user_id", otherId).maybeSingle(),
      ]);
      setOtherParty(artist || profile || { display_name: "User", avatar_url: null });

      const { data: msgs } = await supabase
        .from("consultation_messages")
        .select("*")
        .eq("consultation_id", consultationId)
        .order("created_at", { ascending: true });
      setMessages((msgs || []).map(m => ({ ...m, _status: "sent" as DeliveryStatus })));
      setLoading(false);

      if (c.status === "pending") {
        await supabase.from("consultations").update({ status: "active" }).eq("id", consultationId);
      }
    };
    fetchData();
  }, [user, consultationId, navigate]);

  // Realtime subscription — reconcile with optimistic msgs
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
        const incoming = payload.new as Message;
        setMessages(prev => {
          // dedupe optimistic — match on text+sender within last 30s
          const idx = prev.findIndex(m =>
            m._status === "sent" && m.id === incoming.id
          );
          if (idx >= 0) return prev;
          // replace any sending optimistic from same sender with same text
          const optIdx = prev.findIndex(m =>
            m._status === "sending" &&
            m.sender_id === incoming.sender_id &&
            (m.message || "") === (incoming.message || "")
          );
          if (optIdx >= 0) {
            const next = [...prev];
            next[optIdx] = { ...incoming, _status: "sent" };
            return next;
          }
          return [...prev, { ...incoming, _status: "sent" }];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [consultationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || sending) return;
    const text = input.trim();
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      _tempId: tempId,
      sender_id: user.id,
      message: text,
      image_url: null,
      created_at: new Date().toISOString(),
      _status: "sending",
    };
    setMessages(prev => [...prev, optimistic]);
    setInput("");
    setSending(true);

    const { data, error } = await supabase
      .from("consultation_messages")
      .insert({ consultation_id: consultationId!, sender_id: user.id, message: text })
      .select().single();

    setMessages(prev => prev.map(m => {
      if (m._tempId !== tempId) return m;
      if (error) return { ...m, _status: "failed" };
      return { ...(data as Message), _status: "sent" };
    }));
    if (error) toast.error("Failed to send. Tap message to retry.");
    setSending(false);
  };

  const retryFailed = async (msg: Message) => {
    if (!user || msg._status !== "failed" || !msg.message) return;
    setMessages(prev => prev.map(m => m._tempId === msg._tempId ? { ...m, _status: "sending" } : m));
    const { data, error } = await supabase
      .from("consultation_messages")
      .insert({ consultation_id: consultationId!, sender_id: user.id, message: msg.message })
      .select().single();
    setMessages(prev => prev.map(m => {
      if (m._tempId !== msg._tempId) return m;
      if (error) return { ...m, _status: "failed" };
      return { ...(data as Message), _status: "sent" };
    }));
    if (error) toast.error("Still failing — check your connection.");
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

  const StatusIcon = ({ s }: { s?: DeliveryStatus }) => {
    if (s === "sending") return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
    if (s === "failed") return <AlertCircle className="w-3 h-3 text-red-400" />;
    if (s === "sent") return <CheckCheck className="w-3 h-3 text-gold/70" />;
    return <Check className="w-3 h-3 text-muted-foreground" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 pt-20 pb-4 px-4 max-w-3xl mx-auto w-full flex flex-col">
          <div className="flex items-center gap-3 mb-4 pt-2">
            <Skeleton className="w-5 h-5" />
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="flex-1 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-3 w-40" /></div>
          </div>
          <div className="flex-1 space-y-3">
            {[60, 40, 70, 50].map((w, i) => (
              <div key={i} className={`flex ${i % 2 ? "justify-end" : "justify-start"}`}>
                <Skeleton className="h-12 rounded-lg" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 pt-20 pb-4 px-4 max-w-3xl mx-auto w-full flex flex-col">
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

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-4">
          {messages.map(msg => {
            const mine = msg.sender_id === user?.id;
            return (
              <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <button
                  onClick={() => msg._status === "failed" && retryFailed(msg)}
                  className={`max-w-[75%] text-left rounded-lg px-4 py-2.5 text-sm transition-opacity ${
                    mine ? "bg-gold/20 text-foreground border border-gold/20" : "bg-card text-foreground border border-border"
                  } ${msg._status === "sending" ? "opacity-70" : ""} ${msg._status === "failed" ? "border-red-400/40 cursor-pointer" : ""}`}
                >
                  {msg.image_url && (
                    <img src={msg.image_url} alt="shared" className="rounded-md max-w-full mb-2 max-h-48 object-cover" />
                  )}
                  {msg.message && <p className="whitespace-pre-wrap">{msg.message}</p>}
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {mine && <StatusIcon s={msg._status} />}
                  </div>
                  {msg._status === "failed" && <p className="text-[10px] text-red-400 mt-1">Tap to retry</p>}
                </button>
              </div>
            );
          })}
        </div>

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
