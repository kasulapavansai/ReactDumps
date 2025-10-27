// src/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// debug: uncomment while troubleshooting env variables
// console.log("All env vars:", process.env);
// console.log("Supabase URL:", process.env.REACT_APP_SUPABASE_URL);

// src/supabaseClient.js (temporary debug)
console.log("Using supabase url:", process.env.REACT_APP_SUPABASE_URL);
console.log("Using supabase anon key (first 8 chars):", (process.env.REACT_APP_SUPABASE_ANON_KEY || ""));

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables! Make sure REACT_APP_SUPABASE_URL and REACT_APP_SUPABASE_ANON_KEY are set in your .env (restart the dev server after editing)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
