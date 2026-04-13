import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiJson } from '../api/client'
import { decodeJwtPayload, looksLikePublisherJwt } from '../auth/jwtPayload'
import { getAccessToken, setAccessToken } from '../auth/storage'

export function LoginPage() {
  const navigate = useNavigate()

  useEffect(() => {
    if (getAccessToken()) navigate('/', { replace: true })
  }, [navigate])

  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [jwtPaste, setJwtPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loginWithCredentials = async () => {
    setError(null)
    setLoading(true)
    try {
      const data = await apiJson<{ access_token: string }>('/auth/token', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
      })
      if (!data.access_token) {
        setError('No access token in response')
        return
      }
      setAccessToken(data.access_token)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const loginWithJwt = () => {
    setError(null)
    const raw = jwtPaste.trim()
    if (!raw) {
      setError('Paste a JWT first')
      return
    }
    const payload = decodeJwtPayload(raw)
    if (!looksLikePublisherJwt(payload)) {
      setError('JWT payload must include client_id and expires')
      return
    }
    setAccessToken(raw)
    navigate('/', { replace: true })
  }

  const pasteFromClipboard = async () => {
    setError(null)
    try {
      const text = await navigator.clipboard.readText()
      setJwtPaste(text.trim())
    } catch {
      setError('Clipboard access denied or unavailable')
    }
  }

  return (
    <Box minH="100vh" bg="gray.900" py={{ base: 10, md: 20 }} px={4}>
      <Box maxW="md" mx="auto">
        <Heading color="white" size="xl" mb={2} fontFamily="heading">
          Orgbook Publisher
        </Heading>
        <Text color="gray.400" mb={10}>
          Sign in with issuer credentials or paste an existing session JWT.
        </Text>

        <Box bg="white" rounded="2xl" shadow="xl" p={{ base: 6, md: 8 }}>
          {error && (
            <Alert status="error" rounded="md" mb={6}>
              <AlertIcon />
              {error}
            </Alert>
          )}

          <Tabs colorScheme="blue" variant="enclosed">
            <TabList>
              <Tab>Credentials</Tab>
              <Tab>Paste JWT</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <Stack spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Client ID (issuer DID)</FormLabel>
                    <Input
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="did:web:…"
                      autoComplete="username"
                    />
                  </FormControl>
                  <FormControl isRequired>
                    <FormLabel>Client secret</FormLabel>
                    <Input
                      type="password"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      autoComplete="current-password"
                    />
                  </FormControl>
                  <Button
                    colorScheme="blue"
                    size="lg"
                    onClick={() => void loginWithCredentials()}
                    isLoading={loading}
                  >
                    Sign in
                  </Button>
                </Stack>
              </TabPanel>
              <TabPanel px={0}>
                <Stack spacing={4}>
                  <FormControl>
                    <FormLabel>Access token (JWT)</FormLabel>
                    <Textarea
                      value={jwtPaste}
                      onChange={(e) => setJwtPaste(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9…"
                      rows={5}
                      fontFamily="mono"
                      fontSize="sm"
                    />
                  </FormControl>
                  <Button variant="outline" onClick={() => void pasteFromClipboard()}>
                    Paste from clipboard
                  </Button>
                  <Button colorScheme="blue" size="lg" onClick={loginWithJwt}>
                    Continue with JWT
                  </Button>
                  <Text fontSize="xs" color="gray.500">
                    The server validates the token on your next request. Pasting only stores it in
                    session storage for this browser tab.
                  </Text>
                </Stack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Box>
    </Box>
  )
}
