# CLAUDE.md: I Make Those Pages

The landing page for my service: I build landing pages for startups. Plain HTML, CSS and JS. No frameworks, no build step.

## Live site
- https://i-make-those-pages.netlify.app
- Netlify auto-deploys from `main` of `0craxy0/i-make-those-pages`. Pushing to `main` puts it live.

## Look and feel
`DESIGN.md` is the source of truth: developer style, Obsidian colours, animated ASCII sunset hero. Follow its rules. Its colour and motion sections say what's allowed.

## Files
- `index.html`: the page.
- `css/styles.css`: three layers. Base styles first, then a `DEV THEME` block, then an `OBSIDIAN PALETTE` block. The blocks at the bottom win. If you restyle, merging them into one would make the file smaller.
- `js/main.js`: live demo (preview + code tab), contact form (validation, mailto, then `thanks.html`), sticky bars, magnetic button.
- `js/motion.js`: decrypt headline, parallax, pinned "How it works" scrollytelling.
- `js/sun.js`: WebGL ASCII sunset in the hero. Falls back to a flat CSS sun.
- `js/consent.js`: cookie banner + GoatCounter analytics. Switched off until `GOATCOUNTER_CODE` is set. The banner stays hidden while it's off.
- `terms.html`, `privacy.html`, `thanks.html`, `404.html` (uses root `/` paths for Netlify).
- `robots.txt`, `sitemap.xml`, `site.webmanifest`, `assets/` (self-hosted fonts, icons, favicon set, OG image).

## Don't break these
- Don't delete `googlee99310a0fb0e2265.html`. It keeps the site verified in Google Search Console.
- No fake testimonials, made-up stats, fake client logos, or AI images passed off as real.
- The "This page is the proof" numbers must be measured, not guessed. Right now: 168.8 KB across 22 files, 6 code files. Re-measure after changes: load the page over a local server, scroll through, add up every file.
- If anything new collects data (analytics, a form backend), update `privacy.html` to match.
- If the site moves to a custom domain, update the URLs in `sitemap.xml`, `robots.txt`, the canonical and OG tags, and `404.html`.

## Not done yet
- Fernway is a made-up example client. Swap in real client work once there is some.
- Analytics needs a GoatCounter code.
- The screen recordings in my Downloads folder show the old sunset version.

## Testing
- Serve it locally (`python -m http.server`). Opening `index.html` straight from disk throws a harmless manifest error.
- Check a desktop width and a phone width (390px), and with reduced motion on.

## How I like to work
- Be blunt. Tell me when an idea is bad, even if it sounds good.
- Keep replies short and in plain words.
- When I say push, push to `main`.
