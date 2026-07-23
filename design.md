# ReeTrack — Design Guide

How to build new ReeTrack screens so they feel like one product. This is the
contract behind the tokens in `src/index.css`; read it before adding a page.

---

## 1. The identity in one paragraph

ReeTrack is a **tool for people who track their work precisely** — developers,
agencies, technical teams. The app chrome reads like a developer tool: a deep
"ink" sidebar, monospace for anything that is *data* (timers, durations,
rates, counts, IDs), generous whitespace, and **solid, quiet buttons**. Pages
sit on a soft near-white **canvas** so white cards lift off the background and
the ink chrome meets a gentle edge. Color comes from *data*, not decoration:
every project, tag and client carries its own accent, shown as **soft-tint
swatches** (the same wash as calendar event fills) and as tints and marks at
row scale. Motion is calm and purposeful — things settle into place; nothing
glows or bounces.

Four rules keep it from looking like every AI-generated gradient dashboard:

1. **The brand gradient is a frame, not a fill.** It appears hairline-thin
   (trademark line, auth-card and modal frames) or as a barely-there wash
   (active sidebar item). Never as a button fill or a panel background.
2. **Buttons are simple.** Solid `brand` blue for primary (or an icon-only
   blue circle), quiet ghost outline for secondary. No gradients, no glows,
   no lift-on-hover.
3. **Data is monospace.** Numbers, durations, rates, counts and uppercase
   eyebrows in `DM Mono` with tabular figures.
4. **Statuses are words, not badges.** Role/status render as plain coloured
   text — no chips, no dots, no uppercase-tracking badge chrome. That badge
   look is the fastest way to make a screen read as generated.

---

## 2. Color

All colors are Tailwind tokens (defined in `@theme`). Use the token utilities
(`bg-brand`, `text-navy`, `border-brand-tint`), never raw hex in components.

### Brand (the gradient)
| Token | Hex | Use |
|---|---|---|
| `brand` | `#4366E2` | Solid brand blue: primary buttons, icons, focus borders, links, "invited/pending" status text |
| `brand-hi` | `#BF6DE6` | Gradient terminus; also the "admin" role text |
| `brand-deep` | `#3552C4` | Hover for a *solid* brand fill (not the gradient) |
| `brand-tint` | `#EEF1FD` | Light indigo wash: notices, soft chips, decorative blobs |
| `brand-veil` | `#F6EEFB` | Light violet wash: decorative blobs (auth, modal corners) |

**The gradient** is applied with `bg-brand-gradient` (135°, brand → brand-hi)
or its soft-alpha sibling `bg-brand-gradient-soft` — never hand-roll
`bg-gradient-to-br`; one angle everywhere is what makes it look intentional.

Where the gradient is allowed — the entire list:
- A full-width `h-px` trademark line under the `LogoMark` on standalone auth
  screens, and under the timer input.
- A 1px frame (`p-px` wrapper) around the standalone auth card **and around
  every modal dialog** — the app's two "special surface" frames.
- `bg-brand-gradient-soft` (≈32% alpha wash) as the **active sidebar item**
  background on ink.

Anywhere else that needs brand color uses the solid `brand` blue. Never a
button fill.

### Ink, paper, canvas
| Token | Hex | Use |
|---|---|---|
| `canvas` | `#F7F8FB` | App-shell background behind every routed page; also the modal panel fill |
| `ink` | `#0E1526` | Sidebar / dark chrome background; modal scrim (`bg-ink/50`) |
| `navy` | `#1B2540` | Primary text on light surfaces |
| `surface-muted` | `#F2F4F9` | Hover fills, skeleton bones, avatar chips |
| `cream` / `cream-card` | `#FBF6EC` / `#F1EAD9` | Active segmented-toggle text on navy (`text-cream`); reserved otherwise |

Cards are `bg-white` on the canvas. Standalone auth screens stay pure white
paper. On ink, tint with white alpha (`text-white/70`, `hover:bg-white/[0.06]`).

### Entity accents (the crayon energy)
`PROJECT_COLORS` (`src/lib/projectColors.ts`) is the shared accent palette for
projects and tags; clients derive a stable accent from it by hash. Accents
appear:
- **As soft-tint fills** — `softAccentFill` / `SOFT_ACCENT_TINT` (0.72 toward
  white) in `src/lib/color.ts`. Same treatment for calendar event cards and
  project-row identity squares (`rounded-sm`). Colourless accents fall back to
  `NO_ACCENT_COLOR` (`#C7CDDB`).
