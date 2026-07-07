# ReeTrack — Design Guide

How to build new ReeTrack screens so they feel like one product. This is the
contract behind the tokens in `src/index.css`; read it before adding a page.

---

## 1. The identity in one paragraph

ReeTrack is a **tool for people who track their work precisely** — developers,
agencies, technical teams. So the app chrome reads like a developer tool:
a deep "ink" sidebar, monospace for anything that is *data* (timers, durations,
rates, emails, IDs), generous whitespace, and **solid, quiet buttons**. The one
piece of brand flourish is the **trademark line**: a hairline (`h-px`) of the
**#4366E2 → #BF6DE6** gradient, used under the ReeTrack wordmark and under the
timer input. The standalone auth screens are the warm, human counterweight:
cream paper with a few hand-drawn "crayon" blobs.

Three rules keep it from looking like every AI-generated gradient dashboard:

1. **The gradient only ever appears as the thin trademark line.** Never on a
   button, a panel, a fill, or a background. If you want brand color on a solid
   element, use the flat `brand` blue — not the gradient.
2. **Buttons are simple.** Solid `brand` blue (`hover:bg-brand-deep`) for
   primary, outlined navy for secondary. No colored glows, no lift-on-hover
   theatrics, no gradients.
3. **Data is monospace.** Numbers and identifiers in `DM Mono` with
   tabular figures is the single strongest "this is a technical tool" signal,
   and it's the opposite of the soft, all-sans AI look.

---

## 2. Color

All colors are Tailwind tokens (defined in `@theme`). Use the token utilities
(`bg-brand`, `text-navy`, `border-brand-tint`), never raw hex in components.

### Brand (the gradient)
| Token | Hex | Use |
|---|---|---|
| `brand` | `#4366E2` | Solid brand blue: dots, icons, focus borders, links, active text |
| `brand-hi` | `#BF6DE6` | Gradient terminus only — rarely used as a solid |
| `brand-deep` | `#3552C4` | Hover for a *solid* brand fill (not the gradient) |
| `brand-tint` | `#EEF1FD` | Light indigo wash: notices, soft chips, "coming soon" pills |
| `brand-veil` | `#F6EEFB` | Light violet wash: large decorative auth blobs |

**The gradient** is applied with the helper class `bg-brand-gradient` (135°,
brand → brand-hi) — never hand-roll `bg-gradient-to-br from-... to-...`, because
a consistent angle is what makes it look intentional.

Where the gradient is allowed: **the trademark hairline only** — a full-width
`h-px` (or at most `h-[2px]`) line under the ReeTrack wordmark (sidebar) and
under the timer input. That is the entire list. Anywhere else that needs brand
color uses the solid `brand` blue.

### Ink & paper
| Token | Hex | Use |
|---|---|---|
| `ink` | `#0E1526` | Sidebar / dark chrome background |
| `ink-raised` | `#18213A` | Raised surfaces on ink (reserved) |
| `navy` | `#1B2540` | Primary text on light surfaces |
| `surface-muted` | `#F2F4F9` | Segmented controls, avatar chips, hover fills |
| `cream` / `cream-card` | `#FBF6EC` / `#F1EAD9` | Auth-screen paper only |

On the ink sidebar, tint with white alpha (`text-white/55`, `hover:bg-white/[0.06]`),
not with gray tokens.

### Crayon accents (semantic + character)
`orange`, `yellow`, `green`, `red` and their `-tint` variants. Two jobs:
- **Status/semantics:** green = active/success, red = error/danger, yellow =
  pending. Use the `-tint` behind text of the same hue (e.g. `bg-red-tint text-red`).
- **Character:** the tilted rounded blobs on auth screens. Keep them hand-placed
  and slightly rotated — never centered or evenly spaced. This is the human
  touch; don't sand it off.

---

## 3. Typography

Three families, each with a job. Don't reach outside these.

| Family | Token | Use it for |
|---|---|---|
| **Space Grotesk** | `font-display` | Headings, nav labels, button text, table headers — anything structural/UI |
| **Manrope** | `font-sans` (default) | Body copy, descriptions, paragraphs |
| **DM Mono** | `font-mono` | **Data:** timers, durations, totals, rates, emails, IDs, initials, uppercase eyebrows |

Rules:
- Any **number a user reads as a value** (0:00:00, $120/hr) is `font-mono` +
  `tabular-nums` so digits don't jitter as they change.
- DM Mono is a modern, light monospace — lean into it. The hero timer digit is
  `font-light` (300); secondary values (totals, rates, initials) are
  `font-normal`/`font-medium`. Never `font-bold` — heavy numerals kill the look.
- Uppercase micro-labels ("COMING SOON", step badges) are `font-mono`, ~11–12px,
  `tracking-[0.12em]`, low-contrast color.
- Headings: `font-display font-bold`. Page title ≈ 19px in-app, 28px on auth
  cards, 56px on the onboarding hero.
