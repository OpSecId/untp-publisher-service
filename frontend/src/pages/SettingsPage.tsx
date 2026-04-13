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
  useToast,
} from '@chakra-ui/react'
import { useState } from 'react'
import { apiJson } from '../api/client'
import { usePublisherSession } from '../hooks/usePublisherSession'
import { apiBaseUrl } from '../api/baseUrl'

export function SettingsPage() {
  const { session, loading, error } = usePublisherSession()
  const toast = useToast()
  const tractionConfigured = Boolean(import.meta.env.VITE_TRACTION_URL)

  const [adminKey, setAdminKey] = useState('')
  const [rotateIssuerId, setRotateIssuerId] = useState('')
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [rotating, setRotating] = useState(false)

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

  return (
    <Box maxW="3xl">
      <Heading size="lg" mb={2} fontFamily="heading">
        Settings
      </Heading>
      <Text color="gray.600" mb={10}>
        Environment surfaced by the API for your JWT, plus optional admin actions.
      </Text>

      <Box bg="white" rounded="xl" shadow="sm" borderWidth="1px" borderColor="gray.100" p={8} mb={8}>
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

      <Box bg="white" rounded="xl" shadow="sm" borderWidth="1px" borderColor="gray.100" p={8} mb={8}>
        <Heading size="sm" mb={4}>
          Server environment
        </Heading>
        <Stack spacing={3} fontSize="sm">
          <Row label="Traction API URL" value={env?.traction_api_url} />
          <Row label="Traction tenant ID" value={env?.traction_tenant_id} />
          <Row label="Orgbook URL" value={env?.orgbook_url} />
          <Row label="DID web server" value={env?.did_web_server_url} />
          <Row label="Issuer registry" value={env?.issuer_registry_url} />
        </Stack>
      </Box>

      <Box bg="white" rounded="xl" shadow="sm" borderWidth="1px" borderColor="orange.100" p={8}>
        <Heading size="sm" mb={2}>
          Admin: rotate issuer secret
        </Heading>
        <Text fontSize="sm" color="gray.600" mb={6}>
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
