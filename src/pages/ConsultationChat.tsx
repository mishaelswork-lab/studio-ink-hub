import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, ImagePlus, Check, CheckCheck, AlertCircle, Loader2, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { enqueueMessage, subscribeQueue, flushQueue, removeFromQueue, type QueuedMessage } from "@/lib/offlineQueue";

type DeliveryStatus = "queued" | "sending" | "sent" | "read" | "failed";

interface Message {
  id: string;
  sender_id: string;
  message: string | null;
  image_url: string | null;
  created_at: string;
  read_at?: string | null;
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
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queueCount, setQueueCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  useEffect(() => {
    if (!user || !consultationId) return;
    const fetchData = async () => {
      const { data: c } = await supabase
        .from("consultations").select("*").eq("id", consultationId).maybeSingle();
      if (!c) { navigate("/dashboard"); return; }
      setConsultation(c);

      const otherId = c.customer_id === user.id ? c.artist_id : c.customer_id;
      const [{ data: artist }, { data: profile }] = await Promise.all([
        supabase.from("artists").select("name, avatar_url").eq("user_id", otherId).maybeSingle(),
        supabase.from("profiles").select("display_name, avatar_url").eq("user_id", otherId).maybeSingle(),
      ]);
      setOtherParty(artist || profile || { display_name: "User", avatar_url: null });

      const { data: msgs } = await supabase
        .from("consultation_messages").select("*")
        .eq("consultation_id", consultationId)
        .order("created_at", { ascending: true });
      setMessages((msgs || []).map(m => ({
        ...m,
        _status: (m.sender_id === user.id ? (m.read_at ? "read" : "sent") : "sent") as DeliveryStatus,
      })));
      setLoading(false);

      if (c.status === "pending") {
        await supabase.from("consultations").update({ status: "active" }).eq("id", consultationId);
      }
    };
    fetchData();
  }, [user, consultationId, navigate]);

  // Subscribe to local offline queue for this consultation
  useEffect(() => {
    if (!consultationId || !user) return;
    const unsub = subscribeQueue((q: QueuedMessage[]) => {
      const mine = q.filter(m => m.consultationId === consultationId);
      setQueueCount(mine.length);
      setMessages(prev => {
        const withoutQueued = prev.filter(m => m._status !== "queued");
        const queuedMsgs: Message[] = mine.map(qm => ({
          id: qm.tempId,
          _tempId: qm.tempId,
          sender_id: qm.senderId,
          message: qm.message,
          image_url: null,
          created_at: new Date(qm.createdAt).toISOString(),
          _status: "queued",
        }));
        return [...withoutQueued, ...queuedMsgs].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
    });

    const onSent = (e: any) => {
      const { tempId, message } = e.detail;
      setMessages(prev => {
        const filtered = prev.filter(m => m._tempId !== tempId);
        if (filtered.some(m => m.id === message.id)) return filtered;
        return [...filtered, { ...message, _status: "sent" }].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      });
      // fire push notification (best effort)
      supabase.functions.invoke("notify-new-message", {
        body: { consultationId, senderId: user.id, preview: message.message },
      }).catch(() => {});
    };
    window.addEventListener("queue:sent", onSent);
    return () => { unsub(); window.removeEventListener("queue:sent", onSent); };
  }, [consultationId, user]);

  // Realtime: incoming messages + read receipt updates
  useEffect(() => {
    if (!consultationId || !user) return;
    const channel = supabase
      .channel(`chat-${consultationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "consultation_messages",
        filter: `consultation_id=eq.${consultationId}`,
      }, (payload) => {
        const incoming = payload.new as Message;
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id)) return prev;
          return [...prev, { ...incoming, _status: "sent" }];
        });
        // mark read if from other party and tab visible
        if (incoming.sender_id !== user.id && document.visibilityState === "visible") {
          supabase.from("consultation_messages")
            .update({ read_at: new Date().toISOString() })
            .eq("id", incoming.id).then(() => {});
        }
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "consultation_messages",
        filter: `consultation_id=eq.${consultationId}`,
      }, (payload) => {
        const updated = payload.new as Message;
        setMessages(prev => prev.map(m =>
          m.id === updated.id
            ? { ...m, read_at: updated.read_at, _status: m.sender_id === user.id ? (updated.read_at ? "read" : "sent") : m._status }
            : m
        ));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [consultationId, user]);

  // Mark unread incoming messages as read on load / when window focused
  useEffect(() => {
    if (!user || !consultationId || loading) return;
    const markRead = async () => {
      if (document.visibilityState !== "visible") return;
      await supabase.from("consultation_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("consultation_id", consultationId)
        .neq("sender_id", user.id)
        .is("read_at", null);
    };
    markRead();
    const onVis = () => markRead();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [user, consultationId, loading, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || !user || !consultationId) return;
    const text = input.trim();
    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    enqueueMessage({ tempId, consultationId, senderId: user.id, message: text });
    setInput("");
  };

  const retryNow = (tempId: string) => {
    removeFromQueue(tempId);
    toast.info("Removed from queue");
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
    supabase.functions.invoke("notify-new-message", {
      body: { consultationId, senderId: user.id, preview: "📷 Shared an image" },
    }).catch(() => {});
  };

  const otherName = otherParty?.name || otherParty?.display_name || "Artist";

  const StatusIcon = ({ s }: { s?: DeliveryStatus }) => {
    if (s === "queued") return <WifiOff className="w-3 h-3 text-amber-400" />;
    if (s === "sending") return <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />;
    if (s === "failed") return <AlertCircle className="w-3 h-3 text-red-400" />;
    if (s === "read") return <CheckCheck className="w-3 h-3 text-sky-400" />;
    if (s === "sent") return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
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
          <div className="flex-1">
            <p className="text-foreground text-sm font-medium">{otherName}</p>
            <p className="text-muted-foreground text-xs">Design Consultation</p>
          </div>
          {!online && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-1 rounded-md">
              <WifiOff className="w-3 h-3" /> Offline
            </div>
          )}
          {online && queueCount > 0 && (
            <div className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-1 rounded-md">
              Sending {queueCount}…
            </div>
          )}
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
                  onClick={() => msg._status === "queued" && msg._tempId && retryNow(msg._tempId)}
                  className={`max-w-[75%] text-left rounded-lg px-4 py-2.5 text-sm transition-opacity ${
                    mine ? "bg-gold/20 text-foreground border border-gold/20" : "bg-card text-foreground border border-border"
                  } ${msg._status === "queued" || msg._status === "sending" ? "opacity-70" : ""} ${
                    msg._status === "failed" ? "border-red-400/40 cursor-pointer" : ""
                  }`}
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
                  {msg._status === "queued" && (
                    <p className="text-[10px] text-amber-400 mt-1">Will send when reconnected — tap to cancel</p>
                  )}
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
            placeholder={online ? "Type your message..." : "Offline — messages will queue"}
            className="flex-1 h-12 px-4 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground"
          />
          <Button variant="gold" size="icon" className="h-12 w-12" onClick={handleSend}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationChat;
