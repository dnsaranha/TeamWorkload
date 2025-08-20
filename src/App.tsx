import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import routes from "tempo-routes";

function App() {
  return (
    <div className="App">
      {/* Tempo routes */}
      {import.meta.env.VITE_TEMPO && useRoutes(routes)}

      <ProtectedRoute>
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Removed Google Calendar callback route */}
        </Routes>
      </ProtectedRoute>
    </div>
  );
}

export default App;
