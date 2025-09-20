import { Suspense } from "react";
import { useRoutes, Routes, Route } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import Home from "./components/home";
import routes from "tempo-routes";

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="App">
        {/* Tempo routes */}
        {import.meta.env.VITE_TEMPO && useRoutes(routes)}

        <Routes>
          <Route path="/" element={<Home />} />
          {/* Removed Google Calendar callback route */}
        </Routes>
      </div>
    </DndProvider>
  );
}

export default App;