- **As row tints** — tag rows wash the tag colour into white
  (`.tag-tint-row`, `color-mix` 10% → 18% on hover).
- **Pure** only at small scale: swatch pickers, the tag diamond swatch.
- **Clients (legacy)** — DiceBear `glass` tiles via `clientCoverUrl` /
  nested `projectCoverUrl` on the clients directory until those rows migrate
  to soft-tint swatches.

### Semantic status text
Status words are coloured plain text (see §5): active/accepted = deep green,
invited/pending = `brand`, admin = `brand-hi`, archived/disabled/revoked =
`text-navy/45`, expired/error = `red`. The crayon `-tint` tokens
(`bg-red-tint text-red`, …) remain for notices and error surfaces.

### Decorative blobs (character)
Tilted brand-family shapes (`brand`, `brand-hi`, `brand-tint`, `brand-veil` —
never crayon colors) give standalone auth screens, first-run empty states and
modal corners a human touch. Hand-placed, slightly rotated, never centered or
evenly spaced. Keep them faint inside modals (≤ 50% opacity washes).

---

## 3. Glass

Glass is the app's **elevation language**: a surface goes translucent-and-
blurred only when it floats above live content that can melt through it.

| Surface | Treatment |
|---|---|
| Dropdowns / row menus / pickers | `bg-white/80 backdrop-blur-xl shadow-dropdown` |
| Modal scrim | `bg-ink/50 backdrop-blur-md` (the page visibly frosts) |
| Buttons/chips floating on imagery | white glass circle (e.g. the card kebab) |

**Solid surfaces stay solid**: the sidebar, resting cards, buttons and the
modal panel itself (opaque `canvas` — a translucent panel over the dark scrim
turns muddy blue). Glass over a flat background is indistinguishable from a
tint; don't add decoration behind a surface just to justify blurring it.

---

## 4. Typography

Three families, each with a job. Don't reach outside these — when a screen
looks "cheap", the fix is almost always that structural text isn't using
`font-display`, not a missing fourth font.

| Family | Token | Use it for |
|---|---|---|
| **Space Grotesk** | `font-display` | Headings, nav labels, button text, card/row titles — anything structural |
| **Manrope** | `font-sans` (default) | Body copy, descriptions, quiet secondary columns |
| **DM Mono** | `font-mono` | **Data:** timers, durations, rates, counts, IDs, uppercase eyebrows, mono toolbar labels |

**Type scale** (rem tokens in `@theme` — prefer these over `text-[Npx]`):

| Utility | Size | Use |
|---|---|---|
| `text-xs` | 0.625rem (10px) | Tiny hints / field footnotes |
| `text-eyebrow` | 0.65625rem (10.5px) | Uppercase eyebrows, mono toolbar labels |
| `text-micro` | 0.6875rem (11px) | Micro labels ("ARCHIVED" inline marks) |
| `text-label` | 0.71875rem (11.5px) | Form field labels |
| `text-sm` | 0.75rem (12px) | Compact chrome / dense secondary UI |
| `text-caption` | 0.78125rem (12.5px) | Secondary labels, menu rows, status words, table emails |
| `text-body` | 0.8125rem (13px) | Dense in-app body copy and controls |
| `text-notice` | 0.84375rem (13.5px) | Auth notices / soft callouts |
| `text-md` | 0.875rem (14px) | Card/row titles, mid-weight list text |
| `text-body-lg` | 0.9375rem (15px) | Auth body / section titles |
| `text-lg` | 1rem (16px) | Large free-text inputs |
| `text-xl` | 1.1875rem (19px) | In-app page titles |
| `text-timer` | 1.375rem (22px) | Live timer digits |
| `text-2xl` | 1.75rem (28px) | Auth card headings |
| `text-3xl` | 3.5rem (56px) | Onboarding welcome hero |

Rules:
- Any **number a user reads as a value** (0:00:00, 95 EUR/h, task counts,
  the page-header count) is `font-mono tabular-nums`.
