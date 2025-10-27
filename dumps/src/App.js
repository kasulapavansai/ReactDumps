import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import PdfDashboard from "./PdfDashboard";
import PdfViewerPage from "./PdfViewerPage";
import TakeAssessment from "./TakeAssessment";
import Signin from "./Components/Signin";
import Signup from "./Components/Signup";
import Dashboard from "./Components/Dashboard";
import PrivateRoute from "./Components/PrivateRoute";
import "./App.css";
import Layout from "./Layout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/signin" element={<Signin />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes */}
        <Route element={<Layout />}>
          <Route path="/" element={<PdfDashboard />} />
          <Route path="/viewer" element={<PdfViewerPage />} />
          <Route path="/assessment" element={<TakeAssessment />} />

          {/* Protected Dashboard route */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
