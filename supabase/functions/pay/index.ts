// POST {t, kind: "deposit" | "balance"}. Starts a Stripe Checkout for that half of the quote.
import Stripe from "npm:stripe@17";
import { cors, db, json, SITE } from "./common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Use POST." }, 405);
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return json(req, { error: "Payments aren't switched on yet. Email me and I'll sort it." }, 503);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json(req, { error: "Bad request." }, 400); }
  const t = String(b.t ?? "");
  const kind = String(b.kind ?? "");
  if (!/^[a-f0-9]{48}$/.test(t) || !["deposit", "balance"].includes(kind)) return json(req, { error: "Bad request." }, 400);

  const sb = db();
  const { data: o, error } = await sb.from("orders")
    .select("id, ref, email, status, quote_pence, quote_summary, deposit_paid_at, balance_paid_at")
    .eq("token", t).maybeSingle();
  if (error || !o) return json(req, { error: "No order with that link." }, 404);
  if (!o.quote_pence) return json(req, { error: "There's no quote on this order yet." }, 409);

  const deposit = Math.ceil(o.quote_pence / 2);
  let amount = 0;
  if (kind === "deposit") {
    if (o.deposit_paid_at) return json(req, { error: "The deposit's already paid." }, 409);
    if (o.status !== "quoted") return json(req, { error: "This order can't take a deposit right now." }, 409);
    amount = deposit;
  } else {
    if (o.balance_paid_at) return json(req, { error: "This is already paid in full." }, 409);
    if (o.status !== "draft_ready") return json(req, { error: "The rest is due once your draft is ready." }, 409);
    amount = o.quote_pence - deposit;
  }

  const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });
  const label = kind === "deposit" ? "Deposit (50%)" : "Rest of payment (50%)";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: o.email,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "gbp",
        unit_amount: amount,
        product_data: {
          name: `${label}: startup page, order ${o.ref}`,
          description: (o.quote_summary ?? "").slice(0, 300) || undefined,
        },
      },
    }],
    metadata: { order_ref: o.ref, kind },
    payment_intent_data: { metadata: { order_ref: o.ref, kind } },
    success_url: `${SITE}/order.html?t=${t}&paid=${kind}`,
    cancel_url: `${SITE}/order.html?t=${t}`,
  });

  const { error: insErr } = await sb.from("payments").insert({
    order_id: o.id, kind, amount_pence: amount, stripe_session_id: session.id,
  });
  if (insErr) { console.error(insErr); return json(req, { error: "Couldn't start the payment. Try again." }, 500); }
  return json(req, { url: session.url });
});
