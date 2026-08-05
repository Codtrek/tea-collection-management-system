export const typography = {
  //Hero
  hero: {
    fontSize: 38,
    fontWeight: "700",
    lineHeight: 46,
  },

  // Large page titles
  heading: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 32,
  },


  // Section titles / card titles
  subheading: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 26,
  },

  // Normal readable text
  body: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24,
  },

  // Smaller supporting text
  bodySmall: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },

  // Labels (input labels, field names)
  label: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },

  // Small information
  caption: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
} as const;


export type TypographyVariant = keyof typeof typography;