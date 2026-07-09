/**
 * Shared accent palette for projects (RT-38) and tags (RT-44). Kept in its own
 * module so the ColorSwatchPicker component file stays component-only (Fast
 * Refresh / react-refresh lint rule).
 */
export const PROJECT_COLORS = [
  '#4366E2',
  '#BF6DE6',
  '#2FBF71',
  '#FFC93C',
  '#FF6B4A',
  '#E0483E',
  '#2AA8A0',
  '#1B2540',
] as const
