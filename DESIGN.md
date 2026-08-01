# Design System

## Philosophy

**Brutalist minimalism meets editorial typography.** The design strips away all decoration — no gradients on content, no shadows, no rounded corners on UI elements — and lets typography and whitespace carry the entire visual hierarchy. The page reads like a well-set printed document that happens to live on a screen.

The core tension is between three typefaces with radically different personalities, each assigned a strict semantic role. This trichotomy is the signature of the design — break it and the identity breaks with it.

---

## Color Palette

A near-black canvas with a single accent. All colors are desaturated; the only chromatic element is the green status accent, used exclusively for "live" / "active" states.

| Token        | Hex       | Usage                                             |
| ------------ | --------- | ------------------------------------------------- |
| `--bg`       | `#0d0d0d` | Page background. Near-black, not pure black.       |
| `--text`     | `#f5f5f5` | Primary text — headings, hover states, active nav. |
| `--light`    | `#9a9a9a` | Body content text (descriptions, taglines).        |
| `--muted`    | `#6e6e6e` | Metadata, labels, timestamps, secondary info.      |
| `--border`   | `#1c1c1c` | Hairline dividers between rows and sections.       |
| `--hover`    | `#161616` | Hover surface (unused currently, reserved).        |
| Accent green | `#4ade80` | Status dot, job-alert bar. **Never** used on text. |

### Background treatment

A subtle radial gradient at the top of the viewport creates depth without a visible seam:

```css
background-image: radial-gradient(ellipse 80% 50% at 50% -20%, #1a1a1a 0%, transparent 100%);
```

This is the **only** gradient in the system. It lives on the body, never on components.

---

## Typography

### The three-font system

| Font            | Role                          | When to use it                                              |
| --------------- | ----------------------------- | ----------------------------------------------------------- |
| **Inter**       | Headings, titles, UI labels   | `h1`–`h3`, `.row-title`, `.name`, `.interest-title`         |
| **Crimson Pro** | Body content, prose           | `.serif` — descriptions, taglines, article body, summaries  |
| **JetBrains Mono** | Metadata, technical labels  | `.mono` — timestamps, tags, nav links, endpoints, code      |

Each font has a **non-overlapping semantic domain**. Body text is always serif, metadata is always mono, structural labels are always sans. Mixing them within a single role is forbidden.

### Scale & metrics

| Element          | Size      | Weight | Line-height | Letter-spacing  |
| ---------------- | --------- | ------ | ----------- | --------------- |
| Tagline          | `2.1rem`  | 400    | 1.35        | `-0.025em`      |
| Article title    | `3rem`    | 500    | 1.1         | `-0.04em`       |
| Section heading  | `10px`    | 400    | —           | `0.15em` UPPER  |
| Row title        | `1.1rem`  | 500    | —           | `-0.02em`       |
| Row content      | `1.05rem` | 400    | 1.65        | —               |
| Article body     | `1.25rem` | 400    | 1.8         | —               |
| Mono labels      | `11px`    | 400    | —           | `0.02em`        |
| Section labels   | `10px`    | 400    | —           | `0.15em` UPPER  |
| Row tags         | `10px`    | 400    | —           | UPPER `#555`    |

### Type rules

- **Headings use negative letter-spacing** (`-0.02em` to `-0.04em`) — tighter is more refined.
- **Mono labels use positive letter-spacing** (`0.02em`–`0.15em`) with `text-transform: uppercase`.
- **Font weights are never bold.** Maximum is `500` (medium). Body text is `400`. The design avoids heaviness.
- Article body text is **left-aligned**, never justified.

---

## Layout

### Container

```
max-width: 680px
margin: 0 auto
padding: 8rem 2rem (desktop) / 5rem 1.5rem (mobile)
```

The column is intentionally narrow — readability over screen real estate. Generous top padding (8rem) creates a "settled" feel; content doesn't crowd the viewport edge.

### Section rhythm

Each `<section>` has `margin-bottom: 7rem`. Sections are separated by whitespace, not by borders or background changes. The only horizontal rule appears at the footer.

### Scroll behavior

`scroll-behavior: smooth` globally. Anchored sections use `scroll-margin-top: 6rem` so the sticky navbar never overlaps the section heading.

---

## Component Patterns

### Section label

Every section opens with a small uppercase mono label preceded by a 4px dot:

```
●  EXPERIENCE
```

```css
font-size: 10px;
text-transform: uppercase;
letter-spacing: 0.15em;
color: var(--muted);
padding-left: 1rem;
```

### Unified list

The primary content structure. A top border (`--border`) with each item separated by a bottom border. No background, no card, no shadow — just lines.

```
─────────────────────
  Row title          meta
  company / subtitle
  description body
─────────────────────
  Row title          meta
  ...
```

Row padding: `2rem 0`. On link rows, only the title and arrow change color on hover — never the background.

