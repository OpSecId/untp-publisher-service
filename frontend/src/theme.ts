import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

/** B.C. Design System — https://www2.gov.bc.ca/gov/content/digital/design-system/foundations/colour */
const BC_PRIMARY_BLUE = '#013366'
const BC_PRIMARY_GOLD = '#FCBA19'
const BC_LINK_BLUE = '#255A90'
const BC_TEXT_PRIMARY = '#2D2D2D'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

export const theme = extendTheme({
  config,
  fonts: {
    heading: `'BC Sans', Verdana, Arial, sans-serif`,
    body: `'BC Sans', Verdana, Arial, sans-serif`,
  },
  colors: {
    /** Chakra `brand` scale aligned to theme.Blue* / primary actions (500 = BC primary blue). */
    brand: {
      50: '#F1F8FE',
      100: '#D8EAFD',
      200: '#C1DDFC',
      300: '#A8D0FB',
      400: '#91C4FA',
      500: BC_PRIMARY_BLUE,
      600: '#1E5189',
      700: '#01264C',
      800: '#011f3d',
      900: '#011829',
    },
    /** theme.primaryGold + scale — https://www2.gov.bc.ca/.../colour (Theme colours table). */
    bcGold: {
      50: '#FEF8E8',
      100: '#FEF0D8',
      200: '#FDE9C4',
      300: '#FCE2B0',
      400: '#FBDA9D',
      500: BC_PRIMARY_GOLD,
      600: '#E5A910',
      700: '#C9910B',
      800: '#A87708',
      900: '#7A5706',
    },
    bc: {
      primaryBlue: BC_PRIMARY_BLUE,
      primaryGold: BC_PRIMARY_GOLD,
      linkBlue: BC_LINK_BLUE,
      textPrimary: BC_TEXT_PRIMARY,
      lightGrayBg: '#FAF9F8',
    },
  },
  styles: {
    global: (props: { colorMode?: string }) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'bc.lightGrayBg',
        color: props.colorMode === 'dark' ? 'gray.100' : 'bc.textPrimary',
      },
    }),
  },
  components: {
    Link: {
      baseStyle: {
        color: 'bc.linkBlue',
      },
    },
  },
})
