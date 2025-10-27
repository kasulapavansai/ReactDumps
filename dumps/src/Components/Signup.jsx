// src/Components/Signup.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserAuth } from "./AuthContext";

const Signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); // user-supplied password
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);

  const { signUpNewUser } = UserAuth();
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage("");
    setLoading(true);

    const cleanEmail = String(email).trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter a valid email.");
      setLoading(false);
      return;
    }

    const usingPassword = Boolean(password);
    if (usingPassword) {
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
    }

    try {
      const result = await signUpNewUser(cleanEmail, usingPassword ? password : undefined);

      if (!result.success) {
        setError(result.error ?? "Signup failed.");
        setLoading(false);
        return;
      }

      // If Supabase returns a session immediately (password signup with no email confirmation required),
      // redirect user to dashboard. Otherwise, show message to confirm email or check magic link.
      if (result.session) {
        navigate("/dashboard");
      } else {
        if (usingPassword) {
          setMessage(
            "Signup successful. Please check your email to confirm your account (if required), then sign in with your email and password."
          );
        } else {
          setMessage(`Magic link sent to ${cleanEmail}. Click the link in your email to complete signup.`);
        }
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("Unexpected error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md m-auto pt-24">
      <form onSubmit={handleSignUp}>
        <h2 className="font-bold pb-2">Create an account</h2>
        <p>
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>

        <div className="py-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 mt-2 w-full"
            type="email"
            placeholder="Email"
            required
          />
        </div>

        <div className="py-2">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 mt-2 w-full"
            type="password"
            placeholder="Password (leave blank for magic-link)"
          />
        </div>

        <div className="py-2">
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="p-3 mt-2 w-full"
            type="password"
            placeholder="Confirm password"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded"
        >
          {loading ? "Processing..." : "Create account"}
        </button>

        {message && <p className="text-green-600 text-center pt-4">{message}</p>}
        {error && <p className="text-red-600 text-center pt-4">{error}</p>}
      </form>
    </div>
  );
};

export default Signup;
