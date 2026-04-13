import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Icon,
  SimpleGrid,
  HStack,
  Stack,
  Text,
  Textarea,
  useColorModeValue,
} from '@chakra-ui/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MdOutlineAccountTree,
  MdOutlineFactCheck,
  MdOutlineVisibility,
} from 'react-icons/md'
import { apiBaseUrl } from '../api/baseUrl'
import { getAccessToken, setAccessToken } from '../auth/storage'
import { ColorModeToggle, type ColorModeToggleVariant } from '../components/ColorModeToggle'
import { PoweredByTraction } from '../components/PoweredByTraction'

type Phase = 'landing' | 'error' | 'manual'

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
    icon: MdOutlineAccountTree,
    title: 'Supply-chain attestations',
    body: 'Register Digital Conformity Credential (DCC) templates and publish structured, machine-readable claims that move with products, facilities, and parties—not ad-hoc PDFs.',
  },
  {
    icon: MdOutlineFactCheck,
    title: 'Governance & compliance posture',
    body: 'Separate admin and client surfaces: issuer onboarding, secret rotation, and tenant-scoped issuance controls aligned with how regulated programs expect separation of duties.',
  },
  {
    icon: MdOutlineVisibility,
    title: 'Transparency by design',
    body: 'Session and environment disclosure (registry, traction, DID web(vh)) so operators and auditors can trace which endpoints and identities back a published credential.',
  },
] as const

