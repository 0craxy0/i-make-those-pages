# Orders: how it works and how to set it up

## The flow
1. A buyer fills in the order form. They get a private order page (`order.html?t=...`) and you get a Discord message.
2. Open `admin.html`, pick the order, press **Copy prompt for Claude** and paste it into Claude (with the Supabase connector on). Claude works out a price between £100 and £300, writes a summary and the work steps, and saves them straight to the order. Or set the quote by hand on the admin page.
3. Email the buyer their order link (admin page: **Copy buyer's link**). Their page shows the quote and a button to pay the 50% deposit.
4. Stripe takes the deposit. The "Deposit paid" step ticks itself and Discord tells you.
5. Tick the work steps as you go, on the admin page or by telling Claude ("tick step 5 on IMTP-XXXXX").
6. Add the draft link, then tick "Draft ready". The buyer can now approve it and pay the other 50%.
7. Stripe takes the rest, "Rest paid" ticks itself, Discord tells you. Hand over the files and tick "Handover". Done.

Steps that tick themselves: Order received, Quote ready, Deposit paid, Rest paid. You can't tick work steps before the deposit, the draft before the work and a draft link, or handover before the rest is paid.

## Where things live
- Database and server code: Supabase project `i-make-those-pages` (`wydreptloanesxblcdra`, London).
- Functions: `create-order`, `get-order`, `pay`, `stripe-webhook`, `admin`. Source in `supabase/functions/`.
- Database helpers Claude uses: `set_quote`, `tick_step`, `set_draft_url`, `cancel_order`.

## One-time setup (you do these, they're secrets)
Supabase dashboard, project `i-make-those-pages`, Edge Functions, Secrets. Add:
- `ADMIN_KEY`: a long password you make up (16+ characters). You type it into `admin.html`.
- `DISCORD_WEBHOOK_URL`: Discord, your private server, channel settings, Integrations, Webhooks, New webhook, Copy URL.
- `STRIPE_SECRET_KEY`: Stripe dashboard, Developers, API keys, Secret key. Start with the **test** key (`sk_test_...`).
- `STRIPE_WEBHOOK_SECRET`: Stripe, Developers, Webhooks, Add endpoint:
  URL `https://wydreptloanesxblcdra.supabase.co/functions/v1/stripe-webhook`,
  events `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
  Then copy its signing secret (`whsec_...`).

Test with Stripe's test card 4242 4242 4242 4242 (any future date, any CVC). When it all works, swap both Stripe secrets for the live ones and add a live-mode webhook the same way.

## Not done yet
- Buyers don't get automatic emails. Email them their link when the quote is ready (or add an email service later).
- Refunds are done in the Stripe dashboard, then cancel the order on the admin page.
