# DESIGN.md — I Make Those Pages

Theme: **warm, crisp, confident** — a sunset sky bookends a clean white page.
The hero shows a startup page building itself: that's the one bold moment. Everything else stays quiet.

## Color
| Token | Value | Role |
|---|---|---|
| `--ink` | #241133 | Text, primary buttons on white, top of sky |
| `--plum` | #4A1D5E | Icons, secondary dark |
| `--magenta` | #B5306F | Sky mid, focus ring on dark |
| `--orange` | #F2673A | Sky low, sun |
| `--gold` | #FFC25C | Horizon, sun core |
| `--mint` | #0B9D74 | "Fresh" accent: ticks, live status only |
| `--paper` | #FFFFFF | Page background |
| `--mist` | #F7F3F8 | Alternate section background |
| `--muted` | #6B5A73 | Secondary text (6.5:1 on white) |
| `--line` | #E9E1EC | Borders, dividers |
Sky gradient: ink → plum → magenta → orange → gold (top to bottom). Text on sky only sits in the ink/plum/magenta zone.

## Typography
- Display: **Bricolage Grotesque** 700/800, tight tracking (-0.03em).
- Body/UI: **Instrument Sans** 400/500/600, 17px base.
- Scale (1.25): 14 / 17 / 21 / 26 / 33 / 48 / clamp(44–84) display.
- Sentence case everywhere. No all-caps labels, no eyebrows.

## Spacing & shape
- 8px scale: 8 16 24 32 48 64 96 128. Content width 1120px.
- Radius: 10 (inputs, small), 16 (cards, mock), 999 (buttons).
- One shadow: `0 24px 60px -20px rgba(36,17,51,.45)` — the hero mock and contact card only.

## Components
- Buttons: solid (ink on white / white on sky), outline. Hover lifts 2px; focus 3px gold ring.
- Inputs: white, 1px line border, 10 radius, gold focus ring.
- Icons: 24px stroke icons, 2px, plum, in `assets/icons/`.

## Motion
One page-load sequence: the hero mock goes from dashed wireframe to finished page. Disabled under `prefers-reduced-motion`.