export function LoginPage() {
  const navigate = useNavigate()
  const featuresRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<Phase>('landing')
  const [jwt, setJwt] = useState('')
  const [loading, setLoading] = useState(false)

  const toggleVariant = useColorModeValue('default', 'onDark') as ColorModeToggleVariant
  const errorBg = useColorModeValue('gray.50', 'gray.900')
  const errorFg = useColorModeValue('gray.900', 'gray.100')
  const errorPreColor = useColorModeValue('gray.500', 'gray.600')
  const errorItalicColor = useColorModeValue('gray.500', 'gray.500')
  const errorOutlineScheme = useColorModeValue('gray', 'whiteAlpha')
  const manualPageBg = useColorModeValue('bc.lightGrayBg', 'brand.900')
  const manualBlobBlueOpacity = useColorModeValue(0.08, 0.22)
  const manualBlobGoldOpacity = useColorModeValue(0.07, 0.2)
  const manualBackColor = useColorModeValue('gray.600', 'whiteAlpha.700')
  const manualPanelBorder = useColorModeValue('gray.200', 'whiteAlpha.300')

  const landingBg = useColorModeValue('bc.lightGrayBg', 'brand.900')
  const landingColor = useColorModeValue('bc.textPrimary', 'white')
  const landingMesh = useColorModeValue(
    'linear(to-br, #F1F8FE 0%, #FAF9F8 35%, #FEF8E8 70%, #F3F2F1 100%)',
    'linear(to-br, #011829 0%, #01264C 38%, #013366 72%, #1a1008 100%)',
  )
  const blobBlue = useColorModeValue(0.1, 0.28)
  const blobGold = useColorModeValue(0.08, 0.2)
  const blobBlueMid = useColorModeValue(0.06, 0.12)
  const blobBlueWide = useColorModeValue(0.06, 0.12)
  const gridBgImage = useColorModeValue(
    'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)',
    'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)',
  )
  const gridOpacity = useColorModeValue(0.5, 0.35)
  const headerBadgeBg = useColorModeValue('white', 'whiteAlpha.100')
  const headerBadgeColor = useColorModeValue('gray.700', 'whiteAlpha.900')
  const headerBadgeBorder = useColorModeValue('gray.200', 'whiteAlpha.200')
  const heroGradient = useColorModeValue(
    'linear(to-r, #2D2D2D, #013366, #FCBA19)',
    'linear(to-r, white, #A8D0FB, #FCBA19)',
  )
  const heroBodyMuted = useColorModeValue('gray.600', 'whiteAlpha.800')
  const heroEmphasis = useColorModeValue('brand.600', 'bcGold.300')
  const outlineBtnBorder = useColorModeValue('gray.300', 'whiteAlpha.400')
  const outlineBtnColor = useColorModeValue('gray.800', 'white')
  const outlineBtnHoverBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.100')
  const outlineBtnHoverBorder = useColorModeValue('gray.400', 'whiteAlpha.600')
  const glassBorder = useColorModeValue('gray.200', 'whiteAlpha.200')
  const glassBg = useColorModeValue('rgba(255,255,255,0.94)', 'rgba(255,255,255,0.80)')
  const glassGlowOpacity = useColorModeValue(0.22, 0.35)
  const glassCardShadow = useColorModeValue(
    '0 25px 80px rgba(1, 51, 102, 0.14)',
    '0 25px 80px rgba(0,0,0,0.35)',
  )
  const featuresKicker = useColorModeValue('brand.600', 'whiteAlpha.500')
  const featuresLead = useColorModeValue('gray.600', 'whiteAlpha.600')
  const featuresLeadStrong = useColorModeValue('gray.800', 'whiteAlpha.800')
  const featureCardBg = useColorModeValue('rgba(255,255,255,0.92)', 'rgba(255,255,255,0.60)')
  const featureCardBorder = useColorModeValue('gray.200', 'whiteAlpha.200')
  const featureHoverShadow = useColorModeValue(
    '0 20px 50px rgba(1, 51, 102, 0.12)',
    '0 20px 50px rgba(0,0,0,0.25)',
  )
  const loginFooterBorder = useColorModeValue('blackAlpha.200', 'whiteAlpha.150')

  useEffect(() => {
    if (getAccessToken()) navigate('/', { replace: true })
  }, [navigate])

  const signInWithToken = async (raw: string) => {
    const token = raw.trim()
    if (!token) {
      setPhase('error')
      return
    }
    setLoading(true)
    try {
      const ok = await validateSessionJwt(token)
      if (ok) {
        setAccessToken(token)
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

  const signInFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      await signInWithToken(text)
    } catch {
      setPhase('error')
    }
  }

  const submitManualToken = async () => {
    await signInWithToken(jwt)
  }

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (phase === 'error') {
    return (
      <Flex minH="100vh" direction="column" bg={errorBg} color={errorFg} position="relative">
        <Flex position="absolute" top={4} right={4} justify="flex-end" px={4} w="full">
          <ColorModeToggle variant={toggleVariant} />
        </Flex>
        <Flex flex="1" align="center" justify="center" px={4} py={20}>
          <Box maxW="lg" mx="auto" textAlign="center">
            <Heading size="lg" fontFamily="heading" mb={10}>
              Something went wrong
            </Heading>
            <Text
              as="pre"
              fontFamily="mono"
              fontSize="xs"
              color={errorPreColor}
              whiteSpace="pre"
              mb={10}
              userSelect="none"
            >
              {TEAPOT_ASCII}
            </Text>
            <Text fontSize="sm" color={errorItalicColor} mb={10} fontStyle="italic">
              418 — short and stout
            </Text>
            <Stack direction={{ base: 'column', sm: 'row' }} spacing={4} justify="center">
              <Button colorScheme="brand" isLoading={loading} onClick={() => void signInFromClipboard()}>
                Try again
              </Button>
              <Button variant="outline" colorScheme={errorOutlineScheme} onClick={() => setPhase('manual')}>
                Enter token manually
              </Button>
            </Stack>
          </Box>
        </Flex>
        <Box borderTopWidth="1px" borderColor={loginFooterBorder} py={5} px={4}>
          <PoweredByTraction />
        </Box>
      </Flex>
    )
  }

  if (phase === 'manual') {
    return (
      <Flex minH="100vh" direction="column" position="relative" overflow="hidden" bg={manualPageBg}>
        <Flex position="absolute" top={4} right={4} zIndex={2} justify="flex-end" px={4} w="full">
          <ColorModeToggle variant={toggleVariant} />
        </Flex>
        <Box
          position="absolute"
          top="-25%"
          right="-15%"
          w={{ base: '280px', md: '480px' }}
          h={{ base: '280px', md: '480px' }}
          borderRadius="full"
          bg="brand.500"
          opacity={manualBlobBlueOpacity}
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
          bg="bcGold.500"
          opacity={manualBlobGoldOpacity}
          filter="blur(90px)"
          pointerEvents="none"
        />
        <Flex flex="1" direction="column" position="relative" zIndex={1} py={{ base: 10, md: 16 }} px={4}>
          <Box flex="1" maxW="md" mx="auto" w="full">
            <Button variant="link" color={manualBackColor} mb={8} onClick={() => setPhase('landing')}>
              Back
            </Button>
            <Box
              bg="whiteAlpha.90"
              backdropFilter="blur(16px)"
              color="gray.800"
              rounded="2xl"
              shadow="2xl"
              borderWidth="1px"
              borderColor={manualPanelBorder}
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
                <Button
                  colorScheme="brand"
                  w="full"
                  onClick={() => void submitManualToken()}
                  isLoading={loading}
                >
                  Sign in
                </Button>
              </Stack>
            </Box>
          </Box>
          <Box borderTopWidth="1px" borderColor={loginFooterBorder} mt="auto" py={5}>
            <PoweredByTraction />
          </Box>
        </Flex>
      </Flex>
    )
  }

  return (
    <Box minH="100vh" position="relative" overflow="hidden" bg={landingBg} color={landingColor}>
      {/* Mesh + grid (Horizon-style depth) */}
      <Box position="absolute" inset={0} bgGradient={landingMesh} pointerEvents="none" />
      <Box
        position="absolute"
        top="-18%"
        left="5%"
        w={{ base: 'min(90vw, 420px)', md: '560px' }}
        h={{ base: 'min(90vw, 420px)', md: '560px' }}
        borderRadius="full"
        bg="brand.500"
        opacity={blobBlue}
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
        bg="bcGold.500"
        opacity={blobGold}
        filter="blur(100px)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        top="55%"
        right="12%"
        w={{ base: '200px', md: '320px' }}
        h={{ base: '200px', md: '320px' }}
        borderRadius="full"
        bg="brand.400"
        opacity={blobBlueMid}
        filter="blur(80px)"
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
        bg="brand.700"
        opacity={blobBlueWide}
        filter="blur(130px)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        inset={0}
        opacity={gridOpacity}
        bgImage={gridBgImage}
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
          gap={4}
        >
          <Text fontWeight="800" fontSize="lg" letterSpacing="-0.04em" fontFamily="heading">
            UNTP Publisher
          </Text>
          <HStack spacing={3}>
            <ColorModeToggle variant={toggleVariant} />
            <Badge
              px={3}
              py={1}
              borderRadius="full"
              bg={headerBadgeBg}
              color={headerBadgeColor}
              fontWeight="600"
              borderWidth="1px"
              borderColor={headerBadgeBorder}
            >
              Governance console
            </Badge>
          </HStack>
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
                colorScheme="brand"
                variant="subtle"
                textTransform="none"
                fontWeight="600"
                fontSize="sm"
              >
                Conformity Credentials
              </Badge>
              <Heading
                as="h1"
                fontFamily="heading"
                fontWeight="800"
                letterSpacing="-0.04em"
                lineHeight="1.05"
                fontSize={{ base: '2.75rem', sm: '3.5rem', md: '4rem', lg: '4.5rem' }}
                bgGradient={heroGradient}
                bgClip="text"
              >
                Verifiable credentials for your supply chain.
              </Heading>
              <Text
                color={heroBodyMuted}
                fontSize={{ base: 'lg', md: 'xl' }}
                lineHeight="tall"
                maxW={{ base: '100%', lg: '95%' }}
              >
                Operate the publisher as a <Text as="span" fontWeight="700" color={heroEmphasis}>compliance
                control plane</Text> for UNTP credentials: register schemas and overlays, bind issuers
                to Traction and DID web(vh), and issue conformity attestations your supply-chain partners
                can verify—without losing transparency into which registries and endpoints back each
                assertion.
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
                  colorScheme="brand"
                  isLoading={loading}
                  loadingText="Authenticating"
                  _hover={{
                    opacity: 0.95,
                    transform: 'translateY(-1px)',
                    boxShadow: '0 12px 36px rgba(1, 51, 102, 0.35)',
                  }}
                  _active={{ transform: 'translateY(0)' }}
                  transition="all 0.2s ease"
                  onClick={() => void signInFromClipboard()}
                >
                  Get started
                </Button>
                <Button
                  size="lg"
                  h="14"
                  px={8}
                  fontSize="md"
                  variant="outline"
                  borderColor={outlineBtnBorder}
                  color={outlineBtnColor}
                  rounded="xl"
                  _hover={{ bg: outlineBtnHoverBg, borderColor: outlineBtnHoverBorder }}
                  onClick={scrollToFeatures}
                >
                  Capability stack
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
                bgGradient="linear(to-br, whiteAlpha.400, transparent, bcGold.500)"
                opacity={glassGlowOpacity}
                filter="blur(1px)"
              />
              <Box
                position="relative"
                rounded="3xl"
                borderWidth="1px"
                borderColor={glassBorder}
                bg={glassBg}
                backdropFilter="blur(24px)"
                boxShadow={glassCardShadow}
                p={{ base: 6, md: 8 }}
                color="gray.800"
              >
                <Text
                  fontSize="xs"
                  fontWeight="700"
                  color="gray.500"
                  letterSpacing="0.12em"
                  mb={6}
                  fontFamily="mono"
                >
                  DISCLOSURE SURFACE · READ-ONLY
                </Text>
                <Stack spacing={5}>
                  {[
                    {
                      label: 'Lineage & topology',
                      sub: 'JWT claims, tenant id, traction base URL — inputs auditors expect for traceability.',
                    },
                    {
                      label: 'Policy bindings',
                      sub: 'Registry and DID web(vh) endpoints surfaced for governance reviews and cross-system alignment.',
                    },
                    {
                      label: 'Non-repudiation entry',
                      sub: 'Clipboard-bound credential; validated server-side before any client-side persistence.',
                    },
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
                        bgGradient="linear(to-br, brand.500, bcGold.500)"
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
              color={featuresKicker}
              letterSpacing="0.2em"
              textTransform="uppercase"
              mb={4}
            >
              Disclosure · governance · issuance
            </Text>
            <Heading
              textAlign="center"
              fontFamily="heading"
              fontSize={{ base: '2xl', md: '3xl' }}
              fontWeight="800"
              letterSpacing="-0.03em"
              mb={4}
              maxW="3xl"
              mx="auto"
            >
              From controlled registration to attestable digital product data
            </Heading>
            <Text
              textAlign="center"
              color={featuresLead}
              fontSize="md"
              maxW="2xl"
              mx="auto"
              mb={12}
              lineHeight="tall"
            >
              Align issuer programs with{' '}
              <Text as="span" fontWeight="600" color={featuresLeadStrong}>
                transparency
              </Text>{' '}
              obligations: structured credentials, explicit resolver graph, and operator-visible
              configuration—so compliance teams can reason about what ships to verifiers.
            </Text>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
              {features.map(({ icon, title, body }) => (
                <Box
                  key={title}
                  p={8}
                  rounded="2xl"
                  bg={featureCardBg}
                  backdropFilter="blur(16px)"
                  borderWidth="1px"
                  borderColor={featureCardBorder}
                  transition="transform 0.2s ease, box-shadow 0.2s ease"
                  _hover={{
                    transform: 'translateY(-4px)',
                    boxShadow: featureHoverShadow,
                  }}
                >
                  <Flex
                    w={12}
                    h={12}
                    align="center"
                    justify="center"
                    rounded="xl"
                    bgGradient="linear(to-br, brand.600, bcGold.600)"
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
        <Box
          borderTopWidth="1px"
          borderColor={loginFooterBorder}
          mt={{ base: 12, md: 16 }}
          py={8}
          px={{ base: 5, md: 10 }}
          maxW="7xl"
          mx="auto"
        >
          <PoweredByTraction />
        </Box>
      </Box>
    </Box>
  )
}
