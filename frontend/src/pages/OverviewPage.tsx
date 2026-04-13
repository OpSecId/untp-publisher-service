import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Heading,
  SimpleGrid,
  Skeleton,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiFetch, apiJson } from '../api/client'
import { setAccessToken } from '../auth/storage'
import type { PublisherSession } from '../api/types'

function formatExpiry(epoch: number): string {
  try {
    return new Date(epoch * 1000).toLocaleString()
  } catch {
    return String(epoch)
  }
}

export function OverviewPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<PublisherSession | null>(null)
  const [serverOk, setServerOk] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cardBg = useColorModeValue('white', 'gray.700')
  const cardBorder = useColorModeValue('gray.100', 'gray.600')
  const mutedText = useColorModeValue('gray.600', 'gray.400')
  const sectionTitle = useColorModeValue('gray.700', 'gray.200')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const [sess, statusRes] = await Promise.all([
          apiJson<PublisherSession>('/publisher/session'),
          apiFetch('/server/status'),
        ])
        if (!cancelled) {
          setSession(sess)
          setServerOk(statusRes.ok)
        }
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 403) {
            setAccessToken(null)
            navigate('/login', { replace: true })
            return
          }
          setError(e instanceof Error ? e.message : 'Failed to load session')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  if (loading) {
    return (
      <StackedSkeleton />
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
  const claims = session?.claims
  const clientId = claims?.client_id
  const defaultTenantId = env?.traction_tenant_id
  const sessionAndTenantDiffer = Boolean(
    clientId && defaultTenantId && clientId !== defaultTenantId,
  )

  return (
    <Box>
      <Heading size="lg" mb={2} fontFamily="heading">
        Overview
      </Heading>
      <Stack spacing={2} mb={10}>
        <Text color={mutedText}>
          Session <strong style={{ fontFamily: 'monospace' }}>{clientId ?? '—'}</strong>
          <Text as="span" fontSize="sm" display="block" mt={1}>
            From your JWT: <code>client_id</code> (publisher token) or <code>wallet_id</code> (Traction wallet
            token).
          </Text>
        </Text>
        {sessionAndTenantDiffer ? (
          <Text fontSize="sm" color={mutedText}>
            This id is not always the same as <strong>Default Traction tenant</strong> below — that value is the
            server&apos;s <code>TRACTION_TENANT_ID</code> for backend calls to Traction.
          </Text>
        ) : null}
      </Stack>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6} mb={10}>
        <Stat
          px={6}
          py={5}
          bg={cardBg}
          shadow="sm"
          rounded="xl"
          borderWidth="1px"
          borderColor={cardBorder}
        >
          <StatLabel>API health</StatLabel>
          <StatNumber fontSize="lg">
            {serverOk === null ? '—' : serverOk ? 'OK' : 'Unreachable'}
          </StatNumber>
          <StatHelpText>GET /server/status</StatHelpText>
        </Stat>
        <Stat
          px={6}
          py={5}
          bg={cardBg}
          shadow="sm"
          rounded="xl"
          borderWidth="1px"
          borderColor={cardBorder}
        >
          <StatLabel>Token expiry</StatLabel>
          <StatNumber fontSize="md">{claims ? formatExpiry(claims.expires) : '—'}</StatNumber>
          <StatHelpText>Refresh by signing in again with credentials</StatHelpText>
        </Stat>
      </SimpleGrid>

      <Box bg={cardBg} rounded="xl" shadow="sm" borderWidth="1px" borderColor={cardBorder} p={8}>
        <Heading size="sm" mb={4} color={sectionTitle}>
          Deployment
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Field label="Title" value={env?.project_title} />
          <Field label="Version" value={env?.project_version} />
          <Field label="Publisher domain" value={env?.domain} />
          <Field
            label="Default Traction tenant"
            hint="TRACTION_TENANT_ID on this deployment (backend → Traction). May differ from your wallet session id."
            value={env?.traction_tenant_id}
          />
        </SimpleGrid>
      </Box>
    </Box>
  )
}

function Field({ label, value, hint }: { label: string; value: string | undefined; hint?: string }) {
  return (
    <Box>
      <Text fontSize="xs" textTransform="uppercase" letterSpacing="wider" color="gray.500" mb={1}>
        {label}
      </Text>
      <Badge colorScheme="gray" fontSize="sm" px={2} py={1} rounded="md" maxW="full" whiteSpace="normal">
        {value ?? '—'}
      </Badge>
      {hint ? (
        <Text fontSize="xs" color="gray.500" mt={2} lineHeight="short">
          {hint}
        </Text>
      ) : null}
    </Box>
  )
}

function StackedSkeleton() {
  return (
    <Box>
      <Skeleton height="32px" width="200px" mb={4} />
      <Skeleton height="20px" width="360px" mb={10} />
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        <Skeleton height="120px" rounded="xl" />
        <Skeleton height="120px" rounded="xl" />
      </SimpleGrid>
    </Box>
  )
}
