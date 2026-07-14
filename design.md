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
**#4366E2 → #BF6DE6** gradient, used under the `LogoMark` (sidebar and
standalone auth screens) and under the timer input. The standalone auth screens are the human counterweight: white
paper with a few hand-placed blobs in the brand blue/purple family, and the
one card on screen framed in a hairline of the same gradient.

Three rules keep it from looking like every AI-generated gradient dashboard:

1. **The gradient only ever appears hairline-thin.** Two places: the trademark
   line under a wordmark/logo, and the 1px frame around a standalone auth
   card. Never as a button fill, a panel background, or a glow. If you want
   brand color on a solid element, use the flat `brand` blue — not the gradient.
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

Where the gradient is allowed — the entire list:
- A full-width `h-px` (or at most `h-[2px]`) trademark line under the
  `LogoMark` (sidebar, and auth screens with no card, e.g. the onboarding
  welcome step) and under the timer input.
- A 1px frame around the standalone auth card: an outer `p-px` wrapper in
  `bg-brand-gradient` holding the white card, in place of a solid border.

Anywhere else that needs brand color uses the solid `brand` blue.

### Ink & paper
| Token | Hex | Use |
|---|---|---|
| `ink` | `#0E1526` | Sidebar / dark chrome background |
| `ink-raised` | `#18213A` | Raised surfaces on ink (reserved) |
| `navy` | `#1B2540` | Primary text on light surfaces |
| `surface-muted` | `#F2F4F9` | Segmented controls, avatar chips, hover fills, auth-screen info panels |
| `cream` / `cream-card` | `#FBF6EC` / `#F1EAD9` | Active segmented-toggle text on navy (`text-cream`); reserved otherwise |

On the ink sidebar, tint with white alpha (`text-white/55`, `hover:bg-white/[0.06]`),
not with gray tokens.

### Crayon accents (semantic)
`orange`, `yellow`, `green`, `red` and their `-tint` variants are for
**status/semantics only:** green = active/success, red = error/danger, yellow =
pending. Use the `-tint` behind text of the same hue (e.g. `bg-red-tint text-red`).

### Auth-screen blobs (character)
The tilted decorative shapes on standalone auth screens (`SignInPage`,
`OnboardingPage`) use the brand blue/purple family only — `brand`, `brand-hi`,
`brand-tint`, `brand-veil` — never the crayon colors above. Mix a couple of
large soft washes (`brand-tint`/`brand-veil`) with several smaller solid or
rotated shapes (`brand`/`brand-hi`) for depth. Keep them hand-placed and
slightly rotated — never centered or evenly spaced. This is the human touch;
don't sand it off.

---

## 3. Typography

Three families, each with a job. Don't reach outside these.

| Family | Token | Use it for |
|---|---|---|
| **Space Grotesk** | `font-display` | Headings, nav labels, button text, table headers — anything structural/UI |
| **Manrope** | `font-sans` (default) | Body copy, descriptions, paragraphs |
| **DM Mono** | `font-mono` | **Data:** timers, durations, totals, rates, emails, IDs, initials, uppercase eyebrows |

**Type scale** (rem tokens in `@theme` — prefer these over `text-[Npx]`).
Even steps (`xs`/`sm`/`md`/`lg`/…) plus the half-steps dense chrome needs:

| Utility | Size | Use |
|---|---|---|
| `text-xs` | 0.625rem (10px) | Tiny hints / field footnotes |
| `text-eyebrow` | 0.65625rem (10.5px) | Uppercase table/section eyebrows |
| `text-micro` | 0.6875rem (11px) | Micro labels, step badges |
| `text-label` | 0.71875rem (11.5px) | Form field labels |
| `text-sm` | 0.75rem (12px) | Compact chrome / dense secondary UI |
| `text-caption` | 0.78125rem (12.5px) | Secondary labels, menu rows |
| `text-body` | 0.8125rem (13px) | Dense in-app body copy and controls |
| `text-notice` | 0.84375rem (13.5px) | Auth notices / soft callouts |
| `text-md` | 0.875rem (14px) | Entry titles, mid-weight list text |
| `text-body-lg` | 0.9375rem (15px) | Auth body / section titles |
| `text-lg` | 1rem (16px) | Large free-text inputs |
| `text-xl` | 1.1875rem (19px) | In-app page titles |
| `text-timer` | 1.375rem (22px) | Live timer digits |
| `text-plus` | 1.125rem (18px) | List-item + glyph |
| `text-2xl` | 1.75rem (28px) | Auth card headings |
| `text-3xl` | 3.5rem (56px) | Onboarding welcome hero |

