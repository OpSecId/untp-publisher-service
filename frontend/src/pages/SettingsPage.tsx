import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertIcon,
  Box,
  Button,
  Heading,
  HStack,
  Icon,
  Input,
  Skeleton,
  Stack,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { useState, type MouseEvent } from 'react'
import { MdInfoOutline } from 'react-icons/md'
import { apiJson } from '../api/client'
import { usePublisherSession } from '../hooks/usePublisherSession'
import { apiBaseUrl } from '../api/baseUrl'
import { WalletTractionProbePanel } from '../components/WalletTractionProbePanel'
import type { PublisherSession } from '../api/types'

export function SettingsPage() {
  const { session, loading, error } = usePublisherSession()
  const toast = useToast()
  const tractionConfigured = Boolean(import.meta.env.VITE_TRACTION_URL)

  const [adminKey, setAdminKey] = useState('')
  const [rotateIssuerId, setRotateIssuerId] = useState('')
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [rotating, setRotating] = useState(false)
  const cardBg = useColorModeValue('white', 'gray.700')
  const cardBorder = useColorModeValue('gray.100', 'gray.600')
  const adminCardBorder = useColorModeValue('gray.200', 'whiteAlpha.200')
  const muted = useColorModeValue('gray.600', 'gray.400')
  const adminAccordionHover = useColorModeValue('gray.50', 'whiteAlpha.50')

  const rotateSecret = async () => {
    setNewSecret(null)
    if (!adminKey.trim() || !rotateIssuerId.trim()) {
      toast({ title: 'API key and issuer client ID are required', status: 'warning' })
      return
    }
    setRotating(true)
    try {
      const data = await apiJson<{ client_secret: string }>('/auth/secret', {
        method: 'POST',
        skipAuth: true,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': adminKey.trim(),
        },
        body: JSON.stringify({ client_id: rotateIssuerId.trim() }),
      })
      setNewSecret(data.client_secret)
      toast({ title: 'Secret rotated', description: 'Copy the new secret now; it is not shown again.', status: 'success' })
    } catch (e) {
      toast({
        title: 'Rotation failed',
        description: e instanceof Error ? e.message : 'Request failed',
        status: 'error',
      })
    } finally {
      setRotating(false)
    }
  }

  if (loading) {
    return (
      <Stack spacing={4} maxW="2xl">
        <Skeleton height="36px" />
        <Skeleton height="200px" />
      </Stack>
    )
  }

  if (error) {
    return (
      <Alert status="error" maxW="lg">
        <AlertIcon />
        {error}
      </Alert>
    )
  }

  const env = session?.environment
  const placeholderBackendVars = collectPlaceholderBackendUrls(env)

  return (
    <Box maxW="3xl">
      <Heading size="lg" mb={2} fontFamily="heading">
        Settings
      </Heading>
      <Text color={muted} mb={10}>
        Environment surfaced by the API for your JWT, plus optional admin actions.
      </Text>

      <Box bg={cardBg} rounded="xl" shadow="sm" borderWidth="1px" borderColor={cardBorder} p={8} mb={8}>
        <Heading size="sm" mb={4}>
          Browser / SPA
        </Heading>
        <Stack spacing={3} fontSize="sm">
          <Row label="VITE_API_BASE_URL" value={import.meta.env.VITE_API_BASE_URL || '(default /api)'} />
          <Row label="Resolved API base" value={apiBaseUrl()} />
          <Row
            label="VITE_TRACTION_URL"
            value={import.meta.env.VITE_TRACTION_URL || '(not set)'}
          />
          <Text fontSize="xs" color="gray.500">
            Set <code>VITE_TRACTION_URL</code> if you run a CORS-enabled tenant proxy for direct browser calls.
            {!tractionConfigured && ' Currently not configured.'}
          </Text>
        </Stack>
      </Box>

      <Box bg={cardBg} rounded="xl" shadow="sm" borderWidth="1px" borderColor={cardBorder} p={8} mb={8}>
        <Heading size="sm" mb={4}>
          Server environment
        </Heading>
        {placeholderBackendVars.length > 0 ? (
          <Alert status="warning" variant="left-accent" borderRadius="md" mb={4}>
            <AlertIcon />
            <Box>
              <Text fontWeight="medium">DID web server URL looks like a dev default</Text>
              <Text fontSize="sm" mt={1}>
                This value uses <code>localhost</code>, <code>127.0.0.1</code>, or is empty. On the API host (e.g.
                Railway), set <code>{placeholderBackendVars.map((v) => v.envVar).join(', ')}</code> to a URL the
                backend can reach.
              </Text>
            </Box>
          </Alert>
        ) : null}
        <Stack spacing={3} fontSize="sm">
          <Row label="Traction API URL" value={env?.traction_api_url} />
          <Row label="Traction tenant ID" value={env?.traction_tenant_id} />
          <WalletTractionProbePanel tractionApiUrl={env?.traction_api_url} />
          <Row label="DID web(vh) server" value={env?.did_web_server_url} />
          <Row label="Issuer registry" value={env?.issuer_registry_url} />
        </Stack>
      </Box>

      <Box
        bg={cardBg}
        rounded="lg"
        borderWidth="1px"
        borderColor={adminCardBorder}
        overflow="hidden"
        shadow="sm"
      >
        <Accordion allowToggle reduceMotion defaultIndex={[]}>
          <AccordionItem border="none">
            <AccordionButton
              px={3}
              py={2}
              minH="unset"
              display="flex"
              alignItems="center"
              gap={2}
              _hover={{ bg: adminAccordionHover }}
              _expanded={{ bg: adminAccordionHover }}
            >
              <HStack flex="1" spacing={1.5} align="center" minW={0} justify="flex-start">
                <Text fontSize="xs" fontWeight="semibold" noOfLines={1}>
                  Admin · Rotate issuer secret
                </Text>
                <Tooltip
                  hasArrow
                  placement="top"
                  label="POST /auth/secret with X-API-Key (same value as server TRACTION_API_KEY). New secret is shown once — copy immediately."
                  fontSize="xs"
                  maxW="xs"
                >
                  <Box as="span" display="inline-flex" onClick={(e: MouseEvent) => e.stopPropagation()} aria-label="Help">
                    <Icon as={MdInfoOutline} boxSize={3.5} color="gray.500" cursor="help" />
                  </Box>
                </Tooltip>
              </HStack>
              <AccordionIcon boxSize={4} flexShrink={0} />
            </AccordionButton>
            <AccordionPanel px={3} pb={3} pt={0}>
              <Stack spacing={2}>
                <HStack spacing={2} flexWrap="wrap" align="flex-end">
                  <Input
                    size="sm"
                    type="password"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    placeholder="X-API-Key"
                    autoComplete="off"
                    flex={{ base: '1 1 100%', md: '1 1 140px' }}
                    minW={{ md: '120px' }}
                    aria-label="Admin X-API-Key"
                  />
                  <Input
                    size="sm"
                    value={rotateIssuerId}
                    onChange={(e) => setRotateIssuerId(e.target.value)}
                    placeholder="Issuer client_id (e.g. did:web:…)"
                    flex={{ base: '1 1 100%', md: '2 1 200px' }}
                    minW={{ md: '160px' }}
                    fontFamily="mono"
                    fontSize="xs"
                    aria-label="Issuer client ID"
                  />
                  <Button
                    size="sm"
                    colorScheme="orange"
                    variant="solid"
                    onClick={() => void rotateSecret()}
                    isLoading={rotating}
                    flexShrink={0}
                  >
                    Rotate
                  </Button>
                </HStack>
                {newSecret ? (
                  <Input
                    size="sm"
                    readOnly
                    value={newSecret}
                    fontFamily="mono"
                    fontSize="xs"
                    title="Copy now — not shown again"
                    aria-label="New client secret"
                  />
                ) : null}
              </Stack>
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      </Box>
    </Box>
  )
}

function isDevPlaceholderUrl(url: string | undefined): boolean {
  if (url == null || !url.trim()) {
    return true
  }
  const u = url.trim().toLowerCase()
  return u.includes('localhost') || u.includes('127.0.0.1') || u.startsWith('http://0.0.0.0')
}

function collectPlaceholderBackendUrls(
  env: PublisherSession['environment'] | undefined,
): { rowLabel: string; envVar: string }[] {
  if (!env) {
    return []
  }
  const out: { rowLabel: string; envVar: string }[] = []
  if (isDevPlaceholderUrl(env.did_web_server_url)) {
    out.push({
      rowLabel: 'DID web(vh) server',
      envVar: 'DID_WEB_SERVER_URL (or WEBH_SERVER_URL)',
    })
  }
  return out
}

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" mb={0.5}>
        {label}
      </Text>
      <Text fontFamily="mono" fontSize="xs" wordBreak="break-all">
        {value ?? '—'}
      </Text>
    </Box>
  )
}

