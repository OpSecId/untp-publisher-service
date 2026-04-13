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
import { MdBusiness, MdDashboard, MdScience, MdSettings } from 'react-icons/md'
import { setAccessToken } from '../auth/storage'
import { ColorModeToggle, type ColorModeToggleVariant } from '../components/ColorModeToggle'
import { PoweredByTraction } from '../components/PoweredByTraction'
import { ProfileMenu } from '../components/ProfileMenu'
import { usePublisherSession } from '../hooks/usePublisherSession'

const navItems = [
  { to: '/', label: 'Overview', icon: MdDashboard },
  { to: '/issuers', label: 'Issuers', icon: MdBusiness },
  { to: '/test-suite', label: 'Test suite', icon: MdScience },
  { to: '/settings', label: 'Settings', icon: MdSettings },
]

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const { session, loading: sessionLoading } = usePublisherSession()

  const sidebarBg = useColorModeValue('brand.50', 'gray.900')
  const sidebarColor = useColorModeValue('gray.800', 'gray.100')
  const brandColor = useColorModeValue('gray.900', 'white')
  const navActiveBg = useColorModeValue('brand.50', 'whiteAlpha.200')
  const navActiveColor = useColorModeValue('brand.500', 'white')
  const navIdleColor = useColorModeValue('gray.600', 'gray.300')
  const sidebarBorder = useColorModeValue('gray.200', 'whiteAlpha.200')
  const mainBg = useColorModeValue('bc.lightGrayBg', 'gray.800')
  const mobileBarColor = useColorModeValue('gray.900', 'white')
  const toggleVariant = useColorModeValue('default', 'onDark') as ColorModeToggleVariant
  const navHoverInactiveBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.150')
  const mobileFooterBorder = useColorModeValue('gray.200', 'gray.700')
  const topBarBg = useColorModeValue('rgba(255,255,255,0.92)', 'rgba(23,25,35,0.92)')
  const topBarBorder = useColorModeValue('gray.200', 'whiteAlpha.200')
  const backdropBlur = 'saturate(180%) blur(8px)'

  const logout = () => {
    setAccessToken(null)
    navigate('/login', { replace: true })
  }

  const clientId = session?.claims?.client_id

  const accountControls = (
    <HStack spacing={2}>
      <ColorModeToggle variant={toggleVariant} />
      <ProfileMenu clientId={clientId} loading={sessionLoading} onSignOut={logout} />
    </HStack>
  )

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
        display={{ base: 'none', md: 'flex' }}
        flexDirection="column"
        minH="100vh"
      >
        <Heading size="md" fontWeight="700" letterSpacing="-0.02em" color={brandColor} mb={10}>
          UNTP Publisher
        </Heading>
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
        <Box flex="1" minH={4} aria-hidden />
        <Box pt={8} mt={12} borderTopWidth="1px" borderColor={sidebarBorder}>
          <PoweredByTraction justify="flex-start" />
        </Box>
      </Box>

      <Flex direction="column" flex="1" minW={0}>
        <Box
          as="header"
          position="sticky"
          top={0}
          zIndex={10}
          display={{ base: 'none', md: 'block' }}
          bg={topBarBg}
          borderBottomWidth="1px"
          borderColor={topBarBorder}
          backdropFilter={backdropBlur}
          sx={{ WebkitBackdropFilter: backdropBlur }}
        >
          <Flex align="center" justify="flex-end" px={{ base: 4, md: 8 }} py={3}>
            {accountControls}
          </Flex>
        </Box>

        <Box
          display={{ base: 'block', md: 'none' }}
          position="sticky"
          top={0}
          zIndex={10}
          bg={topBarBg}
          borderBottomWidth="1px"
          borderColor={topBarBorder}
          backdropFilter={backdropBlur}
          sx={{ WebkitBackdropFilter: backdropBlur }}
          color={mobileBarColor}
        >
          <Flex align="center" justify="space-between" px={4} py={3} gap={2}>
            <Text fontWeight="700">UNTP Publisher</Text>
            {accountControls}
          </Flex>
          <HStack
            spacing={2}
            flexWrap="wrap"
            px={4}
            pb={3}
            borderTopWidth="1px"
            borderColor={topBarBorder}
            pt={2}
          >
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
        <Box
          as="footer"
          display={{ base: 'block', md: 'none' }}
          borderTopWidth="1px"
          borderColor={mobileFooterBorder}
          bg={mainBg}
          py={4}
          px={4}
        >
          <PoweredByTraction />
        </Box>
      </Flex>
    </Flex>
  )
}