Rules:
- Any **number a user reads as a value** (0:00:00, $120/hr) is `font-mono` +
  `tabular-nums` so digits don't jitter as they change.
- DM Mono is a modern, light monospace — lean into it. The hero timer digit is
  `font-light` (300); secondary values (totals, rates, initials) are
  `font-normal`/`font-medium`. Never `font-bold` — heavy numerals kill the look.
- Uppercase micro-labels ("COMING SOON", step badges) are `font-mono`,
  `text-xs`–`text-eyebrow`, `tracking-[0.12em]`, low-contrast color.
- Form labels: `font-display text-label font-semibold`.
- Headings: `font-display font-bold` with `text-xl` / `text-2xl` /
  `text-3xl` as appropriate.
- Body: `text-body` in dense app UI, `text-body-lg` on auth screens,
  `leading-[1.5]–[1.6]`.
- Weights available: display 400–700, sans 400–800, mono 300–500. Don't fake
  weights the font doesn't ship.

---

## 4. Spacing, radius, shadow

**Spacing** — chrome half-steps as named tokens, plus Tailwind’s numeric scale
(`p-1` = 4px, `p-2` = 8px, …). **Do not** add `--spacing-xs` / `--spacing-sm`
etc. — in Tailwind v4 those names also drive `max-w-sm` / `w-sm`, so a 0.5rem
`--spacing-sm` collapses `max-w-sm` to 8px and text wraps one character per line.

| Utility | Size | Use |
|---|---|---|
| `p-segment` / `mt-segment` | 0.1875rem (3px) | Segmented-toggle track inset, title→lede gap |
| `p-menu` / `ml-menu` | 0.3125rem (5px) | Dropdown inset, tight inline gaps |
| `py-compact` | 0.4375rem (7px) | Search bars, compact pills / toggles |
| `py-field` | 0.5625rem (9px) | Form inputs / primary CTA vertical padding |
| `p-modal` | 1.625rem (26px) | Modal dialog padding |
| `size-control` | 2.125rem (34px) | Tracker toolbar icon buttons |
| `size-icon-sm` / `size-icon-play` / `size-icon-md` | 0.8125rem / 0.9375rem / 1.125rem | Inline icons (13 / 15 / 18px) |

**Radius** — rem scale (overrides Tailwind defaults — use consistently):
- Pills / buttons / toggles: `rounded-full`
- Menu rows / tight controls: `rounded-xs` (6px)
- Small fields / calendar blocks: `rounded-sm` (8px)
- Inputs & form controls: `rounded-md` (10px)
- Soft panels / mention menus: `rounded-lg` (12px)
- Chips, notices, dropdowns: `rounded-xl` (14px)
- Cards & panels: `rounded-2xl` (18px)
- Modals / timer panel: `rounded-3xl` (20px)
- Auth cards: `rounded-4xl` (24px) for both frame and inner card
- One-off decorative tiles (auth blobs): keep arbitrary `rounded-[Npx]`

**Shadow** — tokens for resting and elevated surfaces:
- `shadow-soft` — light chrome (icon buttons, tiny chips)
- `shadow-float` — floating toolbars / segmented chrome
- `shadow-card` — every resting card on white
- `shadow-panel` — timer / raised panels
- `shadow-dropdown` — menus and pickers
- `shadow-modal` — modal dialogs
- `shadow-auth` — standalone auth card
Buttons and brand elements stay **flat** — no glow, colored or otherwise.

**Measure**
- Page column: `max-w-page` (1340px)
- Page subtitle: `max-w-lede` (560px)
- Auth card: `w-auth` (460px)
- Timer field columns: `w-manual-time` (92px), `w-duration-value` / `min-w-timer-cluster` (104px), `w-duration-date` (132px)
- Manual feedback: `min-w-manual-feedback-min` (320px), `max-w-manual-feedback` (520px)
- Timer error hint: `max-w-error-hint` (180px)

