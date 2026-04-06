import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Sparkles, Send } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const mockResponses: Record<string, string> = {
  default: "I'd love to help you find your perfect tattoo style! Tell me about your personality, interests, or any imagery that speaks to you, and I'll suggest styles that would suit you best.",
  minimal: "Based on your preference for minimalism, I'd recommend **Fine Line** or **Single Needle** tattoos. These styles use thin, delicate lines to create elegant designs. Artists like Neha Kapoor at Sacred Skin Studio specialize in this. Consider small geometric shapes, botanical elements, or meaningful symbols.",
  bold: "For bold, statement pieces, I'd suggest **Blackwork** or **Japanese Traditional** styles. Rohan Desai at Needle & Thread creates incredible tribal designs, while Arjun Mehta at Ink Dynasty is a master of Japanese art. Think full sleeves, large back pieces, or chest panels.",
  color: "If you love color, **Watercolor** and **Illustrative** styles would be perfect! Priya Sharma at Ink Dynasty creates stunning watercolor pieces that look like paintings on skin. Consider floral designs, abstract splashes, or nature-inspired themes.",
  first: "For a first tattoo, I'd recommend starting with something meaningful but manageable. **Fine Line** or **Minimalist** styles are great choices — they're less intimidating and heal well. Consider a small piece on your forearm, wrist, or ankle. Neha Kapoor would be an excellent artist for this!",
};

const AIConsultant = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Welcome to the ArtSpace AI Style Consultant! ✨\n\nI can help you discover the perfect tattoo style based on your personality and preferences. Tell me:\n\n• What kind of aesthetic are you drawn to?\n• Is this your first tattoo?\n• Do you prefer bold or subtle designs?\n• Any specific themes or imagery you like?" },
  ]);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim().toLowerCase();
    setMessages(prev => [...prev, { role: "user", content: input.trim() }]);
    setInput("");

    setTimeout(() => {
      let response = mockResponses.default;
      if (userMsg.includes("minimal") || userMsg.includes("subtle") || userMsg.includes("small") || userMsg.includes("delicate")) {
        response = mockResponses.minimal;
      } else if (userMsg.includes("bold") || userMsg.includes("large") || userMsg.includes("statement") || userMsg.includes("tribal")) {
        response = mockResponses.bold;
      } else if (userMsg.includes("color") || userMsg.includes("watercolor") || userMsg.includes("vibrant") || userMsg.includes("colorful")) {
        response = mockResponses.color;
      } else if (userMsg.includes("first") || userMsg.includes("beginner") || userMsg.includes("never")) {
        response = mockResponses.first;
      }
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 pt-20 pb-4 px-4 max-w-3xl mx-auto w-full flex flex-col">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-gold mb-2">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm tracking-[0.2em] uppercase">AI Style Consultant</span>
          </div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Find Your Perfect Style</h1>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-gold/20 text-foreground border border-gold/20"
                  : "bg-card text-foreground border border-border"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Describe your style preferences..."
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

export default AIConsultant;
