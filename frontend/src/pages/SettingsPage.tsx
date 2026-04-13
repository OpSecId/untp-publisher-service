import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Skeleton,
  Stack,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { useState } from 'react'
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
  const adminCardBorder = useColorModeValue('orange.100', 'orange.800')
  const muted = useColorModeValue('gray.600', 'gray.400')

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
              <Text fontWeight="medium">Registry / DID web URLs look like dev defaults</Text>
              <Text fontSize="sm" mt={1}>
                These rows use <code>localhost</code>, <code>127.0.0.1</code>, or are empty:{' '}
                {placeholderBackendVars.map((v) => v.rowLabel).join(', ')}. On the API host (e.g. Railway), set{' '}
                <code>{placeholderBackendVars.map((v) => v.envVar).join(', ')}</code> to URLs the backend can
                reach (not only the browser / SPA host).
              </Text>
            </Box>
          </Alert>
        ) : null}
        <Stack spacing={3} fontSize="sm">
          <Row label="Traction API URL" value={env?.traction_api_url} />
          <Row label="Traction tenant ID" value={env?.traction_tenant_id} />
          <WalletIntrospectionUrls
            baseUrl={env?.traction_api_url}
            paths={env?.traction_wallet_introspection_paths}
            mutedColor={muted}
          />
          <WalletTractionProbePanel tractionApiUrl={env?.traction_api_url} />
          <Row label="Registry URL" value={env?.registry_url} />
          <Row label="DID web(vh) server" value={env?.did_web_server_url} />
          <Row label="Issuer registry" value={env?.issuer_registry_url} />
        </Stack>
      </Box>

      <Box bg={cardBg} rounded="xl" shadow="sm" borderWidth="1px" borderColor={adminCardBorder} p={8}>
        <Heading size="sm" mb={2}>
          Admin: rotate issuer secret
        </Heading>
        <Text fontSize="sm" color={muted} mb={6}>
          Uses <code>POST /auth/secret</code> with <code>X-API-Key</code> (same key as server{' '}
          <code>TRACTION_API_KEY</code> in this deployment). The new secret is shown once.
        </Text>
        <Stack spacing={4} maxW="md">
          <FormControl>
            <FormLabel>X-API-Key</FormLabel>
            <Input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin API key"
              autoComplete="off"
            />
          </FormControl>
          <FormControl>
            <FormLabel>Issuer client ID</FormLabel>
            <Input
              value={rotateIssuerId}
              onChange={(e) => setRotateIssuerId(e.target.value)}
              placeholder="did:web:…"
            />
          </FormControl>
          <Button colorScheme="orange" onClick={() => void rotateSecret()} isLoading={rotating}>
            Rotate secret
          </Button>
          {newSecret && (
            <>
              <Divider />
              <FormControl>
                <FormLabel>New client secret (copy now)</FormLabel>
                <Input readOnly value={newSecret} fontFamily="mono" fontSize="sm" />
              </FormControl>
            </>
          )}
        </Stack>
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
  if (isDevPlaceholderUrl(env.registry_url)) {
    out.push({ rowLabel: 'Registry URL', envVar: 'REGISTRY_URL' })
  }
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

function walletIntrospectionFullUrls(baseUrl: string | undefined, paths: string[] | undefined): string[] {
  if (!paths?.length) {
    return []
  }
  const base = (baseUrl ?? '').trim().replace(/\/+$/, '')
  if (!base) {
    return paths
  }
  return paths.map((p) => `${base}${p.startsWith('/') ? p : `/${p}`}`)
}

function WalletIntrospectionUrls({
  baseUrl,
  paths,
  mutedColor,
}: {
  baseUrl: string | undefined
  paths: string[] | undefined
  mutedColor: string
}) {
  const lines = walletIntrospectionFullUrls(baseUrl, paths)
  if (!lines.length) {
    return null
  }
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" mb={1}>
        Wallet JWT introspection (backend tries GET with your Bearer, first 200 wins)
      </Text>
      <Box
        as="ol"
        pl={5}
        m={0}
        fontFamily="mono"
        fontSize="xs"
        sx={{ listStyleType: 'decimal' }}
      >
        {lines.map((url) => (
          <Box as="li" key={url} wordBreak="break-all" py={0.5}>
            {url}
          </Box>
        ))}
      </Box>
      {!baseUrl?.trim() && (
        <Text fontSize="xs" color={mutedColor} mt={2}>
          Paths only — set server <code>TRACTION_API_URL</code> to see full probe URLs.
        </Text>
      )}
    </Box>
  )
}
