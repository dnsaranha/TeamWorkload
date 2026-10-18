import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import LoginPage from "./components/LoginPage";
import routes from "tempo-routes";
import { ThemeProvider } from "./lib/theme";
import { AuthProvider } from "./lib/authContext";
import { Toaster } from "./components/ui/toaster";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="App min-h-screen bg-background text-foreground transition-colors duration-200">
          {/* Tempo routes */}
          {import.meta.env.VITE_TEMPO && useRoutes(routes)}

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<Home />} />
          </Routes>
          <Toaster />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

