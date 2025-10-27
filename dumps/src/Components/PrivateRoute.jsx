// src/Components/PrivateRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { UserAuth } from "./AuthContext";

const PrivateRoute = ({ children }) => {
  const { session } = UserAuth();

  // initial loading state: session === undefined
  if (session === undefined) {
    return <div>Loading...</div>;
  }

  // if not logged in, redirect to signin
  if (!session) {
    return <Navigate to="/signin" replace />;
  }

  // logged in -> render children
  return <>{children}</>;
};

export default PrivateRoute;
