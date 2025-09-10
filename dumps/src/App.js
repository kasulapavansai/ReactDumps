import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PdfDashboard from "./PdfDashboard";
import PdfViewerPage from "./PdfViewerPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PdfDashboard />} />
        <Route path="/viewer" element={<PdfViewerPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;