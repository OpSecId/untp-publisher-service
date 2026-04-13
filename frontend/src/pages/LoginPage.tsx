import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdOutlineHub, MdOutlineSecurity, MdOutlineSpeed } from 'react-icons/md'
import { apiBaseUrl } from '../api/baseUrl'
import { getAccessToken, setAccessToken } from '../auth/storage'

type Phase = 'landing' | 'token' | 'error'

/** RFC 2324–adjacent whimsy; shown only on failed login (no server details). */
const TEAPOT_ASCII = `
       ;,
       )(
      ;)(;
     :----:
   C|=======|
    |       |
    \\       /
     \\_____/`

async function validateSessionJwt(token: string): Promise<boolean> {
  const base = apiBaseUrl().replace(/\/$/, '')
  const url = `${base}/publisher/session`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token.trim()}` },
  })
  return res.ok
}

const features = [
  {
    icon: MdOutlineHub,
    title: 'Issuance pipeline',
    body: 'Wire credential types, templates, and Traction so your line of business can publish with confidence.',
  },
  {
    icon: MdOutlineSpeed,
    title: 'Operational clarity',
    body: 'Session-aware overview of tenant wiring, registry endpoints, and deployment context in one place.',
  },
  {
    icon: MdOutlineSecurity,
    title: 'Token-only access',
    body: 'Bring your access token; the console validates it with the API before anything is stored locally.',
  },
] as const

export function LoginPage() {
  const navigate = useNavigate()
  const featuresRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('landing')
  const [jwt, setJwt] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getAccessToken()) navigate('/', { replace: true })
  }, [navigate])

  const submitToken = async () => {
    const raw = jwt.trim()
    if (!raw) return
    setLoading(true)
    try {
      const ok = await validateSessionJwt(raw)
      if (ok) {
        setAccessToken(raw)
        navigate('/', { replace: true })
        return
      }
      setPhase('error')
    } catch {
      setPhase('error')
    } finally {
      setLoading(false)
    }
  }

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setJwt(text.trim())
    } catch {
      /* clipboard unavailable — no error page */
    }
  }

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (phase === 'error') {
    return (
      <Box minH="100vh" bg="gray.900" color="gray.100" px={4} py={16}>
        <Box maxW="lg" mx="auto" textAlign="center">
          <Heading size="lg" fontFamily="heading" mb={10}>
            Something went wrong
          </Heading>
          <Text
            as="pre"
            fontFamily="mono"
            fontSize="xs"
            color="gray.600"
            whiteSpace="pre"
            mb={10}
            userSelect="none"
          >
            {TEAPOT_ASCII}
          </Text>
          <Text fontSize="sm" color="gray.500" mb={10} fontStyle="italic">
            418 — short and stout
          </Text>
          <Button
            colorScheme="blue"
            onClick={() => {
              setPhase('token')
            }}
          >
            Try again
          </Button>
        </Box>
      </Box>
    )
  }

  if (phase === 'token') {
    return (
      <Box minH="100vh" position="relative" overflow="hidden" bg="#0a0e27">
        <Box
          position="absolute"
          top="-25%"
          right="-15%"
          w={{ base: '280px', md: '480px' }}
          h={{ base: '280px', md: '480px' }}
          borderRadius="full"
          bg="purple.500"
          opacity={0.22}
          filter="blur(100px)"
          pointerEvents="none"
        />
        <Box
          position="absolute"
          bottom="-20%"
          left="-10%"
          w={{ base: '260px', md: '420px' }}
          h={{ base: '260px', md: '420px' }}
          borderRadius="full"
          bg="blue.500"
          opacity={0.2}
          filter="blur(90px)"
          pointerEvents="none"
        />
        <Box position="relative" zIndex={1} py={{ base: 10, md: 16 }} px={4}>
          <Box maxW="md" mx="auto">
            <Button variant="link" color="whiteAlpha.700" mb={8} onClick={() => setPhase('landing')}>
              Back
            </Button>
            <Box
              bg="whiteAlpha.90"
              backdropFilter="blur(16px)"
              color="gray.800"
              rounded="2xl"
              shadow="2xl"
              borderWidth="1px"
              borderColor="whiteAlpha.300"
              p={{ base: 6, md: 8 }}
            >
              <Heading size="md" mb={6} fontFamily="heading">
                Sign in
              </Heading>
              <Stack spacing={4}>
                <Textarea
                  value={jwt}
                  onChange={(e) => setJwt(e.target.value)}
                  placeholder="Paste your access token"
                  rows={6}
                  fontFamily="mono"
                  fontSize="sm"
                  autoComplete="off"
                />
                <Stack direction={{ base: 'column', sm: 'row' }} spacing={3}>
                  <Button variant="outline" onClick={() => void pasteFromClipboard()}>
                    Paste from clipboard
                  </Button>
                  <Button
                    colorScheme="blue"
                    flex={1}
                    onClick={() => void submitToken()}
                    isLoading={loading}
                  >
                    Sign in
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </Box>
        </Box>
      </Box>
    )
  }

  return (
    <Box minH="100vh" position="relative" overflow="hidden" bg="#070b1a" color="white">
      {/* Mesh + grid (Horizon-style depth) */}
      <Box
        position="absolute"
        inset={0}
        bgGradient="linear(to-br, #070b1a 0%, #121a3d 45%, #1a0f2e 100%)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        top="-18%"
        left="5%"
        w={{ base: 'min(90vw, 420px)', md: '560px' }}
        h={{ base: 'min(90vw, 420px)', md: '560px' }}
        borderRadius="full"
        bg="purple.500"
        opacity={0.28}
        filter="blur(110px)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom="-12%"
        right="-8%"
        w={{ base: 'min(85vw, 380px)', md: '520px' }}
        h={{ base: 'min(85vw, 380px)', md: '520px' }}
        borderRadius="full"
        bg="cyan.400"
        opacity={0.18}
        filter="blur(100px)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        top="40%"
        left="50%"
        transform="translate(-50%, -50%)"
        w="min(120vw, 900px)"
        h="min(120vw, 900px)"
        borderRadius="full"
        bg="blue.600"
        opacity={0.12}
        filter="blur(130px)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        inset={0}
        opacity={0.35}
        bgImage="radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)"
        bgSize="32px 32px"
        pointerEvents="none"
      />

      <Box position="relative" zIndex={1}>
        <Flex
          as="header"
          maxW="7xl"
          mx="auto"
          px={{ base: 5, md: 10 }}
          py={6}
          align="center"
          justify="space-between"
        >
          <Text fontWeight="800" fontSize="lg" letterSpacing="-0.04em" fontFamily="heading">
            UNTP Publisher
          </Text>
          <Badge
            px={3}
            py={1}
            borderRadius="full"
            bg="whiteAlpha.100"
            color="whiteAlpha.900"
            fontWeight="600"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
          >
            Console
          </Badge>
        </Flex>

        <Container maxW="7xl" px={{ base: 5, md: 10 }} pt={{ base: 6, md: 10 }} pb={{ base: 20, md: 28 }}>
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={{ base: 14, lg: 16 }} alignItems="center">
            <Stack spacing={{ base: 6, md: 8 }} textAlign={{ base: 'center', lg: 'left' }}>
              <Badge
                alignSelf={{ base: 'center', lg: 'flex-start' }}
                w="fit-content"
                px={3}
                py={1}
                borderRadius="md"
                colorScheme="purple"
                variant="subtle"
                textTransform="none"
                fontWeight="600"
                fontSize="sm"
              >
                Built for UNTP issuance
              </Badge>
              <Heading
                as="h1"
                fontFamily="heading"
                fontWeight="800"
                letterSpacing="-0.04em"
                lineHeight="1.05"
                fontSize={{ base: '2.75rem', sm: '3.5rem', md: '4rem', lg: '4.5rem' }}
                bgGradient="linear(to-r, white, white, cyan.200)"
                bgClip="text"
              >
                Publish credentials with clarity.
              </Heading>
              <Text
                color="whiteAlpha.800"
                fontSize={{ base: 'lg', md: 'xl' }}
                lineHeight="tall"
                maxW={{ base: '100%', lg: '95%' }}
              >
                A focused workspace for credential templates, tenant wiring, and session health—so
                your team can move from registration to issuance without digging through raw API
                responses.
              </Text>
              <Stack
                direction={{ base: 'column', sm: 'row' }}
                spacing={4}
                pt={2}
                justify={{ base: 'center', lg: 'flex-start' }}
              >
                <Button
                  size="lg"
                  h="14"
                  px={10}
                  fontSize="md"
                  fontWeight="700"
                  rounded="xl"
                  bgGradient="linear(to-r, blue.400, purple.500)"
                  color="white"
                  _hover={{
                    opacity: 0.95,
                    transform: 'translateY(-1px)',
                    boxShadow: '0 12px 40px rgba(99, 102, 241, 0.45)',
                  }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s ease"
                  onClick={() => setPhase('token')}
                >
                  Get started
                </Button>
                <Button
                  size="lg"
                  h="14"
                  px={8}
                  fontSize="md"
                  variant="outline"
                  borderColor="whiteAlpha.400"
                  color="white"
                  rounded="xl"
                  _hover={{ bg: 'whiteAlpha.100', borderColor: 'whiteAlpha.600' }}
                  onClick={scrollToFeatures}
                >
                  Explore features
                </Button>
              </Stack>
            </Stack>

            {/* Glass preview card */}
            <Box
              position="relative"
              mx={{ base: 'auto', lg: 0 }}
              maxW={{ base: '100%', lg: 'none' }}
              w="full"
            >
              <Box
                position="absolute"
                inset="-2px"
                borderRadius="3xl"
                bgGradient="linear(to-br, whiteAlpha.400, transparent, purple.400)"
                opacity={0.35}
                filter="blur(1px)"
              />
              <Box
                position="relative"
                rounded="3xl"
                borderWidth="1px"
                borderColor="whiteAlpha.200"
                bg="whiteAlpha.80"
                backdropFilter="blur(24px)"
                boxShadow="0 25px 80px rgba(0,0,0,0.35)"
                p={{ base: 6, md: 8 }}
                color="gray.800"
              >
                <Text fontSize="xs" fontWeight="700" color="gray.500" letterSpacing="0.08em" mb={6}>
                  SESSION PREVIEW
                </Text>
                <Stack spacing={5}>
                  {[
                    { label: 'Overview', sub: 'Health, claims, deployment summary' },
                    { label: 'Settings', sub: 'Registry URL, Traction context, admin tools' },
                    { label: 'Secure entry', sub: 'Token validated before dashboard load' },
                  ].map((row) => (
                    <Flex
                      key={row.label}
                      align="flex-start"
                      gap={4}
                      p={4}
                      rounded="xl"
                      bg="gray.50"
                      borderWidth="1px"
                      borderColor="gray.100"
                    >
                      <Box
                        mt={1}
                        w={2}
                        h={2}
                        borderRadius="full"
                        bgGradient="linear(to-br, blue.400, purple.500)"
                        flexShrink={0}
                      />
                      <Box>
                        <Text fontWeight="700" fontSize="sm">
                          {row.label}
                        </Text>
                        <Text fontSize="xs" color="gray.600" mt={1}>
                          {row.sub}
                        </Text>
                      </Box>
                    </Flex>
                  ))}
                </Stack>
              </Box>
            </Box>
          </SimpleGrid>

          <Box ref={featuresRef} pt={{ base: 20, md: 28 }} id="features">
            <Text
              textAlign="center"
              fontSize="sm"
              fontWeight="700"
              color="whiteAlpha.500"
              letterSpacing="0.2em"
              textTransform="uppercase"
              mb={4}
            >
              Why teams use it
            </Text>
            <Heading
              textAlign="center"
              fontFamily="heading"
              fontSize={{ base: '2xl', md: '3xl' }}
              fontWeight="800"
              letterSpacing="-0.03em"
              mb={12}
              maxW="2xl"
              mx="auto"
            >
              Everything you need before you hit publish
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
              {features.map(({ icon, title, body }) => (
                <Box
                  key={title}
                  p={8}
                  rounded="2xl"
                  bg="whiteAlpha.60"
                  backdropFilter="blur(16px)"
                  borderWidth="1px"
                  borderColor="whiteAlpha.200"
                  transition="transform 0.2s ease, box-shadow 0.2s ease"
                  _hover={{
                    transform: 'translateY(-4px)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                  }}
                >
                  <Flex
                    w={12}
                    h={12}
                    align="center"
                    justify="center"
                    rounded="xl"
                    bgGradient="linear(to-br, blue.500, purple.600)"
                    color="white"
                    mb={5}
                  >
                    <Icon as={icon} boxSize={6} />
                  </Flex>
                  <Text fontWeight="800" fontSize="lg" mb={2} fontFamily="heading">
                    {title}
                  </Text>
                  <Text color="gray.700" fontSize="sm" lineHeight="tall">
                    {body}
                  </Text>
                </Box>
              ))}
            </SimpleGrid>
          </Box>

        </Container>
      </Box>
    </Box>
  )
}
