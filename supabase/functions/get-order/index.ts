// GET ?t=<token>. What the buyer's order page shows.
import { cors, db, json } from "./common.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const t = new URL(req.url).searchParams.get("t") ?? "";
  if (!/^[a-f0-9]{48}$/.test(t)) return json(req, { error: "That order link isn't right." }, 404);
  const { data, error } = await db().rpc("order_view", { p_token: t });
  if (error) { console.error(error); return json(req, { error: "Couldn't load your order. Try again in a minute." }, 500); }
  if (!data) return json(req, { error: "No order with that link." }, 404);
  return json(req, data);
});