### Row anatomy

| Part        | Class        | Font     | Color     | Notes                              |
| ----------- | ------------ | -------- | --------- | ---------------------------------- |
| Title       | `.row-title` | Inter    | `--text`  | Left-aligned, baseline-aligned     |
| Meta/date   | `.row-meta`  | Mono     | `--muted` | Right-aligned in `.row-main`       |
| Subtitle    | `.row-sub`   | Crimson  | `--muted` | Italic                             |
| Description | `.row-content` | Crimson | `--light` | `max-width: 560px` for readability |
| Tags        | `.row-tags`  | Mono     | `#555`    | Uppercase                          |
| Action arrow| `.row-action`| Mono     | `--muted` → `--text` on hover       |

### Sticky navbar

Full-bleed bar fixed to the top of the scroll container:

```css
position: sticky;
top: 0;
background: rgba(13, 13, 13, 0.85);
backdrop-filter: blur(12px);
border-bottom: 1px solid var(--border);
```

Links are centered, mono, `--muted` at rest, `--text` on hover. No underline, no background pill. Horizontal scroll on mobile with hidden scrollbar.

### Job alert callout

The one component with a colored accent:

```css
border-left: 2px solid #4ade80;
background: rgba(255, 255, 255, 0.02);
```

A pulsing green dot (`@keyframes pulse`) signals "live status". The background is barely perceptible — `0.02` white over the dark canvas.

### Interest groups

Category label (mono, fixed `130px` width) on the left, items as serif tags flowing on the right. On mobile, stacks vertically. This is the only place where a two-column row layout is used within a list.

### Footer

```
─────────────────────────────
  Index link    FR / EN        commit-hash
```

Minimal. A top border, generous `10rem` margin from content above, `3rem` vertical padding. The commit hash sits at `0.6` opacity in mono — a developer's signature.

---

## Interactions

### Hover states

Color-only transitions. Never scale, never shadow, never background-fill.

| Element      | Rest      | Hover      |
| ------------ | --------- | ---------- |
| Nav link     | `--muted` | `--text`   |
| Row title    | `--text`  | `--light`  |
| Row action   | `--muted` | `--text`   |
| Footer link  | `--light` | `--text`   |
| Data item    | —         | `padding-left: 1rem` indent + `--text` |

Transition: `color 0.15s ease`. The data page items are the exception — they shift right by `1rem` on hover, the only positional transition.

### Animations

Two animations exist:

1. **Pulse** — the status dot. `2s` infinite. Scales `0.95 → 1` with a fading green box-shadow ring.
2. **fadeIn** — defined but reserved. `translateY(12px) → 0` with opacity.

No entrance animations on scroll. No parallax. The page is static and immediate.

---

## Code blocks (articles)

```css
background: #1a1a1a;
border-radius: 8px;
padding: 2rem;
font-size: 0.95rem;
box-shadow: 0 10px 30px rgba(0,0,0,0.1);
```

Code blocks are the **only** elements with a border-radius and a box-shadow. Inline code uses `#ff79c6` (Dracula pink) — the single chromatic exception in content. This is intentional: code is a different world inside the document.

---

## Responsive

| Breakpoint | Change                                                        |
| ---------- | ------------------------------------------------------------- |
| `≤ 768px`  | Padding: `5rem 1.5rem`                                        |
|            | Tagline: `2.1rem → 1.6rem`                                    |
|            | Row main: stacks vertically (`flex-direction: column`)        |
|            | Interest groups: stack vertically, category width `auto`     |
|            | Footer: stacks vertically                                     |
|            | Article title: `3rem → 2.2rem`                                |
|            | Article body: `1.25rem → 1.1rem`                             |

The design is mobile-first in spirit: the narrow column barely changes because it's already optimized for single-column reading. Mobile adjustments are purely typographic downscaling and flex-direction flips.

---

## What this design is NOT

- **Not a card-based design.** No elevated surfaces, no shadows on content cards.
- **Not colorful.** One accent color, used twice.
- **Not animated.** One pulse, one reserved fade. Motion is structural (smooth scroll), not decorative.
- **Not dense.** 680px column, 7rem section gaps, 2rem row padding. Breathing room is the design.
- **Not symmetric in typography.** Three fonts, three jobs, zero overlap.

---

## Quick reference

```css
:root {
  --bg: #0d0d0d;
  --text: #f5f5f5;
  --muted: #6e6e6e;
  --light: #9a9a9a;
  --border: #1c1c1c;
  --hover: #161616;
}

body {
  font-family: 'Inter', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

.mono  { font-family: 'JetBrains Mono', monospace; font-size: 11px; }
.serif { font-family: 'Crimson Pro', serif; }
```

Fonts: **Inter** (400, 500, 600) · **Crimson Pro** (400, italic 400) · **JetBrains Mono** (400)