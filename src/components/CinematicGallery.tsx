import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, Share2 } from "lucide-react";
import { shareLink } from "@/lib/share";

interface Props { images: string[]; alt: string; }

export const CinematicGallery = ({ images, alt }: Props) => {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const next = () => setIdx(i => (i + 1) % images.length);
  const prev = () => setIdx(i => (i - 1 + images.length) % images.length);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((img, i) => (
          <button
            key={i}
            onClick={() => { setIdx(i); setOpen(true); }}
            className="aspect-square rounded-lg overflow-hidden border border-border relative group bg-card"
          >
            <img
              src={img}
              alt={`${alt} ${i + 1}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-[3000ms] ease-out group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl bg-background/95 border-border p-0 overflow-hidden">
          <div className="relative aspect-square md:aspect-video bg-black">
            <img
              key={idx}
              src={images[idx]}
              alt={`${alt} ${idx + 1}`}
              className="w-full h-full object-contain animate-[kenburns_18s_ease-in-out_infinite] origin-center"
              style={{ animation: "kenburns 18s ease-in-out infinite" }}
            />
            <button onClick={() => setOpen(false)} className="absolute top-3 right-3 bg-black/60 rounded-full p-2 text-white">
              <X className="w-5 h-5" />
            </button>
            <button onClick={() => shareLink({ title: alt, text: alt, url: images[idx] })} className="absolute top-3 right-14 bg-black/60 rounded-full p-2 text-white">
              <Share2 className="w-5 h-5" />
            </button>
            {images.length > 1 && <>
              <button onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 rounded-full p-2 text-white">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 rounded-full p-2 text-white">
                <ChevronRight className="w-6 h-6" />
              </button>
            </>}
          </div>
          <style>{`
            @keyframes kenburns {
              0%,100% { transform: scale(1) translate(0,0); }
              50% { transform: scale(1.08) translate(-1%, 1%); }
            }
          `}</style>
        </DialogContent>
      </Dialog>
    </>
  );
};
