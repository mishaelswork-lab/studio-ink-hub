import { artists } from "./mockData";

export interface Reel {
  id: string;
  artistId: string;
  artistName: string;
  artistAvatar: string;
  studioName: string;
  videoUrl: string;
  thumbnail: string;
  caption: string;
  instagram_url?: string;
  likes: number;
  views: number;
  createdAt: string;
}

export const reels: Reel[] = [
  {
    id: "r1",
    artistId: "a1",
    artistName: "Arjun Mehta",
    artistAvatar: artists[0].avatar,
    studioName: "Ink Dynasty",
    videoUrl: "https://vjs.zencdn.net/v/oceans.mp4",
    thumbnail: "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=400&q=80",
    caption: "Japanese dragon sleeve in progress 🐉 Full color, 6-hour session",
    likes: 342,
    views: 4200,
    createdAt: "2026-04-04",
  },
  {
    id: "r2",
    artistId: "a2",
    artistName: "Priya Sharma",
    artistAvatar: artists[1].avatar,
    studioName: "Ink Dynasty",
    videoUrl: "https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files@master/big_buck_bunny.mp4",
    thumbnail: "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=400&q=80",
    caption: "Watercolor butterfly coming to life 🦋✨ Love how the colors blended!",
    likes: 567,
    views: 7800,
    createdAt: "2026-04-03",
  },
  {
    id: "r3",
    artistId: "a3",
    artistName: "Vikram Rathore",
    artistAvatar: artists[2].avatar,
    studioName: "Sacred Skin Studio",
    videoUrl: "https://vjs.zencdn.net/v/oceans.mp4",
    thumbnail: "https://images.unsplash.com/photo-1590246815117-0b5bd96dd1f1?w=400&q=80",
    caption: "Sacred geometry dotwork mandala 🔮 Every dot placed with precision",
    likes: 891,
    views: 12400,
    createdAt: "2026-04-02",
  },
  {
    id: "r4",
    artistId: "a5",
    artistName: "Rohan Desai",
    artistAvatar: artists[4].avatar,
    studioName: "Needle & Thread",
    videoUrl: "https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files@master/big_buck_bunny.mp4",
    thumbnail: "https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=400&q=80",
    caption: "Tribal blackwork full arm piece 💀 10 years of perfecting this craft",
    likes: 723,
    views: 9100,
    createdAt: "2026-04-01",
  },
  {
    id: "r5",
    artistId: "a6",
    artistName: "Aisha Khan",
    artistAvatar: artists[5].avatar,
    studioName: "Eternal Marks",
    videoUrl: "https://vjs.zencdn.net/v/oceans.mp4",
    thumbnail: "https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=400&q=80",
    caption: "Hyper-realistic lion portrait 🦁 The details on the mane took 3 hours alone",
    likes: 1205,
    views: 18300,
    createdAt: "2026-03-30",
  },
  {
    id: "r6",
    artistId: "a1",
    artistName: "Arjun Mehta",
    artistAvatar: artists[0].avatar,
    studioName: "Ink Dynasty",
    videoUrl: "https://cdn.jsdelivr.net/gh/mediaelement/mediaelement-files@master/big_buck_bunny.mp4",
    thumbnail: "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=400&q=80",
    caption: "Koi fish back piece — blending tradition with modern flow 🎏",
    likes: 456,
    views: 5600,
    createdAt: "2026-03-28",
  },
];
