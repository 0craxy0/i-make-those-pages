# DESIGN.md: I Make Those Pages

Theme: **developer style, Obsidian colours.** Dark charcoal, light grey text, one violet accent.
The hero background is React Bits' Gradient ASCII (WebGL2) rising from the bottom like a sunset, and the demo shows both the page and its real HTML.

## Rules
- Purple is the Obsidian violet accent only. No other hues apart from the green inside the demo preview.
- Effects only in two places: the Gradient ASCII hero and the HoloMosaic behind the contact section. Never two effects on screen at once, and text never sits straight on an effect: it goes on a solid panel or on dark background. Never on text, buttons or backgrounds.
- No drop shadows, glass, glows or orbs. Structure comes from 1px `--line` borders.
- No emoji, sparkles, fake testimonials, made-up stats or fake terminals. The code panel shows the real HTML of the preview.
- No em dashes in copy, no "not X, it's Y" lines. Sentence case.
- The proof strip only states measured facts about this page. Re-measure if the page changes.

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
Radius 4px. 1px borders. Buttons are solid blocks, never pills.

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
