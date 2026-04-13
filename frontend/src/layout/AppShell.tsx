import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Link,
  Text,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { MdDashboard, MdLogout, MdSettings } from 'react-icons/md'
import { setAccessToken } from '../auth/storage'
import { ColorModeToggle, type ColorModeToggleVariant } from '../components/ColorModeToggle'

const navItems = [
  { to: '/', label: 'Overview', icon: MdDashboard },
  { to: '/settings', label: 'Settings', icon: MdSettings },
]

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const sidebarBg = useColorModeValue('brand.50', 'gray.900')
  const sidebarColor = useColorModeValue('gray.800', 'gray.100')
  const brandColor = useColorModeValue('gray.900', 'white')
  const navActiveBg = useColorModeValue('brand.50', 'whiteAlpha.200')
  const navActiveColor = useColorModeValue('brand.500', 'white')
  const navIdleColor = useColorModeValue('gray.600', 'gray.300')
  const sidebarBorder = useColorModeValue('gray.200', 'whiteAlpha.200')
  const mainBg = useColorModeValue('bc.lightGrayBg', 'gray.800')
  const mobileBarBg = useColorModeValue('brand.50', 'gray.900')
  const mobileBarColor = useColorModeValue('gray.900', 'white')
  const toggleVariant = useColorModeValue('default', 'onDark') as ColorModeToggleVariant
  const navHoverInactiveBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.150')
  const signOutScheme = useColorModeValue('gray', 'whiteAlpha')
  const signOutMuted = useColorModeValue('gray.600', 'gray.400')
  const signOutHoverFg = useColorModeValue('gray.900', 'white')
  const signOutHoverBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.100')
  const mobileSignOutScheme = useColorModeValue('gray', 'whiteAlpha')

  const logout = () => {
    setAccessToken(null)
    navigate('/login', { replace: true })
  }

  return (
    <Flex minH="100vh">
      <Box
        as="aside"
        w="260px"
        flexShrink={0}
        bg={sidebarBg}
        color={sidebarColor}
        px={6}
        py={8}
        display={{ base: 'none', md: 'block' }}
      >
        <Flex align="center" justify="space-between" gap={3} mb={10}>
          <Heading size="md" fontWeight="700" letterSpacing="-0.02em" color={brandColor}>
            UNTP Publisher
          </Heading>
          <ColorModeToggle variant={toggleVariant} />
        </Flex>
        <VStack align="stretch" spacing={1}>
          {navItems.map(({ to, label, icon }) => {
            const active = location.pathname === to
            return (
              <Link
                key={to}
                as={RouterLink}
                to={to}
                display="flex"
                alignItems="center"
                gap={3}
                px={3}
                py={2.5}
                rounded="lg"
                fontWeight="500"
                bg={active ? navActiveBg : 'transparent'}
                color={active ? navActiveColor : navIdleColor}
                _hover={{
                  bg: active ? navActiveBg : navHoverInactiveBg,
                  textDecoration: 'none',
                  color: navActiveColor,
                }}
              >
                <Icon as={icon} boxSize={5} />
                {label}
              </Link>
            )
          })}
        </VStack>
        <Box mt={12} pt={8} borderTopWidth="1px" borderColor={sidebarBorder}>
          <Button
            variant="ghost"
            colorScheme={signOutScheme}
            justifyContent="flex-start"
            w="full"
            leftIcon={<Icon as={MdLogout} boxSize={5} />}
            onClick={logout}
            color={signOutMuted}
            _hover={{
              color: signOutHoverFg,
              bg: signOutHoverBg,
            }}
          >
            Sign out
          </Button>
        </Box>
      </Box>

      <Flex direction="column" flex="1" minW={0}>
        <Box display={{ base: 'block', md: 'none' }} bg={mobileBarBg} color={mobileBarColor} px={4} py={3}>
          <Flex align="center" justify="space-between" mb={3} gap={2}>
            <Text fontWeight="700">UNTP Publisher</Text>
            <HStack spacing={1}>
              <ColorModeToggle variant={toggleVariant} />
              <Button size="sm" variant="ghost" colorScheme={mobileSignOutScheme} onClick={logout}>
                Sign out
              </Button>
            </HStack>
          </Flex>
          <HStack spacing={2} flexWrap="wrap">
            {navItems.map(({ to, label }) => (
              <Button
                key={to}
                as={RouterLink}
                to={to}
                size="sm"
                variant={location.pathname === to ? 'solid' : 'outline'}
                colorScheme="brand"
              >
                {label}
              </Button>
            ))}
          </HStack>
        </Box>
        <Box as="main" flex="1" bg={mainBg} p={{ base: 4, md: 10 }} maxW="1200px" w="full" mx="auto">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  )
}
