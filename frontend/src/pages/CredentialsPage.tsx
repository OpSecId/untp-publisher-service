import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Heading,
  Link,
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
import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiJson } from '../api/client'
import { apiBaseUrl } from '../api/baseUrl'
import type { PublisherCredentialRow, PublisherCredentialsResponse } from '../api/types'

function publicCredentialPageUrl(id: string): string {
  const base = apiBaseUrl().replace(/\/$/, '')
  return `${base}/credentials/${encodeURIComponent(id)}`
}

export function CredentialsPage() {
  const [data, setData] = useState<PublisherCredentialsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cardBg = useColorModeValue('white', 'gray.700')
  const cardBorder = useColorModeValue('gray.100', 'gray.600')
  const muted = useColorModeValue('gray.600', 'gray.400')

  const loadCredentials = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const j = await apiJson<PublisherCredentialsResponse>('/publisher/credentials')
      setData(j)
    } catch (e) {
      setData(null)
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCredentials()
  }, [loadCredentials])

  const rows = data?.credentials ?? []

  return (
    <Stack spacing={6} align="stretch">
      <Box>
        <Heading size="lg" mb={2}>
          Published credentials
        </Heading>
        <Text color={muted} fontSize="sm" maxW="3xl">
          Credentials stored after <code>POST /credentials/publish</code> (summary only — no VC or JWT in this list).
          Open the public viewer for a credential (HTML) via the link in the first column.
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
        ) : rows.length ? (
          <TableContainer overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Credential</Th>
                  <Th>Type</Th>
                  <Th>Entity</Th>
                  <Th>Cardinality</Th>
                  <Th>Status</Th>
                </Tr>
              </Thead>
              <Tbody>
                {rows.map((row: PublisherCredentialRow, i: number) => (
                  <Tr key={`${i}-${row.id}`}>
                    <Td verticalAlign="top" maxW="200px">
                      {row.id ? (
                        <Link
                          href={publicCredentialPageUrl(row.id)}
                          isExternal
                          color="brand.600"
                          fontWeight="medium"
                          fontSize="xs"
                          wordBreak="break-all"
                        >
                          {row.id}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td fontWeight="medium" verticalAlign="top" whiteSpace="nowrap">
                      {row.type || '—'}
                    </Td>
                    <Td fontSize="xs" verticalAlign="top" wordBreak="break-all">
                      {row.entity_id || '—'}
                    </Td>
                    <Td fontSize="xs" verticalAlign="top" wordBreak="break-all">
                      {row.cardinality_id || '—'}
                    </Td>
                    <Td verticalAlign="top">
                      <Stack direction="row" flexWrap="wrap" gap={1}>
                        {row.revocation ? (
                          <Badge colorScheme="red" variant="subtle" size="sm">
                            Revoked
                          </Badge>
                        ) : null}
                        {row.suspension ? (
                          <Badge colorScheme="orange" variant="subtle" size="sm">
                            Suspended
                          </Badge>
                        ) : null}
                        {row.refresh ? (
                          <Badge colorScheme="blue" variant="subtle" size="sm">
                            Refresh
                          </Badge>
                        ) : null}
                        {!row.revocation && !row.suspension ? (
                          <Badge colorScheme="green" variant="subtle" size="sm">
                            Active
                          </Badge>
                        ) : null}
                      </Stack>
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
              No published credentials yet. Publish via <code>POST /credentials/publish</code> or your integration.
            </Alert>
          </Box>
        )}
      </Box>
    </Stack>
  )
}
