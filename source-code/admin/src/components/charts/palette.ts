/*
  Chart palette (foundations §6). Semantic status colors are NOT reused for
  series — charts get their own ordered categorical palette so a bar never
  looks like it means "Expired". Assign in sequence, never let Recharts pick.
*/
export const CHART_SERIES = [
  '#1b8b4e', // deep leaf (primary)
  '#53cf81', // Harboost brand green
  '#0f5c33', // dark leaf
  '#c89a3d', // brewed gold
  '#8fbba1', // young leaf
  '#e0bc72', // light gold
  '#5b7b8a', // slate-teal (overflow)
]

// Grade overrides — always consistent with the badges.
export const GRADE_SUPER = '#c89a3d'
export const GRADE_NORMAL = '#3e7d58'

export const CHART_GRID = '#edf0ea'
export const CHART_AXIS = '#566a5d'
