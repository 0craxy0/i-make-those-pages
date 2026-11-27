// POST from the order form. Saves the order, pings Discord, returns the buyer's private order link.
import { cors, db, json, notify, NEED_LABEL, SITE } from "./common.ts";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  if (req.method !== "POST") return json(req, { error: "Use POST." }, 405);
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json(req, { error: "That didn't come through properly. Try again." }, 400); }

  const name = String(b.name ?? "").trim();
  const email = String(b.email ?? "").trim();
  const startup = String(b.startup ?? "").trim();
  const need = String(b.need ?? "");
  const description = String(b.description ?? "").trim();
  const started = Number(b.started ?? 0);

  // Bots: hidden field filled in, or form sent impossibly fast
  if (String(b.website ?? "") !== "" || (started && Date.now() - started < 2500)) {
    return json(req, { error: "That didn't come through properly. Try again." }, 400);
  }
  const problems: Record<string, string> = {};
  if (!name || name.length > 100) problems.name = "Put your name in so I know who I'm talking to.";
  if (!EMAIL.test(email) || email.length > 254) problems.email = "That email doesn't look right. Check it and try again.";
  if (startup.length > 120) problems.startup = "Keep this under 120 characters.";
  if (!(need in NEED_LABEL)) problems.need = "Pick what you need.";
  if (description.length < 20) problems.description = "Tell me a bit more about your startup (at least 20 characters).";
  if (description.length > 4000) problems.description = "Keep this under 4000 characters.";
  if (Object.keys(problems).length) return json(req, { error: "Some fields need fixing.", fields: problems }, 422);

  const { data, error } = await db().rpc("create_order", {
    p_name: name, p_email: email, p_startup: startup, p_need: need, p_description: description,
  });
  if (error) {
    if (error.message.includes("rate_limited")) {
      return json(req, { error: "You've sent a few orders in the last hour. Wait a bit, or email me instead." }, 429);
    }
    console.error(error);
    return json(req, { error: "Something broke on my end. Email me instead and I'll sort it." }, 500);
  }
  const { ref, token } = data[0];

  await notify(`New order **${ref}** from ${name}`, {
    title: `New order ${ref}`,
    url: `${SITE}/admin.html#${ref}`,
    description: description.slice(0, 1500),
    fields: [
      { name: "From", value: `${name} (${email})`, inline: false },
      { name: "Startup", value: startup || "-", inline: true },
      { name: "Needs", value: NEED_LABEL[need], inline: true },
    ],
    footer: { text: "Open the admin page to copy the quote prompt for Claude." },
  });

  return json(req, { ref, token, url: `${SITE}/order.html?t=${token}` });
});
