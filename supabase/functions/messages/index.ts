// The buyer's message thread on order.html.
// GET  ?t=<token>&after=<id>  new messages since <id>. Marks my replies as read.
// POST {t, body}              the buyer sends a message. Pings Discord.
import { cors, db, json, notify, SITE } from "./common.ts";

const TOKEN = /^[a-f0-9]{48}$/;
// Normalise line endings and drop control characters (keeps newlines and tabs).
const clean = (s: string) =>
  s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\n{4,}/g, "\n\n\n").trim();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const sb = db();

  if (req.method === "GET") {
    const u = new URL(req.url);
    const t = u.searchParams.get("t") ?? "";
    const after = Math.max(0, Math.floor(Number(u.searchParams.get("after") ?? "0")) || 0);
    if (!TOKEN.test(t)) return json(req, { error: "That order link isn't right." }, 404);
    const { data, error } = await sb.rpc("buyer_messages", { p_token: t, p_after: after });
    if (error) { console.error(error); return json(req, { error: "Couldn't load messages. Try again in a minute." }, 500); }
    if (!data) return json(req, { error: "No order with that link." }, 404);
    return json(req, data);
  }

  if (req.method !== "POST") return json(req, { error: "Use GET or POST." }, 405);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json(req, { error: "That didn't come through properly. Try again." }, 400); }
  const t = String(b.t ?? "");
  const body = clean(String(b.body ?? ""));
  if (!TOKEN.test(t)) return json(req, { error: "That order link isn't right." }, 404);
  if (!body) return json(req, { error: "Write a message first." }, 422);
  if ([...body].length > 2000) return json(req, { error: "That's too long. Keep it under 2,000 characters." }, 422);

  const { data, error } = await sb.rpc("buyer_send_message", { p_token: t, p_body: body });
  if (error) {
    const m = error.message ?? "";
    if (m.includes("no_order")) return json(req, { error: "No order with that link." }, 404);
    if (m.includes("rate_limited")) return json(req, { error: "You've sent a lot of messages in a few minutes. Give it a bit, then send the rest." }, 429);
    if (m.includes("thread_full")) return json(req, { error: "This order has too many messages. Email me instead." }, 409);
    if (m.includes("bad_body")) return json(req, { error: "Write a message first." }, 422);
    console.error(error);
    return json(req, { error: "Couldn't send that. Try again, or email me." }, 500);
  }

  await notify(`New message on **${data.ref}** from ${data.name}`, {
    title: `Message on ${data.ref}${data.startup ? ` (${String(data.startup).slice(0, 80)})` : ""}`,
    url: `${SITE}/admin.html#${data.ref}`,
    description: body.slice(0, 1500),
    footer: { text: "Reply on the admin page. They see it next time they open their order page." },
  });
  return json(req, { message: data.message });
});
