import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import Home from "./components/home";
import routes from "tempo-routes";

function App() {
  return (
    <div className="App">
      {/* Tempo routes */}
      {import.meta.env.VITE_TEMPO && useRoutes(routes)}

      <Routes>
        <Route path="/" element={<Home />} />
        {/* Removed Google Calendar callback route */}
      </Routes>
    </div>
  );
}

export default App;
