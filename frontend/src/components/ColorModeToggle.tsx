import { IconButton, useColorMode } from '@chakra-ui/react'
import { MdDarkMode, MdLightMode } from 'react-icons/md'

export type ColorModeToggleVariant = 'default' | 'onDark'

type Props = {
  /** Use onDark when the control sits on a dark background (e.g. sidebar, landing header). */
  variant?: ColorModeToggleVariant
}

export function ColorModeToggle({ variant = 'default' }: Props) {
  const { colorMode, toggleColorMode } = useColorMode()
  const isDark = colorMode === 'dark'

  return (
    <IconButton
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      icon={isDark ? <MdLightMode size={22} /> : <MdDarkMode size={22} />}
      onClick={toggleColorMode}
      variant="ghost"
      size="md"
      color={variant === 'onDark' ? 'whiteAlpha.900' : 'gray.700'}
      _hover={variant === 'onDark' ? { bg: 'whiteAlpha.200' } : { bg: 'blackAlpha.50' }}
    />
  )
}
