export interface Studio {
  id: string;
  name: string;
  location: string;
  address: string;
  rating: number;
  reviewCount: number;
  image: string;
  artistCount: number;
}

export interface Artist {
  id: string;
  name: string;
  studioId: string;
  studioName: string;
  specialty: string;
  experience: string;
  rating: number;
  reviewCount: number;
  avatar: string;
  portfolio: string[];
  bio: string;
  hourlyRate: number;
  available: boolean;
}

export interface Booking {
  id: string;
  customerName: string;
  customerPhone: string;
  artistId: string;
  artistName: string;
  studioName: string;
  date: string;
  time: string;
  duration: string;
  style: string;
  placement: string;
  size: string;
  description: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  coverCharge: number;
  totalEstimate: number;
  createdAt: string;
}

export const studios: Studio[] = [
  { id: "s1", name: "Ink Dynasty", location: "Indiranagar", address: "12th Main, Indiranagar, Bengaluru 560038", rating: 4.8, reviewCount: 342, image: "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=600&q=80", artistCount: 3 },
  { id: "s2", name: "Sacred Skin Studio", location: "Koramangala", address: "80 Feet Rd, Koramangala, Bengaluru 560034", rating: 4.9, reviewCount: 528, image: "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=600&q=80", artistCount: 2 },
  { id: "s3", name: "Needle & Thread", location: "Jayanagar", address: "4th Block, Jayanagar, Bengaluru 560011", rating: 4.7, reviewCount: 189, image: "https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=600&q=80", artistCount: 2 },
  { id: "s4", name: "Black Canvas Tattoos", location: "MG Road", address: "Church Street, MG Road, Bengaluru 560001", rating: 4.6, reviewCount: 276, image: "https://images.unsplash.com/photo-1590246815117-0b5bd96dd1f1?w=600&q=80", artistCount: 1 },
  { id: "s5", name: "Eternal Marks", location: "HSR Layout", address: "Sector 2, HSR Layout, Bengaluru 560102", rating: 4.8, reviewCount: 412, image: "https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=600&q=80", artistCount: 2 },
];

export const artists: Artist[] = [
  {
    id: "a1", name: "Arjun Mehta", studioId: "s1", studioName: "Ink Dynasty",
    specialty: "Japanese Traditional", experience: "8 years", rating: 4.9, reviewCount: 210,
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
    portfolio: [
      "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=500&q=80",
      "https://images.unsplash.com/photo-1590246815117-0b5bd96dd1f1?w=500&q=80",
      "https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=500&q=80",
    ],
    bio: "Specializing in Japanese traditional tattoos with a modern twist. Every piece tells a story rooted in centuries of art history.",
    hourlyRate: 3000, available: true,
  },
  {
    id: "a2", name: "Priya Sharma", studioId: "s1", studioName: "Ink Dynasty",
    specialty: "Watercolor & Illustrative", experience: "5 years", rating: 4.8, reviewCount: 156,
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
    portfolio: [
      "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=500&q=80",
      "https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=500&q=80",
    ],
    bio: "Creating vibrant watercolor tattoos that bring paintings to life on skin.",
    hourlyRate: 2500, available: true,
  },
  {
    id: "a3", name: "Vikram Rathore", studioId: "s2", studioName: "Sacred Skin Studio",
    specialty: "Geometric & Dotwork", experience: "6 years", rating: 4.9, reviewCount: 298,
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
    portfolio: [
      "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=500&q=80",
      "https://images.unsplash.com/photo-1590246815117-0b5bd96dd1f1?w=500&q=80",
    ],
    bio: "Precision meets art. Sacred geometry and intricate dotwork patterns that mesmerize.",
    hourlyRate: 3500, available: true,
  },
  {
    id: "a4", name: "Neha Kapoor", studioId: "s2", studioName: "Sacred Skin Studio",
    specialty: "Minimalist & Fine Line", experience: "4 years", rating: 4.7, reviewCount: 130,
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
    portfolio: [
      "https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=500&q=80",
    ],
    bio: "Less is more. Delicate fine-line tattoos that speak volumes through simplicity.",
    hourlyRate: 2000, available: false,
  },
  {
    id: "a5", name: "Rohan Desai", studioId: "s3", studioName: "Needle & Thread",
    specialty: "Blackwork & Tribal", experience: "10 years", rating: 4.8, reviewCount: 345,
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
    portfolio: [
      "https://images.unsplash.com/photo-1598371839696-5c5bb00bdc28?w=500&q=80",
      "https://images.unsplash.com/photo-1565058379802-bbe93b2f703a?w=500&q=80",
    ],
    bio: "Bold blackwork and tribal designs inspired by ancient cultures and modern aesthetics.",
    hourlyRate: 3000, available: true,
  },
  {
    id: "a6", name: "Aisha Khan", studioId: "s5", studioName: "Eternal Marks",
    specialty: "Realism & Portraits", experience: "7 years", rating: 4.9, reviewCount: 267,
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80",
    portfolio: [
      "https://images.unsplash.com/photo-1611501275019-9b5cda994e8d?w=500&q=80",
      "https://images.unsplash.com/photo-1590246815117-0b5bd96dd1f1?w=500&q=80",
      "https://images.unsplash.com/photo-1562962230-16e4623d36e6?w=500&q=80",
    ],
    bio: "Hyper-realistic tattoos that capture life's moments with stunning detail and emotion.",
    hourlyRate: 4000, available: true,
  },
];

