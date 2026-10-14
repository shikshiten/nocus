import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  "https://unmosagzzkecwnkhbimk.supabase.co";

const supabaseAnonKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVubW9zYWd6emtlY3dua2hiaW1rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NzA3NjQsImV4cCI6MjEwMDA0Njc2NH0.oiuth6DxUjRRx80kvxRFsu-PRgGbzPtlhmlrACNHjvg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
