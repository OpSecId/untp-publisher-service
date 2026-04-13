import { extendTheme, type ThemeConfig } from '@chakra-ui/react'
import { BC_THEME_CONFIG } from './config/bcThemeColors'

const { foundation, palettes, surfaces } = BC_THEME_CONFIG

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
    /** Chakra `brand` scale — values from B.C. Design System (see `config/bcThemeColors.ts`) */
    brand: { ...palettes.brand },
    bcGold: { ...palettes.bcGold },
    bc: {
      primaryBlue: foundation.primaryBlue,
      primaryGold: foundation.primaryGold,
      linkBlue: foundation.linkBlue,
      textPrimary: foundation.textPrimary,
      lightGrayBg: surfaces.lightGrayBg,
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
