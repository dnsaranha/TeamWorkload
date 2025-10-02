import { Suspense, useEffect, useState } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import Auth from "./components/Auth";
import { supabase } from "./lib/supabaseClient";
import { User } from "@supabase/supabase-js";
import routes from "tempo-routes";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Always call useRoutes at the top level
  const tempoRoutes = useRoutes(routes);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = () => {
    // The auth state change will be handled by the listener above
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If user is not authenticated, show auth component
  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="App">
      {/* Tempo routes */}
      {import.meta.env.VITE_TEMPO && tempoRoutes}

      <Routes>
        <Route path="/" element={<Home />} />
        {/* Removed Google Calendar callback route */}
      </Routes>
    </div>
  );
}

export default App;