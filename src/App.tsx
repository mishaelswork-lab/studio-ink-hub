import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index"; // keep eager: landing page

// Lazy-load every secondary route — drastically smaller initial bundle.
const StudiosPage = lazy(() => import("./pages/StudiosPage"));
const ArtistProfile = lazy(() => import("./pages/ArtistProfile"));
const BookingPage = lazy(() => import("./pages/BookingPage"));
const AIConsultant = lazy(() => import("./pages/AIConsultant"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const ArtistLogin = lazy(() => import("./pages/ArtistLogin"));
const ArtistDashboard = lazy(() => import("./pages/ArtistDashboard"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const ConsultationChat = lazy(() => import("./pages/ConsultationChat"));
const StartConsultation = lazy(() => import("./pages/StartConsultation"));
const ChatsPage = lazy(() => import("./pages/ChatsPage"));
const ArtistChatsPage = lazy(() => import("./pages/ArtistChatsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const StagingCheck = lazy(() => import("./pages/StagingCheck"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const GrievancePolicy = lazy(() => import("./pages/legal/GrievancePolicy"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min — avoid refetch storms
      gcTime: 30 * 60 * 1000,        // 30 min cache retention
      refetchOnWindowFocus: false,    // big perf win for tabbed users
      retry: 1,
    },
  },
});

import { QuotesLoader } from "@/components/QuotesLoader";
import { CookieConsent } from "@/components/CookieConsent";
const PageFallback = () => <QuotesLoader fullScreen />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageFallback />}>
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
              <Route path="/chats" element={<ProtectedRoute redirectTo="/login"><ChatsPage /></ProtectedRoute>} />
              <Route path="/artist-chats" element={<ProtectedRoute requiredRole="artist" redirectTo="/artist-login"><ArtistChatsPage /></ProtectedRoute>} />
              <Route path="/artist-login" element={<ArtistLogin />} />
              <Route path="/artist-dashboard" element={<ProtectedRoute requiredRole="artist" redirectTo="/artist-login"><ArtistDashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin" redirectTo="/admin"><AdminPanel /></ProtectedRoute>} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/grievance" element={<GrievancePolicy />} />
              <Route path="/staging-check" element={<StagingCheck />} />
              <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <CookieConsent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
