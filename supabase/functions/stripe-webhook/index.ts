// Stripe calls this when a Checkout payment goes through. Ticks the payment step and pings Discord.
import Stripe from "npm:stripe@17";
import { db, notify, pounds } from "./common.ts";

const crypto = Stripe.createSubtleCryptoProvider();

Deno.serve(async (req) => {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!key || !secret) return new Response("not configured", { status: 503 });
  const stripe = new Stripe(key, { httpClient: Stripe.createFetchHttpClient() });

  const sig = req.headers.get("stripe-signature") ?? "";
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, secret, undefined, crypto);
  } catch (e) {
    console.error("bad signature", e);
    return new Response("bad signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status === "paid") {
      const { data, error } = await db().rpc("mark_paid", { p_session_id: s.id });
      if (error) {
        console.error(error);
        // Not one of ours: acknowledge so Stripe stops retrying
        if (error.message.includes("unknown session")) return new Response("ignored", { status: 200 });
        return new Response("error", { status: 500 });
      }
      const r = data[0];
      if (!r.already) {
        await notify(`**${r.ref}**: ${r.kind === "deposit" ? "deposit" : "rest of payment"} paid, ${pounds(r.amount_pence)}. ${r.kind === "deposit" ? "Time to start." : "Hand it over."}`);
      }
    }
  }
  return new Response("ok", { status: 200 });
});