- **Mono toolbar labels** — segmented toggles and filter pills use
  `font-mono text-eyebrow font-medium tracking-[0.12em] uppercase`. This is
  the "status is data" signal that ties toolbars to the rest of the system.
- Sidebar section labels: same mono treatment at `tracking-[0.16em]`,
  `text-white/40`.
- Card/row titles: `font-display font-semibold text-md` (or `text-caption`
  for nested rows). Headings: `font-display font-bold`.
- Emails: mono by default (they're identifiers), but a dense table column of
  emails may drop to quiet `text-caption` sans for readability — Members does.
- DM Mono is light — hero digits `font-light`, secondary values
  `font-normal`/`font-medium`, never `font-bold`.

---

## 5. Component patterns

- **Primary button:** solid `bg-brand text-white rounded-full`,
  `hover:bg-brand-deep`, `transition-colors`. Page headers use the icon-only
  form: a `size-9 rounded-full bg-brand` circle with a plus, labelled via
  `aria-label`/`title`.
- **Secondary / cancel:** ghost `border-control border-navy/20 text-navy/70`,
  sharpening to `border-navy text-navy` on hover.
- **Card:** `rounded-2xl bg-white shadow-card`. Hover may deepen the shadow
  (`hover:shadow-panel`).
- **Modal:** ink-frosted scrim → gradient hairline frame (`rounded-3xl
  bg-brand-gradient p-px shadow-modal`) → opaque `bg-canvas` panel with faint
  corner blobs, an ✕ button and Escape-to-close. Scrim `animate-fade`, panel
  `animate-pop`, form groups stagger in with `animate-rise`. Fields on the
  panel are translucent `bg-white/70` and turn solid white on focus.
- **Segmented toggle (views/status tabs):** white track
  (`bg-white p-segment shadow-soft`), mono uppercase labels, active segment
  `bg-navy text-cream`.
- **Filter pill (dropdown):** same mono uppercase language; **unfiltered** is
  white with `text-navy/55`, **applied** flips to `bg-navy text-cream` and
  shows the chosen value.
- **Status / role text:** plain `text-caption font-medium` words coloured per
  §2 — no chips, dots or badge chrome. Admin adds `font-semibold`.
- **Row identity visuals:** people get `UserAvatar` (boring-avatars, brand
  palette); project rows get soft-tint squares via `softAccentFill`; clients
  and nested project rows on Clients still use small glass cover tiles.
  Archived/disabled anything: `opacity-50 grayscale`.
- **Tag rows:** `.tag-tint-row` with `--tag-color` set inline; the leading
  diamond (`rotate-45 rounded-[2px]`) is the tag's colour swatch.
- **Expandable rows (clients):** the row toggles (`aria-expanded`, chevron
  rotates), the expansion sits on `bg-canvas/60` behind a hairline top border
  and lazily fetches; nested rows are real `Link`s.
- **Column headers:** icon-only — `h-4 w-4 text-brand` icons with
  `title` tooltip + `sr-only` label.
- **Skeletons:** every list/grid loads as ghost rows/cards matching the real
  geometry (`bg-surface-muted` bones, `animate-pulse`, ~100ms stagger) — never
  a lone spinner.
- **Status notice:** `rounded-xl bg-brand-tint` bar with a brand dot.
- **Sidebar (216px ink):** `LogoMark h-7` on top (no underline here — the
  trademark line lives on auth screens and under the timer input), a Profile
  row beneath it (avatar in the icon slot), mono section labels, then nav.
  Rows share `sidebarRow.ts` chrome: active = `bg-brand-gradient-soft
  text-white`, hover = a vertical inflate (`py-2 → hover:py-3`, padding
  transition — never `scale`, which warps glyphs).

Reuse `components/ui/*` (Icon, Modal, Pill, LogoMark, UserAvatar, Fineprint)
rather than re-styling their patterns inline.

---

## 6. Motion

Animation tokens live in `@theme`; every entrance/transform is gated behind
`motion-safe:`.

| Token | Use |
|---|---|
| `animate-rise` | Staggered entrances: grid cards, list rows, modal form groups. Delay ≈ 30–45ms per item, capped (~12 items) so long lists don't trickle |
| `animate-fade` | Modal scrim |
| `animate-pop` | Modal panel (springs up into place) |

Plus transition patterns: `transition-colors` on everything interactive,
slow image zoom on card hover (`scale-105`, 500ms), `grid-template-rows`
unfold for hover-expand meta, padding inflate on sidebar rows, rotating
chevrons on expanders.

**Content may move; controls stay planted.** No lift, glow or scale on
buttons. Motion should read as things settling into place, not as showing off.

---

## 7. Spacing, radius, shadow

**Spacing** — chrome half-steps as named tokens, plus Tailwind's numeric
scale. **Do not** add `--spacing-xs/sm/md` — those names feed `max-w-*`/`w-*`
and would collapse them.

| Utility | Size | Use |
|---|---|---|
| `p-segment` | 0.1875rem (3px) | Segmented-toggle track inset |
| `p-menu` | 0.3125rem (5px) | Dropdown inset |
| `py-compact` | 0.4375rem (7px) | Search bars, toolbar pills |
| `py-field` | 0.5625rem (9px) | Form inputs / primary CTA vertical padding |
| `p-modal` | 1.625rem (26px) | Modal dialog padding |
| `size-control` | 2.125rem (34px) | Toolbar icon buttons |
| `size-icon-sm` / `size-icon-play` / `size-icon-md` | 13 / 15 / 18px | Inline icons |

**Radius** — rem scale (overrides Tailwind defaults):
pills/buttons `rounded-full` · menu rows `rounded-xs` · small tiles
`rounded-sm` · inputs `rounded-md` · soft panels `rounded-lg` · chips,
notices, dropdowns `rounded-xl` · cards `rounded-2xl` · modals `rounded-3xl` ·
auth cards `rounded-4xl`.

**Shadow** — `shadow-soft` (toolbar pills/tracks) · `shadow-float` (floating
toolbars) · `shadow-card` (resting cards; hover may deepen to `shadow-panel`)
· `shadow-dropdown` · `shadow-modal` · `shadow-auth`. Buttons stay flat.

**Measure** — page column `max-w-page` (1340px) · lede `max-w-lede` · auth
card `w-auth` · timer field widths per token list in `index.css`.

---

## 8. Page scaffolding

In-app screens sit on the shell's `canvas` in a **centered column**
(`max-w-page`, `px-10 py-8`); only the sidebar is full-height. Directory
pages (Projects, Members, Tags, Clients) share this skeleton:

```tsx
export default function ThingsPage() {
  return (
    <div className="min-h-full flex-1 px-10 py-8" onClick={closeMenus}>
      <div className="mx-auto flex w-full max-w-page flex-col gap-4">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <h1 className="font-display text-xl font-bold text-navy">Things</h1>
            {/* zero-padded mono count: 07 */}
            <span className="font-mono text-sm text-navy/40 tabular-nums">07</span>
          </div>
          {/* icon-only blue circle: aria-label="New thing" */}
        </header>

        {/* toolbar: mono segmented toggle · filter pills · search pill */}
        {/* content: cards/rows with skeleton loaders and rise entrances */}
      </div>
    </div>
  )
}
```

No lede paragraph under the title — the screen should explain itself.
Register the page in `config/navigation.ts`.

Standalone auth screens are unchanged: white paper, tilted brand blobs, the
gradient-framed card (or `LogoMark` + trademark hairline when there's no
card). Mirror `pages/SignInPage.tsx`.

---

## 9. Quick do / don't

**Do** — gradient only as hairline frames + the sidebar's soft active wash ·
solid blue for buttons (icon-only circle in page headers) · mono + tabular
for every value, mono uppercase for toolbar labels · soft-tint entity fills
(calendar + projects) · glass only on floating surfaces · skeletons that match
real geometry · staggered `animate-rise` entrances behind `motion-safe:` ·
plain coloured words for status · reuse `ui/*`.

**Don't** — gradient on any button or panel fill · glows or lift on buttons ·
badge/chip/dot chrome on statuses (the "AI dashboard" tell) · translucent
modal panels over the dark scrim · glass on surfaces with nothing behind
them · sans-serif timers or rates · new hexes in components (add a token —
the deep green `#1E8A57` and amber `#B8860B` status hues are the known
stragglers to tokenize) · uncapped stagger delays on long lists · a second
gradient angle.
