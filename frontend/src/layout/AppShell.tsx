import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Icon,
  Image,
  Link,
  useColorModeValue,
  VStack,
} from '@chakra-ui/react'
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { MdBusiness, MdDashboard, MdFactCheck, MdLayers } from 'react-icons/md'
import { setAccessToken } from '../auth/storage'
import { AppPortalFooter, APP_PORTAL_FOOTER_RESERVED } from '../components/AppPortalFooter'
import { ColorModeToggle, type ColorModeToggleVariant } from '../components/ColorModeToggle'
import { ProfileMenu } from '../components/ProfileMenu'
import { usePublisherSession } from '../hooks/usePublisherSession'
import { BC_THEME_CONFIG } from '../config/bcThemeColors'

const navItems = [
  { to: '/', label: 'Overview', icon: MdDashboard },
  { to: '/issuers', label: 'Issuers', icon: MdBusiness },
  { to: '/credential-templates', label: 'Templates', icon: MdLayers },
  { to: '/credentials', label: 'Credentials', icon: MdFactCheck },
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
  const mainBg = useColorModeValue('bc.lightGrayBg', 'gray.800')
  const barColor = useColorModeValue('gray.900', 'white')
  const toggleVariant = useColorModeValue('default', 'onDark') as ColorModeToggleVariant
  const navHoverInactiveBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.150')
  const topBarBg = useColorModeValue(
    BC_THEME_CONFIG.appChrome.stickyBarBgLight,
    BC_THEME_CONFIG.appChrome.stickyBarBgDark,
  )
  const topBarBorder = useColorModeValue('gray.200', 'whiteAlpha.200')
  const backdropBlur = BC_THEME_CONFIG.appChrome.backdropBlur

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
    <Flex direction="column" minH="100vh">
      <Box
        as="header"
        w="100%"
        position="sticky"
        top={0}
        zIndex={20}
        bg={topBarBg}
        borderBottomWidth="1px"
        borderColor={topBarBorder}
        backdropFilter={backdropBlur}
        sx={{ WebkitBackdropFilter: backdropBlur }}
        color={barColor}
      >
        <Flex align="center" justify="space-between" px={{ base: 4, md: 8 }} py={3} gap={4}>
          <Link
            as={RouterLink}
            to="/"
            display="flex"
            alignItems="center"
            gap={3}
            minW={0}
            _hover={{ textDecoration: 'none', opacity: 0.92 }}
            aria-label="UNTP Publisher home"
          >
            <Box flexShrink={0} lineHeight={0} aria-hidden>
              <Image
                src="/favicon.svg"
                alt=""
                h={{ base: '28px', md: '32px' }}
                w={{ base: '28px', md: '32px' }}
                objectFit="contain"
                draggable={false}
              />
            </Box>
            <Heading size="md" fontWeight="700" letterSpacing="-0.02em" color={brandColor} noOfLines={1}>
              UNTP Publisher
            </Heading>
          </Link>
          {accountControls}
        </Flex>
      </Box>

      <Flex
        flex="1"
        direction={{ base: 'column', md: 'row' }}
        minH={0}
        minW={0}
        align="stretch"
        pb={APP_PORTAL_FOOTER_RESERVED}
      >
        <Box
          display={{ base: 'block', md: 'none' }}
          borderBottomWidth="1px"
          borderColor={topBarBorder}
          bg={topBarBg}
          px={4}
          py={3}
        >
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

        <Box
          as="aside"
          w={{ base: 'full', md: '260px' }}
          flexShrink={0}
          bg={sidebarBg}
          color={sidebarColor}
          px={6}
          py={8}
          display={{ base: 'none', md: 'flex' }}
          flexDirection="column"
        >
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
        </Box>

        <Flex direction="column" flex="1" minW={0}>
          <Box as="main" flex="1" bg={mainBg} p={{ base: 4, md: 10 }} maxW="1200px" w="full" mx="auto">
            <Outlet />
          </Box>
        </Flex>
      </Flex>
      <AppPortalFooter />
    </Flex>
  )
}
