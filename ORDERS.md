# Orders: how it works and how to set it up

## The flow
1. A buyer fills in the order form. They get a private order page (`order.html?t=...`) and you get a Discord message.
2. Open `admin.html`, pick the order, press **Copy prompt for Claude** and paste it into Claude (with the Supabase connector on). Claude works out a price between £100 and £300, writes a summary and the work steps, and saves them straight to the order. Or set the quote by hand on the admin page.
3. Email the buyer their order link (admin page: **Copy buyer's link**). Their page shows the quote and a button to pay the 50% deposit.
4. Stripe takes the deposit. The "Deposit paid" step ticks itself and Discord tells you.
5. Tick the work steps as you go, on the admin page or by telling Claude ("tick step 5 on IMTP-XXXXX").
6. Add the draft link, then tick "Draft ready". The buyer can now approve it and pay the other 50%.
7. Stripe takes the rest, "Rest paid" ticks itself, Discord tells you. Hand over the files and tick "Handover". Done.

## Messages
- The buyer can message you from their order page at any point. Each message pings your Discord with a link to the order on `admin.html`.
- Reply on the admin page (the Messages box on the order). Orders with unread messages show an "N new" badge in the list.
- Buyers don't get an email when you reply. They see it next time they open their page, which checks for new messages every 15 seconds while it's open. If it's urgent, press **Email them that you replied** after sending.
- Both sides see "Seen" once the other side has opened the thread.
- Claude can read and send messages too (the copied prompt includes the thread):
  `select public.owner_messages('IMTP-XXXXX');` and `select public.owner_send_message('IMTP-XXXXX', 'text');`
- Limits: 2,000 characters a message, buyers can send 8 messages per 10 minutes, 500 messages per order. No file uploads: buyers send links.

Steps that tick themselves: Order received, Quote ready, Deposit paid, Rest paid. You can't tick work steps before the deposit, the draft before the work and a draft link, or handover before the rest is paid.

## Where things live
- Database and server code: Supabase project `i-make-those-pages` (`wydreptloanesxblcdra`, London).
- Functions: `create-order`, `get-order`, `messages`, `pay`, `stripe-webhook`, `admin`. Source in `supabase/functions/`. Database changes in `supabase/migrations/`.
- Database helpers Claude uses: `set_quote`, `tick_step`, `set_draft_url`, `cancel_order`, `owner_messages`, `owner_send_message`.

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
- Buyers don't get automatic emails, for quotes or message replies. Email them their link yourself (or add an email service later; the vault's Bell Toggle is held for an "email me updates" switch).
- Refunds are done in the Stripe dashboard, then cancel the order on the admin page.
