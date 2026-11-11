import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;

/** true quando o app está ligado a um projeto Supabase (senão roda com os dados de demonstração). */
export const isSupabaseConfigured = Boolean(url && key);

/**
 * Cliente único do navegador. A chave publicável é pública por desenho:
 * quem protege os dados é a RLS do banco (ver supabase/migrations).
 */
export const supabase = createClient<Database>(
  url ?? "http://localhost:54321",
  key ?? "public-anon-key-placeholder",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "pediflux-auth",
    },
  },
);
