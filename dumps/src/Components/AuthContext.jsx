// src/AuthContext.js
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [session, setSession] = useState(undefined); // undefined while loading

  // SIGN UP: supports password (email+password) or magic link if password omitted
  const signUpNewUser = async (email, password) => {
    try {
      if (password) {
        // Email + password signup
        const { data, error } = await supabase.auth.signUp({
          email: email.toLowerCase(),
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        // data may include user (and maybe session depending on project settings)
        return {
          success: true,
          session: data?.session ?? null,
          user: data?.user ?? null,
        };
      } else {
        // Magic link flow
        const { data, error } = await supabase.auth.signInWithOtp({
          email: email.toLowerCase(),
          options: {
            emailRedirectTo: "http://localhost:3000/dashboard",
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        return { success: true, data };
      }
    } catch (err) {
      console.error("Unexpected error during sign-up:", err);
      return { success: false, error: "An unexpected error occurred." };
    }
  };

  // SIGN IN (password)
  const signInUser = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // update local session state
      setSession(data?.session ?? null);

      return { success: true, session: data?.session ?? null, user: data?.user ?? null };
    } catch (err) {
      console.error("Unexpected error during sign-in:", err);
      return { success: false, error: "An unexpected error occurred. Please try again." };
    }
  };

  // SIGN OUT
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message ?? error);
      return { success: false, error: error.message ?? error };
    }
    setSession(null);
    return { success: true };
  };

  // TRACK SESSION (initial + onAuthStateChange)
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) setSession(session ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSession(session ?? null);
    });

    return () => {
      mounted = false;
      // unsubscribe if available
      if (data && data.subscription && typeof data.subscription.unsubscribe === "function") {
        data.subscription.unsubscribe();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, signUpNewUser, signInUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const UserAuth = () => useContext(AuthContext);
