import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Check, CheckCheck, AlertCircle, Loader2, WifiOff, Flag, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { enqueueMessage, subscribeQueue, removeFromQueue, type QueuedMessage } from "@/lib/offlineQueue";
import ReportDialog from "@/components/safety/ReportDialog";
import { useBlock } from "@/hooks/useBlock";


type DeliveryStatus = "queued" | "sending" | "sent" | "read" | "failed";

const attachmentUrl = (value: unknown): string | null => {
  if (!Array.isArray(value) || value.length === 0) return null;
  const first = value[0];
  if (typeof first !== "object" || first === null || !("url" in first)) return null;
  return typeof first.url === "string" ? first.url : null;
};

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
  const [reportOpen, setReportOpen] = useState(false);
  const otherUserId = consultation?.peer_user_id || null;
  const { isBlocked, toggle: toggleBlock, loading: blockLoading } = useBlock(otherUserId);


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
        .from("conversations").select("id,customer_id,artist_id,design_request_id,created_at").eq("id", consultationId).maybeSingle();
      if (!c) { navigate("/dashboard"); return; }
      const [{ data: peer }, { data: request }, { data: msgs }] = await Promise.all([
        supabase.rpc("conversation_peer", { p_conversation_id: consultationId }).maybeSingle(),
        c.design_request_id
          ? supabase.from("design_requests").select("brief,reference_images").eq("id", c.design_request_id).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from("messages").select("id,sender_id,body,attachments,created_at,read_at")
          .eq("conversation_id", consultationId).order("created_at", { ascending: true }),
      ]);
      if (!peer) { navigate("/dashboard"); return; }
      const hydrated = { ...c, peer_user_id: peer.peer_user_id, design_description: request?.brief || null, reference_images: request?.reference_images || [] };
      setConsultation(hydrated);
      setOtherParty({ name: peer.peer_name, display_name: peer.peer_name, avatar_url: peer.peer_avatar_url });
      setMessages((msgs || []).map(m => ({
        id: m.id, sender_id: m.sender_id || "", message: m.body, image_url: attachmentUrl(m.attachments),
        created_at: m.created_at || new Date().toISOString(), read_at: m.read_at,
        _status: (m.sender_id === user.id ? (m.read_at ? "read" : "sent") : "sent") as DeliveryStatus,
      })));
      setLoading(false);
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
      const { tempId, message: rawMessage } = e.detail;
      const message: Message = { id: rawMessage.id, sender_id: rawMessage.sender_id || "", message: rawMessage.body, image_url: attachmentUrl(rawMessage.attachments), created_at: rawMessage.created_at || new Date().toISOString(), read_at: rawMessage.read_at };
      setMessages(prev => {
        const filtered = prev.filter(m => m._tempId !== tempId);
        if (filtered.some(m => m.id === message.id)) return filtered;
        return [...filtered, { ...message, _status: "sent" as DeliveryStatus }].sort(
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
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${consultationId}`,
      }, (payload) => {
        const raw = payload.new as { id: string; sender_id: string | null; body: string | null; attachments: unknown; created_at: string | null; read_at: string | null };
        const incoming: Message = { id: raw.id, sender_id: raw.sender_id || "", message: raw.body, image_url: attachmentUrl(raw.attachments), created_at: raw.created_at || new Date().toISOString(), read_at: raw.read_at };
        setMessages(prev => {
          if (prev.some(m => m.id === incoming.id)) return prev;
          return [...prev, { ...incoming, _status: "sent" }];
        });
        // mark read if from other party and tab visible
        if (incoming.sender_id !== user.id && document.visibilityState === "visible") {
          supabase.from("messages")
            .update({ read_at: new Date().toISOString() })
            .eq("id", incoming.id).then(() => {});
        }
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${consultationId}`,
      }, (payload) => {
        const updated = payload.new as { id: string; read_at: string | null };
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
      await supabase.from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", consultationId)
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
          <button
            onClick={() => setReportOpen(true)}
            title="Report this conversation"
            className="text-muted-foreground hover:text-destructive p-1.5"
          >
            <Flag className="w-4 h-4" />
          </button>
          <button
            onClick={toggleBlock}
            disabled={blockLoading}
            title={isBlocked ? "Unblock user" : "Block user"}
            className={`p-1.5 ${isBlocked ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
          >
            <Ban className="w-4 h-4" />
          </button>
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

        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          contentType="message"
          contentId={consultationId!}
          label="conversation"
        />

        {isBlocked && (
          <div className="mb-4 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
            You have blocked this user. Unblock to send messages again.
          </div>
        )}


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
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !isBlocked && handleSend()}
            disabled={isBlocked}
            placeholder={isBlocked ? "Unblock this user to send messages" : online ? "Type your message..." : "Offline — messages will queue"}
            className="flex-1 h-12 px-4 rounded-lg bg-card border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground disabled:opacity-60"
          />
          <Button variant="gold" size="icon" className="h-12 w-12" onClick={handleSend} disabled={isBlocked}>
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationChat;
