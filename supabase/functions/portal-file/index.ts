// PediFlux · arquivo de exame para o portal da família
// A família não tem login: prova o acesso com o token do portal. O servidor confere token + exame
// (RPC portal_exam_path, só service_role) e devolve uma URL assinada que vale 5 minutos.
// Deploy com "Verify JWT" DESLIGADO: quem chama é anônimo e a autorização é o próprio token.
import { createClient } from "npm:@supabase/supabase-js@2";

const ALLOWED = [
  "https://pediflux.com",
  "https://www.pediflux.com",
  "https://pediflux.netlify.app",
  "http://localhost:8080",
  "http://localhost:3000",
  "http://localhost:5173",
];

function cors(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0]!,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const headers = { ...cors(req), "Content-Type": "application/json" };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers });

  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token : "";
  const exam = typeof body?.exam === "string" ? body.exam : "";
  if (token.length < 20 || token.length > 100 || !UUID.test(exam)) {
    return json({ error: "invalid request" }, 400);
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: path, error } = await db.rpc("portal_exam_path", {
    p_token: token,
    p_exam: exam,
  });
  if (error || !path) return json({ error: "not found" }, 404);

  const { data, error: signErr } = await db.storage
    .from("exams")
    .createSignedUrl(path as string, 300, body?.download ? { download: true } : undefined);
  if (signErr || !data) return json({ error: "sign failed" }, 500);

  return json({ url: data.signedUrl });
});
