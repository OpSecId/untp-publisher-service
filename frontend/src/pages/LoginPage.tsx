import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  ListItem,
  Stack,
  Text,
  Textarea,
  UnorderedList,
  useColorModeValue,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiBaseUrl } from '../api/baseUrl'
import { normalizePortalAccessToken } from '../auth/normalizeToken'
import { getAccessToken, setAccessToken } from '../auth/storage'
import { ColorModeToggle, type ColorModeToggleVariant } from '../components/ColorModeToggle'
import { PoweredByTraction } from '../components/PoweredByTraction'
import { BC_THEME_CONFIG } from '../config/bcThemeColors'

type Phase = 'landing' | 'error' | 'manual'

function publisherSessionUrl(): string {
  const base = apiBaseUrl().replace(/\/$/, '')
  return `${base}/publisher/session`
}

type SessionCheckResult =
  | { ok: true }
  | { ok: false; kind: 'http'; status: number; detail?: string; url: string }
  | { ok: false; kind: 'network'; message: string; url: string }

async function checkPublisherSession(token: string): Promise<SessionCheckResult> {
  const url = publisherSessionUrl()
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${normalizePortalAccessToken(token)}` },
    })
    if (res.ok) return { ok: true }
    let detail: string | undefined
    try {
      const body: unknown = await res.json()
      if (body && typeof body === 'object' && 'detail' in body) {
        const d = (body as { detail: unknown }).detail
        if (typeof d === 'string') detail = d
        else if (Array.isArray(d))
          detail = d
            .map((x) => (x && typeof x === 'object' && 'msg' in x ? String((x as { msg: unknown }).msg) : ''))
            .filter(Boolean)
            .join('; ')
      }
    } catch {
      /* ignore non-JSON */
    }
    return { ok: false, kind: 'http', status: res.status, detail, url }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error'
    return { ok: false, kind: 'network', message, url }
  }
}

type SignInFailure =
  | { reason: 'empty' }
  | { reason: 'clipboard' }
  | { reason: 'network'; message: string; url: string }
  | { reason: 'rejected'; status: number; detail?: string; url: string }

export function LoginPage() {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('landing')
  const [jwt, setJwt] = useState('')
  const [loading, setLoading] = useState(false)
  const [signInFailure, setSignInFailure] = useState<SignInFailure | null>(null)

  const toggleVariant = useColorModeValue('default', 'onDark') as ColorModeToggleVariant
  const errorBg = useColorModeValue('gray.50', 'gray.900')
  const errorFg = useColorModeValue('gray.900', 'gray.100')
  const errorHelpColor = useColorModeValue('gray.600', 'gray.400')
  const errorOutlineScheme = useColorModeValue('gray', 'whiteAlpha')
  const manualPageBg = useColorModeValue('bc.lightGrayBg', 'brand.900')
  const manualBlobBlueOpacity = useColorModeValue(0.08, 0.22)
  const manualBlobGoldOpacity = useColorModeValue(0.07, 0.2)
  const manualBackColor = useColorModeValue('gray.600', 'whiteAlpha.700')
  const manualPanelBorder = useColorModeValue('gray.200', 'whiteAlpha.300')

  const landingBg = useColorModeValue('bc.lightGrayBg', 'brand.900')
  const landingColor = useColorModeValue('bc.textPrimary', 'white')
  const landingMesh = useColorModeValue(
    BC_THEME_CONFIG.gradients.loginLandingLight,
    BC_THEME_CONFIG.gradients.loginLandingDark,
  )
  const heroMuted = useColorModeValue('gray.600', 'whiteAlpha.800')
  const landingIntroColor = useColorModeValue('gray.700', 'whiteAlpha.900')
  const landingPanelBg = useColorModeValue('whiteAlpha.720', 'blackAlpha.350')
  const landingPanelBorder = useColorModeValue('whiteAlpha.600', 'whiteAlpha.120')
  const landingPanelHeading = useColorModeValue('gray.800', 'white')
  const landingBulletColor = useColorModeValue('gray.600', 'whiteAlpha.850')
  const outlineBtnBorder = useColorModeValue('gray.300', 'whiteAlpha.400')
  const outlineBtnColor = useColorModeValue('gray.800', 'white')
  const outlineBtnHoverBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.100')
  const outlineBtnHoverBorder = useColorModeValue('gray.400', 'whiteAlpha.600')
  const loginFooterBorder = useColorModeValue('blackAlpha.200', 'whiteAlpha.150')
  const loginStickyBg = useColorModeValue(
    BC_THEME_CONFIG.appChrome.stickyBarBgLight,
    BC_THEME_CONFIG.appChrome.stickyBarBgDark,
  )
  const loginStickyBorder = useColorModeValue('gray.200', 'whiteAlpha.200')
  const loginStickyBlur = BC_THEME_CONFIG.appChrome.backdropBlur
  const loginNavTitleColor = useColorModeValue('gray.900', 'white')

  const loginTopNav = (
    <Box
      as="header"
      position="sticky"
      top={0}
      zIndex={10}
      w="full"
      bg={loginStickyBg}
      borderBottomWidth="1px"
      borderColor={loginStickyBorder}
      backdropFilter={loginStickyBlur}
      sx={{ WebkitBackdropFilter: loginStickyBlur }}
    >
      <Flex maxW="lg" mx="auto" w="full" px={{ base: 5, md: 8 }} py={3} align="center" justify="space-between">
        <Text fontWeight="700" fontSize="md" fontFamily="heading" color={loginNavTitleColor}>
          UNTP Publisher
        </Text>
        <ColorModeToggle variant={toggleVariant} />
      </Flex>
    </Box>
  )

  useEffect(() => {
    if (getAccessToken()) navigate('/', { replace: true })
  }, [navigate])

  const signInWithToken = async (raw: string) => {
    const token = normalizePortalAccessToken(raw)
    if (!token) {
      setSignInFailure({ reason: 'empty' })
      setPhase('error')
      return
    }
    setLoading(true)
    try {
      const result = await checkPublisherSession(token)
      if (result.ok) {
        setAccessToken(token)
        navigate('/', { replace: true })
        return
      }
      if (result.kind === 'network') {
        setSignInFailure({ reason: 'network', message: result.message, url: result.url })
      } else {
        setSignInFailure({
          reason: 'rejected',
          status: result.status,
          detail: result.detail,
          url: result.url,
        })
      }
      setPhase('error')
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unexpected error'
      setSignInFailure({ reason: 'network', message, url: publisherSessionUrl() })
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
      setSignInFailure({ reason: 'clipboard' })
      setPhase('error')
    }
  }

  const submitManualToken = async () => {
    await signInWithToken(jwt)
  }

  if (phase === 'error') {
    return (
      <Flex minH="100vh" direction="column" bg={errorBg} color={errorFg} position="relative">
        {loginTopNav}
        <Flex flex="1" align="center" justify="center" px={4} py={20}>
          <Box maxW="lg" mx="auto" textAlign="center">
            <Heading size="lg" fontFamily="heading" mb={4}>
              We couldn&apos;t sign you in
            </Heading>
            <Stack spacing={4} fontSize="md" color={errorHelpColor} mb={10} maxW="lg" mx="auto" textAlign="left">
              {signInFailure?.reason === 'clipboard' && (
                <Text lineHeight="tall">
                  The browser could not read the clipboard. Use <strong>Enter token manually</strong>, or open this
                  app on <strong>HTTPS</strong> or <strong>localhost</strong> and grant clipboard permission when
                  prompted.
                </Text>
              )}
              {signInFailure?.reason === 'empty' && (
                <Text lineHeight="tall">
                  No token was found (clipboard empty or only whitespace). Copy a JWT from your issuer or tenant wallet,
                  then try again or paste it manually.
                </Text>
              )}
              {signInFailure?.reason === 'network' && (
                <>
                  <Text lineHeight="tall">
                    The browser could not reach the publisher API (network, DNS, TLS, or CORS). Confirm the API is up
                    and that this page is allowed to call it.
                  </Text>
                  <Text fontSize="sm" fontFamily="mono" wordBreak="break-all" color={errorFg}>
                    {signInFailure.message}
                  </Text>
                </>
              )}
              {signInFailure?.reason === 'rejected' && (
                <Text lineHeight="tall">
                  <strong>HTTP {signInFailure.status}</strong>
                  {signInFailure.detail ? (
                    <>
                      {' — '}
                      {signInFailure.detail}
                    </>
                  ) : (
                    <> — The session endpoint did not accept this token. Try a publisher token from this API&apos;s
                    POST /auth/token, or a wallet JWT that Traction still accepts on GET /tenant, /tenant/config,
                    /tenant/wallet, or /tenant/server/status/config.</>
                  )}
                </Text>
              )}
              {!signInFailure && (
                <Text lineHeight="tall" textAlign="center">
                  Check that you have a valid access token, the publisher API is running and reachable, and—if you used
                  Get started—that this page is on HTTPS or localhost so the browser can read the clipboard.
                </Text>
              )}
              <Text fontSize="sm" fontFamily="mono" wordBreak="break-all" color={errorHelpColor}>
                Session check: {publisherSessionUrl()}
              </Text>
            </Stack>
            <Stack direction={{ base: 'column', sm: 'row' }} spacing={4} justify="center">
              <Button
                colorScheme="brand"
                isLoading={loading}
                onClick={() => {
                  setSignInFailure(null)
                  void signInFromClipboard()
                }}
              >
                Try again
              </Button>
              <Button
                variant="outline"
                colorScheme={errorOutlineScheme}
                onClick={() => {
                  setSignInFailure(null)
                  setPhase('manual')
                }}
              >
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
        <Box position="relative" zIndex={2}>
          {loginTopNav}
        </Box>
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
            <Button
              variant="link"
              color={manualBackColor}
              mb={8}
              onClick={() => {
                setSignInFailure(null)
                setPhase('landing')
              }}
            >
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
      <Box position="absolute" inset={0} bgGradient={landingMesh} pointerEvents="none" />

      <Flex direction="column" minH="100vh" position="relative" zIndex={1}>
        {loginTopNav}

        <Container maxW="lg" flex="1" px={{ base: 5, md: 8 }} pt={{ base: 4, md: 10 }} pb={12}>
          <Stack spacing={8} textAlign="center" align="stretch">
            <Stack spacing={3}>
              <Heading as="h1" fontFamily="heading" fontWeight="800" letterSpacing="-0.03em" fontSize={{ base: '2xl', md: '3xl' }}>
                Digital Documents for Verifiable Conformity (DD4VC)
              </Heading>
              <Text color={heroMuted} fontSize="md" lineHeight="tall" maxW="xl" mx="auto">
                Sign in with a publisher token or a Traction wallet JWT. Use the clipboard, or paste your token
                manually.
              </Text>
              <Text color={landingIntroColor} fontSize="md" lineHeight="tall" maxW="xl" mx="auto" textAlign={{ base: 'left', md: 'center' }}>
                This portal talks to your UNTP Publisher API: check deployment and API health, register issuers and
                credential templates, inspect issued credentials, and review environment details—all using your session
                token, not the server admin API key.
              </Text>
            </Stack>

            <Box
              maxW="xl"
              mx="auto"
              w="full"
              textAlign="left"
              px={{ base: 5, md: 6 }}
              py={5}
              rounded="xl"
              borderWidth="1px"
              borderColor={landingPanelBorder}
              bg={landingPanelBg}
              backdropFilter="blur(12px)"
              sx={{ WebkitBackdropFilter: 'blur(12px)' }}
            >
              <Text fontSize="sm" fontWeight="semibold" color={landingPanelHeading} mb={3} fontFamily="heading">
                After you sign in
              </Text>
              <UnorderedList spacing={2} pl={1} color={landingBulletColor} fontSize="sm" lineHeight="tall">
                <ListItem>
                  <strong>Overview</strong> — service status and build metadata surfaced from the API.
                </ListItem>
                <ListItem>
                  <strong>Issuers</strong> — register DIDs and keys, then reuse them for credential types.
                </ListItem>
                <ListItem>
                  <strong>Credential templates</strong> — define types (context, OCA, status lists) stored by the
                  publisher.
                </ListItem>
                <ListItem>
                  <strong>Credentials</strong> — browse published credential summaries (no raw VC payload in the list).
                </ListItem>
                <ListItem>
                  <strong>Settings</strong> — browser vs server URLs, token expiry, and optional admin actions such as
                  rotating an issuer secret.
                </ListItem>
              </UnorderedList>
              <Text fontSize="xs" color={heroMuted} mt={4} lineHeight="short">
                Tokens from <Text as="span" fontFamily="mono">POST /auth/token</Text> on this API, or a compatible
                Traction wallet JWT, are accepted when the backend is configured for them.
              </Text>
            </Box>

            <Stack direction={{ base: 'column', sm: 'row' }} spacing={3} justify="center" align="stretch">
              <Button
                size="lg"
                colorScheme="brand"
                isLoading={loading}
                loadingText="Signing in"
                onClick={() => void signInFromClipboard()}
              >
                Get started
              </Button>
              <Button
                size="lg"
                variant="outline"
                borderColor={outlineBtnBorder}
                color={outlineBtnColor}
                _hover={{ bg: outlineBtnHoverBg, borderColor: outlineBtnHoverBorder }}
                onClick={() => setPhase('manual')}
              >
                Paste token
              </Button>
            </Stack>
          </Stack>
        </Container>

        <Box borderTopWidth="1px" borderColor={loginFooterBorder} py={6} px={{ base: 5, md: 8 }} maxW="lg" w="full" mx="auto" mt="auto">
          <PoweredByTraction />
        </Box>
      </Flex>
    </Box>
  )
}
