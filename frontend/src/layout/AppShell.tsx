import { Box, Button, Flex, Heading, HStack, Icon, Link, Text, VStack } from '@chakra-ui/react'
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { MdDashboard, MdLogout, MdSettings } from 'react-icons/md'
import { setAccessToken } from '../auth/storage'

const navItems = [
  { to: '/', label: 'Overview', icon: MdDashboard },
  { to: '/settings', label: 'Settings', icon: MdSettings },
]

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()

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
        bg="gray.900"
        color="gray.100"
        px={6}
        py={8}
        display={{ base: 'none', md: 'block' }}
      >
        <Heading size="md" fontWeight="700" letterSpacing="-0.02em" mb={10} color="white">
          Publisher
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
                bg={active ? 'whiteAlpha.200' : 'transparent'}
                color={active ? 'white' : 'gray.300'}
                _hover={{ bg: 'whiteAlpha.150', textDecoration: 'none', color: 'white' }}
              >
                <Icon as={icon} boxSize={5} />
                {label}
              </Link>
            )
          })}
        </VStack>
        <Box mt={12} pt={8} borderTopWidth="1px" borderColor="whiteAlpha.200">
          <Button
            variant="ghost"
            colorScheme="whiteAlpha"
            justifyContent="flex-start"
            w="full"
            leftIcon={<Icon as={MdLogout} boxSize={5} />}
            onClick={logout}
            color="gray.400"
            _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
          >
            Sign out
          </Button>
        </Box>
      </Box>

      <Flex direction="column" flex="1" minW={0}>
        <Box
          display={{ base: 'block', md: 'none' }}
          bg="gray.900"
          color="white"
          px={4}
          py={3}
        >
          <Flex align="center" justify="space-between" mb={3}>
            <Text fontWeight="700">Publisher</Text>
            <Button size="sm" variant="ghost" colorScheme="whiteAlpha" onClick={logout}>
              Sign out
            </Button>
          </Flex>
          <HStack spacing={2} flexWrap="wrap">
            {navItems.map(({ to, label }) => (
              <Button
                key={to}
                as={RouterLink}
                to={to}
                size="sm"
                variant={location.pathname === to ? 'solid' : 'outline'}
                colorScheme="blue"
              >
                {label}
              </Button>
            ))}
          </HStack>
        </Box>
        <Box as="main" flex="1" p={{ base: 4, md: 10 }} maxW="1200px" w="full" mx="auto">
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  )
}
