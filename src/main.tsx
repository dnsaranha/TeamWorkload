import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

/* import { TempoDevtools } from 'tempo-devtools'; [deprecated] */
/* TempoDevtools.init() [deprecated] */;

// Suppress cross-origin errors from third-party libraries (like dhtmlxGantt)
window.addEventListener('error', (event) => {
  if (event.message === 'Script error.' || 
      event.message.includes('cross-origin') ||
      event.filename === '') {
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  }
}, true);

// Suppress unhandled promise rejections from third-party libraries
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message?.includes('cross-origin')) {
    event.preventDefault();
    return true;
  }
});

const basename = import.meta.env.BASE_URL;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DndProvider backend={HTML5Backend}>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </DndProvider>
  </React.StrictMode>,
);