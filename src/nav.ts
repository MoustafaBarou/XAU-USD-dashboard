// Single source of truth for sidebar labels AND the App render switch.
// Keeping them in one place guarantees the keys match exactly.
export const NAV_ITEMS = [
  'Dashboard',
  'Reports',
  'Calendar',
  'Macro Desk',
  'News Intelligence',
  'Economic Calendar',
  'Market Mood',
  'Journal',
  'Settings',
] as const;

export type NavItem = (typeof NAV_ITEMS)[number];
