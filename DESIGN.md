# DESIGN.md: I Make Those Pages

Theme: warm, crisp, confident. A flat sunset (solid orange, gold sun cut by stripes) opens the page; the rest is calm stone and ink.
The one bold moment is the hero demo: visitors type their startup in and the page rebuilds.

## Rules (things this site never does)
No gradients (except the skeleton shimmer), no drop shadows, no glass, no glows or orbs, no emoji, no sparkles, no neon or pastel fills, no pure white, no purple, no pill shapes, no hover movement, no tick-mark bullets, no rows of three identical cards, no em dashes in copy, no "not X, it's Y" lines.

## Color
| Token | Value | Role |
|---|---|---|
| `--ink` | #16302A | Text, buttons, contact section background |
| `--sun` | #F2643A | Hero and legal header background, step markers |
| `--gold` | #FFC15A | The sun, link hover on ink |
| `--leaf` | #2F7D5B | Button hover, accents inside the demo |
| `--stone` | #EEEBE6 | Page background |
| `--paper` | #F8F6F2 | Surfaces: demo, form, alternate band |
| `--muted` | #4F5B56 | Secondary text |
| `--line` | #D3CDC4 | Dividers, input borders |

## Type
Bricolage Grotesque (display, 700/800, -0.03em) and Instrument Sans (body 400/500/600, 17px). Both self-hosted in `assets/fonts/`. Sentence case only.

## Shape
Radius 4px everywhere. Structure comes from 2px ink rules and 1px line dividers, never shadows.

## Icons
Custom filled geometric icons in `assets/icons/`, ink on stone. Don't swap in Lucide/Feather.

## Motion
All of it is turned off under `prefers-reduced-motion`.
- **WebGL sun** (`js/sun.js`): flat-colour sun with stripes that drift, reflected in moving water. It leans toward the mouse and sinks as you scroll. If WebGL isn't available, the flat CSS sun shows instead. It stops drawing when it's off screen.
- **Kinetic headline**: the words rise in on load, then the weight thins from 800 to 350 as you scroll out of the hero.
- **Parallax**: the hero text and the demo move at different speeds.
- **Scrollytelling** ("How it works"): a sticky preview goes from brief, to draft with comment pins, to live as each step scrolls past.
- **Scroll-driven reveals**: section rules draw in and list items rise, using CSS `animation-timeline: view()`. Browsers without it just show everything.
- **Demo skeleton** while the "try it" preview rebuilds.
