import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserAuth } from "./AuthContext";

const Signin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const { signInUser } = UserAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const result = await signInUser(email, password);

      if (!result.success) {
        setError(result.error ?? "Invalid credentials");
      } else {
        // password-based login successful
        navigate("/dashboard");
      }
    } catch (err) {
      setError("Unexpected error. Try again.");
    }
  };

  return (
    <div className="max-w-md m-auto pt-24">
      <form onSubmit={handleSignIn}>
        <h2 className="font-bold pb-2">Sign in (password)</h2>
        <p>
          No account? <Link to="/signup">Sign up (magic link)</Link>
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

        <div className="py-4">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 mt-2 w-full"
            type="password"
            placeholder="Password"
            required
          />
        </div>

        <button type="submit" className="w-full mt-4 px-4 py-2">
          Sign In
        </button>

        {error && <p className="text-red-600 text-center pt-4">{error}</p>}
      </form>
    </div>
  );
};

export default Signin;
