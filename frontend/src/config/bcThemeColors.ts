/**
 * British Columbia design-system palette and app UI tokens.
 * Single source of truth for Chakra theme colors and raw CSS (gradients, glass bars).
 *
 * Import `BC_THEME_CONFIG` anywhere in the app (e.g. canvas, charts, non-Chakra UI).
 * Chakra theme (`theme.ts`) is built from this object so tokens stay aligned.
 *
 * @see https://www2.gov.bc.ca/gov/content/digital/design-system/foundations/colour
 */

const foundation = {
  primaryBlue: '#013366',
  primaryGold: '#FCBA19',
  linkBlue: '#255A90',
  textPrimary: '#2D2D2D',
} as const

const surfaces = {
  lightGrayBg: '#FAF9F8',
  neutralWash: '#F3F2F1',
  darkMeshAccent: '#1a1008',
} as const

const palettes = {
  brand: {
    50: '#F1F8FE',
    100: '#D8EAFD',
    200: '#C1DDFC',
    300: '#A8D0FB',
    400: '#91C4FA',
    500: foundation.primaryBlue,
    600: '#1E5189',
    700: '#01264C',
    800: '#011f3d',
    900: '#011829',
  },
  bcGold: {
    50: '#FEF8E8',
    100: '#FEF0D8',
    200: '#FDE9C4',
    300: '#FCE2B0',
    400: '#FBDA9D',
    500: foundation.primaryGold,
    600: '#E5A910',
    700: '#C9910B',
    800: '#A87708',
    900: '#7A5706',
  },
} as const

const gradients = {
  loginLandingLight: `linear(to-br, ${palettes.brand[50]} 0%, ${surfaces.lightGrayBg} 50%, ${surfaces.neutralWash} 100%)`,
  loginLandingDark: `linear(to-br, ${palettes.brand[900]} 0%, ${palettes.brand[700]} 55%, ${surfaces.darkMeshAccent} 100%)`,
  wizardHeaderLight: `linear-gradient(135deg, ${palettes.brand[50]} 0%, ${surfaces.lightGrayBg} 45%, ${palettes.brand[100]} 100%)`,
  wizardHeaderDark: `linear-gradient(135deg, ${palettes.brand[900]} 0%, ${palettes.brand[700]} 50%, ${palettes.brand[800]} 100%)`,
  wizardAccentBar: `linear(to-r, ${foundation.primaryBlue}, ${foundation.linkBlue}, ${foundation.primaryGold})`,
} as const

const appChrome = {
  stickyBarBgLight: 'rgba(255,255,255,0.92)',
  stickyBarBgDark: 'rgba(23,25,35,0.92)',
  backdropBlur: 'saturate(180%) blur(8px)',
} as const

const wizard = {
  railDoneLight: foundation.linkBlue,
  railDoneDark: palettes.brand[400],
} as const

export const BC_THEME_CONFIG = {
  foundation,
  surfaces,
  palettes,
  gradients,
  appChrome,
  wizard,
} as const

export type BcThemeConfig = typeof BC_THEME_CONFIG
