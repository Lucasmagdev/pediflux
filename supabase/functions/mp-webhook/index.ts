// PediFlux · webhook do Mercado Pago (Assinaturas)
// Recebe avisos de `subscription_preapproval`, confirma o estado na API do MP e aplica no banco.
// Segredos (Edge Functions → Secrets): MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET.
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já são injetados pelo Supabase.
import { createClient } from "npm:@supabase/supabase-js@2";

const MP_API = "https://api.mercadopago.com";
const enc = new TextEncoder();

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Valida o cabeçalho x-signature (ts=...,v1=...) conforme a documentação do Mercado Pago. */
async function validSignature(req: Request, dataId: string, secret: string): Promise<boolean> {
  const header = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const parts = Object.fromEntries(
    header.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;
  const id = /^[a-z0-9]+$/i.test(dataId) ? dataId.toLowerCase() : dataId;
  const manifest = `id:${id};request-id:${requestId};ts:${ts};`;
  return safeEqual(await hmacHex(secret, manifest), v1);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  const token = Deno.env.get("MP_ACCESS_TOKEN");
  if (!secret || !token) return json({ error: "not configured" }, 500);

  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const dataId = String(url.searchParams.get("data.id") ?? body?.data?.id ?? "");
  const type = String(url.searchParams.get("type") ?? body?.type ?? body?.topic ?? "");

  if (!dataId || !(await validSignature(req, dataId, secret))) {
    return json({ error: "invalid signature" }, 401);
  }

  // Só nos interessa a mudança de estado da assinatura. Os demais tipos são confirmados e ignorados.
  if (type !== "subscription_preapproval") return json({ ok: true, ignored: type });

  const mp = await fetch(`${MP_API}/preapproval/${encodeURIComponent(dataId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!mp.ok) return json({ error: "mp lookup failed", status: mp.status }, 502);
  const sub = await mp.json();

  const status = String(sub.status ?? "");
  const email = String(sub.payer_email ?? "").trim().toLowerCase();
  const planId = String(sub.preapproval_plan_id ?? "");
  if (!email || !planId || !["pending", "authorized", "paused", "cancelled"].includes(status)) {
    return json({ ok: true, ignored: "incomplete subscription" });
  }

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: plan } = await db
    .from("billing_plans")
    .select("tier")
    .eq("mp_plan_id", planId)
    .maybeSingle();
  if (!plan) return json({ ok: true, ignored: "unknown plan" });

  const { error } = await db.rpc("billing_apply", {
    p_email: email,
    p_tier: plan.tier,
    p_status: status,
    p_provider_subscription: String(sub.id),
    p_mp_plan: planId,
    p_next_payment: sub.next_payment_date ?? null,
  });
  if (error) return json({ error: error.message }, 500);

  // Compra nova de quem ainda não tem conta: convida por e-mail (melhor esforço).
  if (status === "authorized") {
    const { data: existing } = await db.rpc("billing_user_exists", { p_email: email });
    if (!existing) await db.auth.admin.inviteUserByEmail(email).catch(() => null);
  }

  return json({ ok: true, status, tier: plan.tier });
});
