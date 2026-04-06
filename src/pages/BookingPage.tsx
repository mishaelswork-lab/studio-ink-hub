import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { artists } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/layout/Navbar";
import { toast } from "sonner";

const BookingPage = () => {
  const { artistId } = useParams();
  const navigate = useNavigate();
  const artist = artists.find(a => a.id === artistId);
  const [form, setForm] = useState({
    date: "", time: "", style: "", placement: "", size: "Medium", description: "",
  });

  if (!artist) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Artist not found.</p></div>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Booking request sent! ₹500 cover charge will be collected via Razorpay.", { description: "The artist will confirm your appointment shortly." });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-20 pb-16 px-4 max-w-2xl mx-auto">
        <Link to={`/artist/${artist.id}`} className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to {artist.name}
        </Link>

        <div className="bg-card rounded-lg border border-border p-6 md:p-8">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-1">Book Appointment</h1>
          <p className="text-muted-foreground text-sm mb-6">with {artist.name} · {artist.studioName}</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Date</label>
                <input type="date" required value={form.date} onChange={e => setForm(p => ({...p, date: e.target.value}))} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Time</label>
                <select required value={form.time} onChange={e => setForm(p => ({...p, time: e.target.value}))} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold">
                  <option value="">Select time</option>
                  {["10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","3:00 PM","4:00 PM","5:00 PM"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Tattoo Style</label>
              <input type="text" required placeholder="e.g. Japanese Dragon, Mandala..." value={form.style} onChange={e => setForm(p => ({...p, style: e.target.value}))} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Placement</label>
                <input type="text" required placeholder="e.g. Forearm, Back..." value={form.placement} onChange={e => setForm(p => ({...p, placement: e.target.value}))} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1.5 block">Size</label>
                <select value={form.size} onChange={e => setForm(p => ({...p, size: e.target.value}))} className="w-full h-10 px-3 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold">
                  {["Small","Medium","Large","Extra Large"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Description</label>
              <textarea required rows={3} placeholder="Describe your tattoo idea in detail..." value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-gold placeholder:text-muted-foreground resize-none" />
            </div>

            <div className="bg-secondary/50 rounded-md p-4 border border-border">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Cover Charge (non-refundable)</span>
                <span className="text-foreground font-medium">₹500</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Artist Rate</span>
                <span className="text-foreground">₹{artist.hourlyRate}/hr</span>
              </div>
              <p className="text-muted-foreground text-xs mt-2">Final price will be discussed with the artist after confirmation.</p>
            </div>

            <Button type="submit" variant="gold" size="lg" className="w-full">
              Pay ₹500 & Book
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
