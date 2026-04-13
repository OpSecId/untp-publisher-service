import { extendTheme, type ThemeConfig } from '@chakra-ui/react'

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
}

export const theme = extendTheme({
  config,
  fonts: {
    heading: `'Outfit', system-ui, sans-serif`,
    body: `'DM Sans', system-ui, sans-serif`,
  },
  colors: {
    brand: {
      50: '#e6f7ff',
      100: '#b3e5fc',
      200: '#81d4fa',
      300: '#4fc3f7',
      400: '#29b6f6',
      500: '#039be5',
      600: '#0277bd',
      700: '#01579b',
      800: '#014377',
      900: '#002a4d',
    },
  },
  styles: {
    global: (props: { colorMode?: string }) => ({
      body: {
        bg: props.colorMode === 'dark' ? 'gray.900' : 'gray.50',
        color: props.colorMode === 'dark' ? 'gray.100' : 'gray.800',
      },
    }),
  },
})
