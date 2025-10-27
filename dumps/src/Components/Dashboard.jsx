// src/Components/Dashboard.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserAuth } from "./AuthContext";

const Dashboard = () => {
  const { session, signOut } = UserAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const handleSignOut = async () => {
    setError(null);
    try {
      await signOut();
      navigate("/signin");
    } catch (err) {
      setError("An unexpected error occurred.");
    }
  };

  if (!session) {
    return (
      <div className="max-w-md m-auto pt-24">
        <h2>Dashboard</h2>
        <p>Please sign in to access the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md m-auto pt-24">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <h2 className="text-lg mt-4">Welcome, {session?.user?.email}</h2>

      <div className="mt-6">
        <button
          onClick={handleSignOut}
          className="px-4 py-2 border rounded hover:bg-gray-200"
        >
          Sign Out
        </button>
      </div>

      {error && <p className="text-red-600 mt-4">{error}</p>}
    </div>
  );
};

export default Dashboard;
