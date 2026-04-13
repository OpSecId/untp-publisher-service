import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
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
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiJson } from '../api/client'
import type { PublisherIssuerRow, PublisherIssuersResponse, PublisherRegisterIssuerResponse } from '../api/types'

export function IssuersPage() {
  const toast = useToast()
  const registerModal = useDisclosure()
  const [data, setData] = useState<PublisherIssuersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [scope, setScope] = useState('')
  const [description, setDescription] = useState('')
  const [multikey, setMultikey] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const cardBg = useColorModeValue('white', 'gray.700')
  const cardBorder = useColorModeValue('gray.100', 'gray.600')
  const muted = useColorModeValue('gray.600', 'gray.400')

  const resetRegisterForm = useCallback(() => {
    setName('')
    setDisplayName('')
    setScope('')
    setDescription('')
    setMultikey('')
  }, [])

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

  const closeRegisterModal = () => {
    registerModal.onClose()
    resetRegisterForm()
  }

  const submitRegister = async () => {
    const n = name.trim()
    const s = scope.trim()
    const d = description.trim()
    if (!n || !s || !d) {
      toast({ title: 'Name, scope, and description are required', status: 'warning' })
      return
    }
    const body: Record<string, string> = { name: n, scope: s, description: d }
    const disp = displayName.trim()
    if (disp) {
      body.display_name = disp
    }
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
      closeRegisterModal()
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

      <Box>
        <Button colorScheme="brand" size="sm" onClick={registerModal.onOpen}>
          Register issuer
        </Button>
      </Box>

      <Modal isOpen={registerModal.isOpen} onClose={closeRegisterModal} size="lg" motionPreset="slideInBottom">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Register issuer</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Name</FormLabel>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Short identifier (DID path segment)"
                  size="sm"
                />
                <FormHelperText>Used with scope to build the DID namespace slug.</FormHelperText>
              </FormControl>
              <FormControl>
                <FormLabel>Display name</FormLabel>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Human-readable label for lists and DID document"
                  size="sm"
                />
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
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button variant="ghost" onClick={closeRegisterModal} isDisabled={submitting}>
              Cancel
            </Button>
            <Button colorScheme="brand" onClick={() => void submitRegister()} isLoading={submitting}>
              Register issuer
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

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
              No issuers yet. Use <strong>Register issuer</strong> to add one.
            </Alert>
          </Box>
        )}
      </Box>
    </Stack>
  )
}
