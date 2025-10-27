import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// 🔹 Firebase setup
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔹 Variable to control login requirement
const LOGIN_REQUIRED = true; // <-- set false to skip login, true to enforce

// 🔹 Login Page
function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const handleManualLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", userCredential.user.uid), {
        email: userCredential.user.email,
        lastLogin: new Date(),
      });
      navigate("/viewer");
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>Login Page</h2>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <br />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <br />
      <button onClick={handleManualLogin}>Login</button>
      <p>{message}</p>
    </div>
  );
}

// 🔹 PdfViewerPage with page tracking
function PdfViewerPage() {
  const [page, setPage] = useState(parseInt(localStorage.getItem("pageCount") || "1"));
  const navigate = useNavigate();
  const pageSize = 3;

  const handleNext = () => {
    const newPage = page + 1;
    setPage(newPage);
    localStorage.setItem("pageCount", newPage);

    // Check login only if LOGIN_REQUIRED is true
    if (LOGIN_REQUIRED && !auth.currentUser) {
      navigate("/login");
    }
  };

  const handlePrev = () => {
    const newPage = Math.max(1, page - 1);
    setPage(newPage);
    localStorage.setItem("pageCount", newPage);
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>Pdf Viewer Page</h2>
      <p>Current page: {page}</p>
      <button onClick={handlePrev} disabled={page <= 1}>Prev</button>
      <button onClick={handleNext}>Next</button>
      {auth.currentUser && <p>Logged in as: {auth.currentUser.email}</p>}
      {!LOGIN_REQUIRED && <p>Login not required currently.</p>}
    </div>
  );
}

// 🔹 Home Page
function Home() {
  return <div style={{ padding: 30 }}><h2>Home Page</h2></div>;
}

// 🔹 App Component
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/viewer" element={<PdfViewerPage />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}
