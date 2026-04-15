import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import StudiosPage from "./pages/StudiosPage";
import ArtistProfile from "./pages/ArtistProfile";
import BookingPage from "./pages/BookingPage";
import AIConsultant from "./pages/AIConsultant";
import DiscoverPage from "./pages/DiscoverPage";
import LoginPage from "./pages/LoginPage";
import ArtistLogin from "./pages/ArtistLogin";
import ArtistDashboard from "./pages/ArtistDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import CustomerDashboard from "./pages/CustomerDashboard";
import ProfilePage from "./pages/ProfilePage";
import FavoritesPage from "./pages/FavoritesPage";
import ConsultationChat from "./pages/ConsultationChat";
import StartConsultation from "./pages/StartConsultation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/studios" element={<StudiosPage />} />
            <Route path="/artist/:id" element={<ArtistProfile />} />
            <Route path="/book/:artistId" element={<BookingPage />} />
            <Route path="/ai-consultant" element={<AIConsultant />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<ProtectedRoute redirectTo="/login"><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute redirectTo="/login"><ProfilePage /></ProtectedRoute>} />
            <Route path="/favorites" element={<ProtectedRoute redirectTo="/login"><FavoritesPage /></ProtectedRoute>} />
            <Route path="/consultation/:consultationId" element={<ProtectedRoute redirectTo="/login"><ConsultationChat /></ProtectedRoute>} />
            <Route path="/consult/:artistId" element={<ProtectedRoute redirectTo="/login"><StartConsultation /></ProtectedRoute>} />
            <Route path="/artist-login" element={<ArtistLogin />} />
            <Route path="/artist-dashboard" element={<ProtectedRoute requiredRole="artist" redirectTo="/artist-login"><ArtistDashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin" redirectTo="/admin"><AdminPanel /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