---

## 5. Component patterns

- **Primary button:** solid `bg-brand text-white rounded-full`,
  `hover:bg-brand-deep`, `transition-colors`. No shadow, no lift. Icon-only
  primary actions (e.g. the timer Start) are a `rounded-full` blue circle.
- **Secondary button:** `border-control border-navy text-navy bg-transparent`,
  `rounded-full`. Cancel/neutral actions.
- **Card:** `rounded-2xl bg-white shadow-card`.
- **Trademark line:** `block h-px w-full bg-brand-gradient` under a wordmark,
  `LogoMark`, or a primary input.
- **Auth card frame:** `rounded-4xl bg-brand-gradient p-px` outer wrapper
  around the white `rounded-4xl` card, in place of a solid border. The only
  two places the gradient appears — see §1.
- **Segmented toggle:** `rounded-full bg-surface-muted p-segment`; active segment
  `bg-navy text-cream`, inactive `text-navy/55`.
- **Input / focus:** `rounded-md border-control border-navy/[0.08] py-field`,
  focus → `focus:border-brand` (or `focus-within:border-brand` on a wrapping label).
- **Status pill:** colored dot + label (`components/ui/Pill.tsx`); dot uses the
  semantic crayon color.
- **Sidebar nav item:** inactive `text-white/70 hover:bg-white/[0.06]`, active
  solid `bg-brand text-white` (`components/layout/NavItem.tsx`).

Reuse `components/ui/*` (Icon, Modal, Pill, LogoMark, Fineprint) rather than
re-styling their patterns inline.

---

## 6. Page width — never fill the whole viewport

In-app screens do **not** stretch edge to edge. Content sits in a **centered
column** with a max width, so it stays comfortable to read on wide monitors and
the app feels composed rather than sprawling.

- **Max width: `max-w-page`**, centered with `mx-auto w-full`.
- **Outer padding: `px-10 py-8`.**
- This applies to every in-app screen (Timer, Members, …) so they share the same
  measure. Only the persistent sidebar is full-height; the content column is not.

If a screen needs full-area click behaviour (e.g. click-anywhere-to-close menus),
keep the padded, full-width wrapper for the handler and put the `max-w-page`
column *inside* it — see `MembersPage.tsx`.

### Scaffolding a new in-app page

```tsx
export default function ThingPage() {
  return (
    <div className="mx-auto flex w-full max-w-page flex-col gap-6 px-10 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-bold text-navy">Thing</h1>
          <p className="mt-segment max-w-lede text-body leading-[1.5] text-navy/60">
            One line on what this screen is for.
          </p>
        </div>
        {/* one solid-blue primary action, if any */}
      </header>

      {/* content in rounded-2xl bg-white shadow-card cards */}
    </div>
  )
}
```

The page renders inside `AppLayout` (persistent `Sidebar` + `<Outlet />`), so it
owns only its own padding and content. Register it in `config/navigation.ts` so
the sidebar and router pick it up automatically.

Auth-style (standalone, no shell) screens instead go on `bg-white`, centered,
with several tilted brand-blue/purple blobs behind it (§2). Where there's a
card (sign-in, invite, the onboarding admin step), frame it in the gradient
hairline (`rounded-4xl bg-brand-gradient p-px` wrapping a white
`rounded-4xl` inner card) and put the `LogoMark` inside it, above the
heading. Where there's no card (the onboarding welcome step), put `LogoMark`
directly on the page with the trademark hairline underneath it, same as in
the sidebar. Mirror `pages/SignInPage.tsx`.

---

## 7. Quick do / don't

**Do** — keep the gradient hairline-thin (wordmark underline or auth-card frame)
· solid `brand` blue for buttons/active nav · mono + tabular for every value ·
keep sidebar text readable (`text-white/70`+) · reuse `ui/*` · tilt the
auth-screen blobs.

**Don't** — gradient on any button, fill, or background · a second gradient
angle · colored glows or lift-on-hover on buttons · sans-serif for timers or
rates · faint low-opacity sidebar text · new color hexes in components (add a
token instead) · evenly-spaced, centered blobs.
