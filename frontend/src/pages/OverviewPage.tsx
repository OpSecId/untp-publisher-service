import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Heading,
  IconButton,
  SimpleGrid,
  Skeleton,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
  Tooltip,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { MdRefresh } from 'react-icons/md'
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
  const toast = useToast()
  const [session, setSession] = useState<PublisherSession | null>(null)
  const [serverOk, setServerOk] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const cardBg = useColorModeValue('white', 'gray.700')
  const cardBorder = useColorModeValue('gray.100', 'gray.600')
  const mutedText = useColorModeValue('gray.600', 'gray.400')
  const sectionTitle = useColorModeValue('gray.700', 'gray.200')

  const loadOverview = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = Boolean(opts?.silent)
      if (silent) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      try {
        const [sess, statusRes] = await Promise.all([
          apiJson<PublisherSession>('/publisher/session'),
          apiFetch('/server/status'),
        ])
        setSession(sess)
        setServerOk(statusRes.ok)
        if (silent) {
          toast({ title: 'Session refreshed', status: 'success', duration: 2000 })
        }
      } catch (e) {
        if (e instanceof ApiError && e.status === 403) {
          setAccessToken(null)
          navigate('/login', { replace: true })
          return
        }
        setError(e instanceof Error ? e.message : 'Failed to load session')
        if (silent) {
          toast({
            title: 'Refresh failed',
            description: e instanceof Error ? e.message : 'Request failed',
            status: 'error',
          })
        }
      } finally {
        if (silent) {
          setRefreshing(false)
        } else {
          setLoading(false)
        }
      }
    },
    [navigate, toast],
  )

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

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
        <Box position="relative">
          <Tooltip label="Reload session and token expiry from your current access token" placement="top" hasArrow>
            <IconButton
              aria-label="Refresh session"
              icon={<MdRefresh size={20} />}
              variant="ghost"
              size="sm"
              position="absolute"
              top={3}
              right={3}
              zIndex={1}
              onClick={() => void loadOverview({ silent: true })}
              isLoading={refreshing}
              isRound
            />
          </Tooltip>
          <Stat
            px={6}
            py={5}
            pr={14}
            bg={cardBg}
            shadow="sm"
            rounded="xl"
            borderWidth="1px"
            borderColor={cardBorder}
          >
            <StatLabel>Token expiry</StatLabel>
            <StatNumber fontSize="md">{claims ? formatExpiry(claims.expires) : '—'}</StatNumber>
            <StatHelpText>
              Re-fetch with the button if you renewed your token elsewhere. For a new token, sign in again.
            </StatHelpText>
          </Stat>
        </Box>
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
