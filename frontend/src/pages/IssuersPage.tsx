import {
  Alert,
  AlertIcon,
  Box,
  Heading,
  Skeleton,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { ApiError, apiJson } from '../api/client'
import type { PublisherIssuersResponse } from '../api/types'

export function IssuersPage() {
  const [data, setData] = useState<PublisherIssuersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cardBg = useColorModeValue('white', 'gray.700')
  const cardBorder = useColorModeValue('gray.100', 'gray.600')
  const muted = useColorModeValue('gray.600', 'gray.400')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const j = await apiJson<PublisherIssuersResponse>('/publisher/issuers')
        if (!cancelled) {
          setData(j)
        }
      } catch (e) {
        if (!cancelled) {
          setData(null)
          setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Request failed')
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
  }, [])

  return (
    <Stack spacing={6} align="stretch">
      <Box>
        <Heading size="lg" mb={2}>
          Issuers
        </Heading>
        <Text color={muted} fontSize="sm" maxW="3xl">
          Issuers registered in this deployment&apos;s store (DID and display name). To add or change issuers, use the
          admin API <code>POST /registrations/issuers</code> with <code>X-API-Key</code> — keys are never shown here.
        </Text>
      </Box>

      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      )}

      <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="lg" overflow="hidden">
        {loading ? (
          <Stack p={6} spacing={3}>
            <Skeleton height="20px" />
            <Skeleton height="20px" />
            <Skeleton height="20px" />
          </Stack>
        ) : data?.issuers?.length ? (
          <TableContainer>
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>DID</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.issuers.map((row, i) => (
                  <Tr key={`${i}-${row.id}`}>
                    <Td fontWeight="medium" verticalAlign="top">
                      {row.name || '—'}
                    </Td>
                    <Td fontFamily="mono" fontSize="xs" wordBreak="break-all" verticalAlign="top">
                      {row.id || '—'}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        ) : (
          <Box p={6}>
            <Alert status="info" variant="subtle" borderRadius="md">
              <AlertIcon />
              No issuers found. Register one with the admin API (see Settings for environment URLs).
            </Alert>
          </Box>
        )}
      </Box>
    </Stack>
  )
}
