# DESIGN.md: I Make Those Pages

Theme: **developer style, Obsidian colours.** Dark charcoal, light grey text, one violet accent.
The hero background is React Bits' Gradient ASCII (WebGL2) rising from the bottom like a sunset, and the demo shows both the page and its real HTML.

## Rules
- Purple is the Obsidian violet accent only. No other hues apart from the green inside the demo preview.
- One full-bleed background effect on screen at a time: Gradient ASCII in the hero, HoloMosaic behind the contact section. Contained visuals inside a card or band (the bento eclipse, the faint ASCII in "How it works") are fine. Text never sits straight on an effect: it goes on a solid panel or on dark background.
- Light only comes from the components: the bento cursor glow, the specular edge on main buttons. No drop shadows, glass or orbs. Structure comes from 1px `--line` borders.
- Every new section uses a vault component (see Components) before anything hand-made.
- No emoji, sparkles, fake testimonials, made-up stats or fake terminals. The code panel shows the real HTML of the preview.
- No em dashes in copy, no "not X, it's Y" lines. Sentence case.
- The bento figures only state measured facts about this page (weight, file count, cookies). Re-measure when the page changes.

## Colour (Obsidian default dark)
| Token | Value | Role |
|---|---|---|
| `--stone` | #1E1E1E | Page background |
| `--paper` | #262626 | Raised surfaces: demo, story band, contact section |
| `--field` | #161616 | Inputs, code panel, previews |
| `--line` | #363636 | Borders and dividers |
| `--ink` | #DADADA | Text and primary buttons |
| `--muted` | #A3A3A3 | Secondary text |
| `--sun` | #7B53E6 | Violet accent fills: step markers, icon tiles, logo (white text on it is 5:1) |
| `--gold` | #A88BFA | Light violet: hovers, highlights, code tags, comment pins |
| `--leaf` | #44CF6E | Green, only inside the demo preview and code attributes |
| error | #FB464C | Form errors |

## Type
- Display: Bricolage Grotesque 700/800, tracking -0.03em.
- Body: Instrument Sans 400/500/600, 17px.
- Code and ASCII art: JetBrains Mono 400.
All self-hosted in `assets/fonts/`.

## Shape
| Token | Value | Role |
|---|---|---|
| `--card-r` | 14px | Bento cards, list rows, panels, forms, demo |
| `--btn-r` | 10px | Buttons, slide-to-pay track |
| (base) | 4px | Inputs, tags, small chips |

1px borders. Buttons are solid blocks, never pills.

## Components
From the Obsidian vault "Diagrams", ported from React to plain JS in `js/react-bits.js` (`window.RB`), `js/gradient-ascii.js` and `js/holo-mosaic.js`. Shaders and logic stay as written; only the React wrapper changes.

| Vault component | Used for | Hook |
|---|---|---|
| Gradient ASCII | Hero background (`rise`), bento eclipse (`eclipse`), story band (`rise-soft`) | `#heroAscii`, `[data-ascii]` |
| HoloMosaic | Contact section background | `js/holo-mosaic.js` |
| Magic Bento | "What you get" grid | `[data-bento]` |
| Line Sidebar | "How it works" step nav | `RB.lineSidebar` in `js/motion.js` |
| Animated List | "The deal" terms; its pop-in spring for new chat messages | `[data-animated-list]`, `RB.popIn` |
| Specular Button | Hero, minibar and send buttons | `[data-specular]` |
| Slide Commit | Pay deposit and balance on `order.html` | `RB.slideCommit` in `js/order.js` |

Held for later, with the reason:
- **Depth Carousel, Drift Wall**: need real client work to show. Use for a portfolio once there are 3+ shipped pages.
- **Scroll Expand**: needs a real screen recording or photo to expand into.
- **Bell Toggle**: for buyer email updates, once automatic emails exist.
- **Flip Card**: order summary or a before/after of a client page.
- **Ferrofluid, Pattern Waves**: full-bleed backgrounds, so only as a swap for an existing one, never a third.
- **Peek Rating**: only with real reviews. No fake proof.

## Motion
All of it is off under `prefers-reduced-motion`.
- **Gradient ASCII hero** (`js/gradient-ascii.js`): React Bits' GradientASCII component, ported from React to plain JS with its shaders untouched. Shape `rise`, Obsidian violets, JetBrains Mono glyphs. Characters scramble under the cursor and a click sends a wave. Keep the glow low in the hero so the headline, tagline and buttons stay on dark background. Falls back to a flat CSS sun without WebGL2.
- **Decrypt headline**: each line unscrambles from symbols on load. On desktop it thins from 800 to 350 weight as you scroll away. The lines never rewrap.
- **HoloMosaic contact background** (`js/holo-mosaic.js`): React Bits' HoloMosaic, ported to plain JS. Toned down from its defaults: `pearl` spectrum, low saturation, little glitter, lavender metal, edges faded. Tiles tilt toward the cursor; clicking empty space sends a flip wave. Text sits on solid panels on top of it.
- **Magnetic buttons**: the hero CTA follows the cursor slightly (fine pointers only).
- **Parallax**: hero text and demo at different speeds (desktop only). Section headings drift at most 40px, so they can't touch the content below.
- **Scrollytelling** ("How it works"): one pinned scene, the preview goes from brief to draft to live.
- **Scroll-driven reveals** and the demo skeleton.

## Brand moments
- The sunset glow appears in the hero, rising at the top edge of the contact section, and in the logo.
- The footer ends on a huge "I make those." sign-off.

## Orders
Order form on the home page, the buyer's `order.html` and the owner's `admin.html` use the same panels, checklist and buttons. Messages on both pages use the same thread: the sender's own bubbles sit right in faint violet, the other side's sit left on `--field`, with a 4px corner pointing at the sender. Payment and setup details are in `ORDERS.md`.
