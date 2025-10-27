import React, { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { UserAuth } from "./Components/AuthContext"; // ⬅️ import context
import "./App.css";

export default function Layout() {
  const [shrink, setShrink] = useState(false);
  const { session, signOut } = UserAuth(); // ⬅️ get session and signOut
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setShrink(true);
      } else {
        setShrink(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/signin"); // redirect to signin after logout
  };

  return (
    <div className="app-wrapper">
      {/* Header/Navbar */}
      <header className={`header ${shrink ? "shrink" : ""}`}>
        <h1 className="site-title">Exam Library</h1>
        <nav className="navbar">
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/assessment">Take Assessment</Link></li>

            {/* Conditionally render Sign In or Sign Out */}
            {session ? (
              <li>
                <button onClick={handleSignOut} className="signout-btn">
                  Sign Out
                </button>
              </li>
            ) : (
              <li><Link to="/signin">Sign In</Link></li>
            )}
          </ul>
        </nav>
      </header>

      {/* Main Content */}
      <main className="app-content">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>© {new Date().getFullYear()} Exam Library. All rights reserved.</p>
      </footer>
    </div>
  );
}
