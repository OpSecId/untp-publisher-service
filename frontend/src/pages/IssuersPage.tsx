import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Skeleton,
  Stack,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiJson } from '../api/client'
import type { PublisherIssuerRow, PublisherIssuersResponse, PublisherRegisterIssuerResponse } from '../api/types'

export function IssuersPage() {
  const toast = useToast()
  const [data, setData] = useState<PublisherIssuersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [scope, setScope] = useState('')
  const [description, setDescription] = useState('')
  const [multikey, setMultikey] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const cardBg = useColorModeValue('white', 'gray.700')
  const cardBorder = useColorModeValue('gray.100', 'gray.600')
  const muted = useColorModeValue('gray.600', 'gray.400')

  const loadIssuers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const j = await apiJson<PublisherIssuersResponse>('/publisher/issuers')
      setData(j)
    } catch (e) {
      setData(null)
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadIssuers()
  }, [loadIssuers])

  const submitRegister = async () => {
    const n = name.trim()
    const s = scope.trim()
    const d = description.trim()
    if (!n || !s || !d) {
      toast({ title: 'Name, scope, and description are required', status: 'warning' })
      return
    }
    const body: Record<string, string> = { name: n, scope: s, description: d }
    const mk = multikey.trim()
    if (mk) {
      body.multikey = mk
    }
    setSubmitting(true)
    try {
      const res = await apiJson<PublisherRegisterIssuerResponse>('/publisher/issuers', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      toast({ title: 'Issuer registered', description: res.id, status: 'success' })
      setName('')
      setScope('')
      setDescription('')
      setMultikey('')
      await loadIssuers()
    } catch (e) {
      toast({
        title: 'Registration failed',
        description: e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Request failed',
        status: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Stack spacing={6} align="stretch">
      <Box>
        <Heading size="lg" mb={2}>
          Issuers
        </Heading>
        <Text color={muted} fontSize="sm" maxW="3xl">
          Registered issuers (DID and name). Use <strong>Register issuer</strong> to provision a DID on the configured
          Web server, bind keys in Traction, and store the issuer record — same flow as{' '}
          <code>POST /registrations/issuers</code>, but with your portal session (no separate API key in the
          browser).
        </Text>
      </Box>

      <Box bg={cardBg} borderWidth="1px" borderColor={cardBorder} borderRadius="lg" p={{ base: 4, md: 6 }}>
        <Heading size="sm" mb={4}>
          Register issuer
        </Heading>
        <Stack spacing={4} maxW="lg">
          <FormControl isRequired>
            <FormLabel>Name</FormLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" size="sm" />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Scope</FormLabel>
            <Input
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              placeholder="Legal or programme scope (used for DID namespace slug)"
              size="sm"
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Description</FormLabel>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Human-readable description"
              size="sm"
              rows={3}
            />
          </FormControl>
          <FormControl>
            <FormLabel>Delegated multikey (optional)</FormLabel>
            <Input
              value={multikey}
              onChange={(e) => setMultikey(e.target.value)}
              placeholder="z6Mk… (additional issuing key)"
              size="sm"
              fontFamily="mono"
            />
          </FormControl>
          <Button colorScheme="brand" size="sm" w="fit-content" onClick={() => void submitRegister()} isLoading={submitting}>
            Register issuer
          </Button>
        </Stack>
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
                {data.issuers.map((row: PublisherIssuerRow, i: number) => (
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
              No issuers yet. Use the form above to register one.
            </Alert>
          </Box>
        )}
      </Box>
    </Stack>
  )
}
