import { Suspense } from "react";
import { useRoutes, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/home";
import LoginPage from "./components/LoginPage";
import PendingInvitationBanner from "./components/PendingInvitationBanner";
import routes from "tempo-routes";
import { ThemeProvider } from "./lib/theme";
import { AuthProvider, useAuth } from "./lib/authContext";
import { Toaster } from "./components/ui/toaster";
import { OfflineIndicator } from "./components/OfflineIndicator";

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-medium">Carregando portal corporativo...</p>
        </div>
      </div>
    );
  }

  // Mandatory Login Gate: Unauthenticated users MUST authenticate before viewing the app
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </div>
    );
  }

  // Authenticated Area
  return (
    <div className="min-h-screen bg-background">
      {/* PWA Offline Connectivity Status Banner */}
      <OfflineIndicator />
      {/* Modal/Banner for invited collaborators upon logging in / accessing app */}
      <PendingInvitationBanner />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="App min-h-screen bg-background text-foreground transition-colors duration-200">
          {import.meta.env.VITE_TEMPO && useRoutes(routes)}
          <AppContent />
          <Toaster />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