- Body: 13px in dense app UI, 15px on auth screens, `leading-[1.5]–[1.6]`.
- Weights available: display 400–700, sans 400–800, mono 300–500. Don't fake
  weights the font doesn't ship.

---

## 4. Spacing, radius, shadow

**Spacing** — an 8px-ish rhythm with a 4px half-step. In-app pages use a
centered `px-10 py-8` column (see §6); vertical gaps between blocks are
`gap-4`–`gap-6`. Inside cards use
`px-3.5 / px-5` and `py-2 / py-3`. Prefer the Tailwind scale; the occasional
odd pixel value (`py-[7px]`, `gap-[9px]`) is fine to hit a mockup, but don't
invent new ones where a scale step works.

**Radius** — rounded, consistent by element size:
- Pills / buttons / toggles: `rounded-full`
- Cards & panels: `rounded-[18px]` (large), `rounded-[16px]` (rail), `rounded-[14px]` (chips, dropdowns)
- Modals: `rounded-[20px]` · Auth cards: `rounded-[24px]`
- Small square tiles (avatars, icon tiles): `rounded-[9px]`–`rounded-[16px]`

**Shadow** — one token, `shadow-card` (`0 10px 28px rgba(20,29,51,.08)`), for
every resting card on white. Elevated/overlay surfaces (dropdowns, modals) go
deeper and ad-hoc (`0_16px_36px…`, `0_24px_56px…`). Buttons and brand elements
stay **flat** — no glow, colored or otherwise.

---

## 5. Component patterns

- **Primary button:** solid `bg-brand text-white rounded-full`,
  `hover:bg-brand-deep`, `transition-colors`. No shadow, no lift. Icon-only
  primary actions (e.g. the timer Start) are a `rounded-full` blue circle.
- **Secondary button:** `border-[1.5px] border-navy text-navy bg-transparent`,
  `rounded-full`. Cancel/neutral actions.
- **Card:** `rounded-[18px] bg-white shadow-card`.
- **Trademark line:** `block h-px w-full bg-brand-gradient` under a wordmark or
  a primary input. The only place the gradient appears.
- **Segmented toggle:** `rounded-full bg-surface-muted p-[3px]`; active segment
  `bg-navy text-cream`, inactive `text-navy/55`.
- **Input / focus:** `border-[1.5px] border-navy/[0.08]`, focus →
  `focus:border-brand` (or `focus-within:border-brand` on a wrapping label).
- **Status pill:** colored dot + label (`components/ui/Pill.tsx`); dot uses the
  semantic crayon color.
- **Sidebar nav item:** inactive `text-white/70 hover:bg-white/[0.06]`, active
  solid `bg-brand text-white` (`components/layout/NavItem.tsx`).

Reuse `components/ui/*` (Icon, Modal, Pill, BrandMark, Fineprint) rather than
re-styling their patterns inline.

---

## 6. Page width — never fill the whole viewport

In-app screens do **not** stretch edge to edge. Content sits in a **centered
column** with a max width, so it stays comfortable to read on wide monitors and
the app feels composed rather than sprawling.

- **Max width: `max-w-[1340px]`**, centered with `mx-auto w-full`.
- **Outer padding: `px-10 py-8`.**
- This applies to every in-app screen (Timer, Members, …) so they share the same
  measure. Only the persistent sidebar is full-height; the content column is not.

If a screen needs full-area click behaviour (e.g. click-anywhere-to-close menus),
keep the padded, full-width wrapper for the handler and put the `max-w-[1340px]`
column *inside* it — see `MembersPage.tsx`.

### Scaffolding a new in-app page

```tsx
export default function ThingPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1340px] flex-col gap-6 px-10 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[19px] font-bold text-navy">Thing</h1>
          <p className="mt-[3px] max-w-[560px] text-[13px] leading-[1.5] text-navy/60">
            One line on what this screen is for.
          </p>
        </div>
        {/* one solid-blue primary action, if any */}
      </header>

      {/* content in rounded-[18px] bg-white shadow-card cards */}
    </div>
  )
}
```

The page renders inside `AppLayout` (persistent `Sidebar` + `<Outlet />`), so it
owns only its own padding and content. Register it in `config/navigation.ts` so
the sidebar and router pick it up automatically.

Auth-style (standalone, no shell) screens instead go on `bg-cream`, centered,
with a white `rounded-[24px]` card and a couple of tilted crayon blobs behind it —
mirror `pages/SignInPage.tsx`.

---

## 7. Quick do / don't

**Do** — keep the gradient to the trademark hairline · solid `brand` blue for
buttons/active nav · mono + tabular for every value · keep sidebar text readable
(`text-white/70`+) · reuse `ui/*` · tilt the crayon blobs.

**Don't** — gradient on any button, fill, or background · a second gradient
angle · colored glows or lift-on-hover on buttons · sans-serif for timers or
rates · faint low-opacity sidebar text · new color hexes in components (add a
token instead) · evenly-spaced, centered blobs.
