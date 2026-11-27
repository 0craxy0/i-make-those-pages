// Owner-only actions for admin.html. Protected by the ADMIN_KEY secret.
import { cors, db, json } from "./common.ts";

async function sameKey(given: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Use POST." }, 405);
  const expected = Deno.env.get("ADMIN_KEY");
  if (!expected || expected.length < 16) return json(req, { error: "ADMIN_KEY isn't set (needs 16+ characters)." }, 503);
  if (!(await sameKey(req.headers.get("x-admin-key") ?? "", expected))) {
    await new Promise((r) => setTimeout(r, 800));
    return json(req, { error: "Wrong admin key." }, 401);
  }

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json(req, { error: "Bad request." }, 400); }
  const sb = db();
  const ref = String(b.ref ?? "");
  const run = async (fn: string, args: Record<string, unknown>) => {
    const { data, error } = await sb.rpc(fn, args);
    return error ? json(req, { error: error.message }, 400) : json(req, { ok: true, result: data });
  };

  switch (b.action) {
    case "list": {
      const { data, error } = await sb.from("orders")
        .select("ref, status, created_at, name, startup, need, quote_pence")
        .order("created_at", { ascending: false }).limit(100);
      return error ? json(req, { error: error.message }, 500) : json(req, data);
    }
    case "get": {
      const { data: o, error } = await sb.from("orders").select("*").eq("ref", ref).maybeSingle();
      if (error || !o) return json(req, { error: "Order not found." }, 404);
      const [{ data: steps }, { data: payments }] = await Promise.all([
        sb.from("order_steps").select("position, code, label, done, done_at").eq("order_id", o.id).order("position"),
        sb.from("payments").select("kind, amount_pence, status, paid_at, created_at").eq("order_id", o.id).order("created_at"),
      ]);
      return json(req, { ...o, steps, payments });
    }
    case "quote":
      return run("set_quote", {
        p_ref: ref, p_pence: Math.round(Number(b.pence)), p_summary: String(b.summary ?? ""),
        p_work_steps: Array.isArray(b.steps) ? b.steps.map(String) : [],
      });
    case "tick":
      return run("tick_step", { p_ref: ref, p_position: Number(b.position), p_done: Boolean(b.done) });
    case "draft":
      return run("set_draft_url", { p_ref: ref, p_url: String(b.url ?? "") });
    case "cancel":
      return run("cancel_order", { p_ref: ref });
    default:
      return json(req, { error: "Unknown action." }, 400);
  }
});