export const bookings: Booking[] = [
  {
    id: "b1", customerName: "Rahul Verma", customerPhone: "+91 98765 43210",
    artistId: "a1", artistName: "Arjun Mehta", studioName: "Ink Dynasty",
    date: "2026-04-10", time: "11:00 AM", duration: "3 hours",
    style: "Japanese Dragon", placement: "Full Sleeve", size: "Large",
    description: "Traditional Japanese dragon with clouds and waves, full color sleeve",
    status: "confirmed", coverCharge: 500, totalEstimate: 9000, createdAt: "2026-04-01",
  },
  {
    id: "b2", customerName: "Sneha Reddy", customerPhone: "+91 87654 32109",
    artistId: "a3", artistName: "Vikram Rathore", studioName: "Sacred Skin Studio",
    date: "2026-04-12", time: "2:00 PM", duration: "2 hours",
    style: "Sacred Geometry", placement: "Forearm", size: "Medium",
    description: "Metatron's cube with mandala elements",
    status: "pending", coverCharge: 500, totalEstimate: 7000, createdAt: "2026-04-03",
  },
  {
    id: "b3", customerName: "Amit Patel", customerPhone: "+91 76543 21098",
    artistId: "a6", artistName: "Aisha Khan", studioName: "Eternal Marks",
    date: "2026-04-08", time: "10:00 AM", duration: "4 hours",
    style: "Portrait", placement: "Back", size: "Large",
    description: "Realistic portrait of a lion with crown",
    status: "completed", coverCharge: 500, totalEstimate: 16000, createdAt: "2026-03-28",
  },
  {
    id: "b4", customerName: "Divya Nair", customerPhone: "+91 65432 10987",
    artistId: "a2", artistName: "Priya Sharma", studioName: "Ink Dynasty",
    date: "2026-04-15", time: "3:00 PM", duration: "1.5 hours",
    style: "Watercolor Butterfly", placement: "Shoulder", size: "Small",
    description: "Colorful watercolor butterfly with splatter effect",
    status: "pending", coverCharge: 500, totalEstimate: 3750, createdAt: "2026-04-05",
  },
  {
    id: "b5", customerName: "Karan Singh", customerPhone: "+91 54321 09876",
    artistId: "a5", artistName: "Rohan Desai", studioName: "Needle & Thread",
    date: "2026-04-09", time: "12:00 PM", duration: "5 hours",
    style: "Tribal Sleeve", placement: "Full Arm", size: "Large",
    description: "Modern tribal design covering full arm with cultural motifs",
    status: "cancelled", coverCharge: 500, totalEstimate: 15000, createdAt: "2026-03-25",
  },
];
