// Shared helpers for the order functions.
import { createClient } from "jsr:@supabase/supabase-js@2";

export const SITE = Deno.env.get("SITE_URL") ?? "https://i-make-those-pages.netlify.app";
const ORIGINS = new Set([SITE, "http://localhost:8766"]);

export function cors(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.has(origin) ? origin : SITE,
    "Access-Control-Allow-Headers": "content-type, x-admin-key",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const db = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

export const NEED_LABEL: Record<string, string> = {
  new: "A brand new startup page",
  redesign: "A redesign of their current page",
  unsure: "Not sure yet, wants to chat",
};

export const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

// Discord message to the owner's private channel. Never blocks or breaks the caller.
export async function notify(content: string, embed?: Record<string, unknown>) {
  const hook = Deno.env.get("DISCORD_WEBHOOK_URL");
  if (!hook) return;
  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "I Make Those Pages",
        content,
        embeds: embed ? [embed] : [],
        allowed_mentions: { parse: [] },
      }),
    });
  } catch (e) {
    console.error("discord notify failed", e);
  }
}
