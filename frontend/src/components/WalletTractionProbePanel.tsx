import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertIcon,
  Badge,
  Box,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { ApiError, apiJson } from '../api/client'
import type { TractionWalletProbeResponse, TractionWalletProbeRow } from '../api/types'

function probeTitle(path: string): string {
  if (path === '/tenant') {
    return 'Tenant'
  }
  if (path === '/tenant/config') {
    return 'Tenant config'
  }
  if (path === '/tenant/wallet') {
    return 'Tenant wallet'
  }
  if (path === '/tenant/server/status/config') {
    return 'Server status / config'
  }
  return path
}

function statusBadgeScheme(code: number | null): string {
  if (code === null) {
    return 'gray'
  }
  if (code === 200) {
    return 'green'
  }
  if (code === 401 || code === 403) {
    return 'orange'
  }
  if (code >= 500) {
    return 'red'
  }
  return 'yellow'
}

function formatBody(body: unknown): string {
  if (body === null || body === undefined) {
    return '—'
  }
  if (typeof body === 'string') {
    return body
  }
  try {
    return JSON.stringify(body, null, 2)
  } catch {
    return String(body)
  }
}

export function WalletTractionProbePanel({ tractionApiUrl }: { tractionApiUrl: string | undefined }) {
  const [data, setData] = useState<TractionWalletProbeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!tractionApiUrl?.trim()) {
      setData(null)
      setErr(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setErr(null)
    void (async () => {
      try {
        const j = await apiJson<TractionWalletProbeResponse>('/publisher/traction-wallet-probes')
        if (!cancelled) {
          setData(j)
        }
      } catch (e) {
        if (!cancelled) {
          setData(null)
          setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Request failed')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tractionApiUrl])

  if (!tractionApiUrl?.trim()) {
    return null
  }

  if (loading) {
    return (
      <Box display="flex" alignItems="center" gap={3} mt={3}>
        <Spinner size="sm" />
        <Text fontSize="xs" color="gray.500">
          Loading probe responses from Traction (via this API)…
        </Text>
      </Box>
    )
  }

  if (err) {
    return (
      <Alert status="error" variant="subtle" borderRadius="md" mt={3} fontSize="sm">
        <AlertIcon />
        {err}
      </Alert>
    )
  }

  if (!data?.probes?.length) {
    return (
      <Alert status="info" variant="subtle" borderRadius="md" mt={3} fontSize="sm">
        <AlertIcon />
        {data?.detail ?? 'No probe results.'}
      </Alert>
    )
  }

  return (
    <Box mt={4}>
      <Text fontSize="xs" color="gray.500" mb={2}>
        Expand each probe to see HTTP status, content type, and a trimmed body (large{' '}
        <code>/tenant/server/status/config</code> payloads are summarized).
      </Text>
      <Accordion allowMultiple reduceMotion>
        {data.probes.map((p: TractionWalletProbeRow) => (
          <AccordionItem key={p.path} borderWidth="1px" borderRadius="md" mb={2} borderColor="gray.200">
            <AccordionButton px={3} py={2} _expanded={{ bg: 'blackAlpha.50' }}>
              <Box flex="1" textAlign="left" display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <Badge colorScheme={statusBadgeScheme(p.status_code)} fontSize="0.65rem">
                  {p.status_code ?? 'ERR'}
                </Badge>
                <Text fontSize="sm" fontWeight="medium">
                  {probeTitle(p.path)}
                </Text>
                <Text fontSize="xs" color="gray.500" fontFamily="mono">
                  {p.path}
                </Text>
              </Box>
              <AccordionIcon />
            </AccordionButton>
            <AccordionPanel px={3} pb={3} pt={0}>
              <Text fontSize="xs" color="gray.500" wordBreak="break-all" mb={1}>
                {p.url}
              </Text>
              {p.error ? (
                <Text fontSize="xs" color="red.600" mb={2}>
                  {p.error}
                </Text>
              ) : null}
              {p.content_type ? (
                <Text fontSize="xs" color="gray.500" mb={2}>
                  Content-Type: {p.content_type}
                </Text>
              ) : null}
              <Box
                as="pre"
                fontSize="xs"
                fontFamily="mono"
                whiteSpace="pre-wrap"
                wordBreak="break-word"
                maxH="320px"
                overflowY="auto"
                p={2}
                bg="blackAlpha.50"
                borderRadius="md"
                borderWidth="1px"
                borderColor="gray.100"
              >
                {formatBody(p.body)}
              </Box>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Box>
  )
}
