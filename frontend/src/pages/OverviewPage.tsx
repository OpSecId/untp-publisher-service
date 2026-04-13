import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Heading,
  SimpleGrid,
  Skeleton,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiFetch, apiJson } from '../api/client'
import { setAccessToken } from '../auth/storage'
import type { PublisherSession } from '../api/types'

export function OverviewPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState<PublisherSession | null>(null)
  const [serverOk, setServerOk] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cardBg = useColorModeValue('white', 'gray.700')
  const cardBorder = useColorModeValue('gray.100', 'gray.600')
  const sectionTitle = useColorModeValue('gray.700', 'gray.200')

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [sess, statusRes] = await Promise.all([
        apiJson<PublisherSession>('/publisher/session'),
        apiFetch('/server/status'),
      ])
      setSession(sess)
      setServerOk(statusRes.ok)
    } catch (e) {
      if (e instanceof ApiError && e.status === 403) {
        setAccessToken(null)
        navigate('/login', { replace: true })
        return
      }
      setError(e instanceof Error ? e.message : 'Failed to load session')
    } finally {
      setLoading(false)
    }
  }, [navigate])

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

  return (
    <Box>
      <Heading size="lg" mb={8} fontFamily="heading">
        Overview
      </Heading>

      <Box maxW="md" mb={10}>
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
      </Box>

      <Box bg={cardBg} rounded="xl" shadow="sm" borderWidth="1px" borderColor={cardBorder} p={8}>
        <Heading size="sm" mb={4} color={sectionTitle}>
          Deployment
        </Heading>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <Field label="Title" value={env?.project_title} />
          <Field label="Version" value={env?.project_version} />
          <Field label="Publisher domain" value={env?.domain} />
          <Field label="Publisher Tenant ID" value={env?.traction_tenant_id} />
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
      <Box maxW="md">
        <Skeleton height="120px" rounded="xl" />
      </Box>
    </Box>
  )
}
