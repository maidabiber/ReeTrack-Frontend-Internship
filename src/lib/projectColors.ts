/**
 * Shared accent palette for projects (RT-38) and tags (RT-44). Kept in its own
 * module so the ColorSwatchPicker component file stays component-only (Fast
 * Refresh / react-refresh lint rule).
 *
 * Tuned to the app's cool brand identity (the #4366E2 → #BF6DE6 gradient over
 * navy/ink): the swatches read as one family — indigo, violet, teal and a
 * couple of muted supporting accents — rather than the loud warm "crayon" hues,
 * which belong to the auth screens and looked out of place in the tracker.
 * Values stay UPPERCASE so ColorSwatchPicker's selected-state match works.
 */
export const PROJECT_COLORS = [
  '#4366E2', // brand indigo
  '#7C6CE0', // periwinkle
  '#BF6DE6', // orchid (brand terminus)
  '#C069A0', // plum
  '#2AA8A0', // teal
  '#3E9E6E', // emerald
  '#C0872F', // ochre — the one warm accent, muted to sit with the rest
  '#1B2540', // navy
] as const
