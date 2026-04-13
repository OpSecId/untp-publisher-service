import { Box, Button, Heading, Stack, Text, Textarea } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export function LoginPage() {
  const navigate = useNavigate()
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
      <Box minH="100vh" bg="gray.900" py={{ base: 10, md: 16 }} px={4}>
        <Box maxW="md" mx="auto">
          <Button variant="link" color="gray.400" mb={8} onClick={() => setPhase('landing')}>
            Back
          </Button>
          <Box bg="white" color="gray.800" rounded="2xl" shadow="xl" p={{ base: 6, md: 8 }}>
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
    )
  }

  return (
    <Box minH="100vh" bg="gray.900" px={4} py={{ base: 16, md: 24 }}>
      <Box maxW="xl" mx="auto" textAlign="center">
        <Heading color="white" size="2xl" mb={6} fontFamily="heading" letterSpacing="-0.02em">
          Orgbook Publisher
        </Heading>
        <Text color="gray.400" fontSize="lg" lineHeight="tall" mb={12}>
          Manage issuance and publisher settings for your tenant. Sign in with the access token you
          were given for this environment.
        </Text>
        <Button colorScheme="blue" size="lg" px={10} onClick={() => setPhase('token')}>
          Get started
        </Button>
      </Box>
    </Box>
  )
}
