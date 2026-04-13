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
  ModalOverlay,
  Skeleton,
  Spacer,
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
import { WizardAnimatedStep, WizardHeaderChrome } from '../components/WizardModalChrome'
import { ApiError, apiJson } from '../api/client'
import type { PublisherIssuerRow, PublisherIssuersResponse, PublisherRegisterIssuerResponse } from '../api/types'

const REGISTER_WIZARD_STEPS = [
  { title: 'Description', subtitle: 'What this issuer represents' },
  { title: 'Name & scope', subtitle: 'Identifiers for the DID path' },
  { title: 'Delegated key', subtitle: 'Optional external signing key' },
] as const

export function IssuersPage() {
  const toast = useToast()
  const registerModal = useDisclosure()
  const [data, setData] = useState<PublisherIssuersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [scope, setScope] = useState('')
  const [description, setDescription] = useState('')
  const [multikey, setMultikey] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [registerStep, setRegisterStep] = useState(0)

  const cardBg = useColorModeValue('white', 'gray.700')
  const cardBorder = useColorModeValue('gray.100', 'gray.600')
  const muted = useColorModeValue('gray.600', 'gray.400')
  const wizardBodyBg = useColorModeValue('white', 'gray.900')
  const wizardFooterBg = useColorModeValue('gray.50', 'blackAlpha.400')
  const wizardFooterBorder = useColorModeValue('gray.100', 'gray.700')
  const wizardCloseBg = useColorModeValue('blackAlpha.100', 'whiteAlpha.200')
  const wizardCloseHoverBg = useColorModeValue('blackAlpha.200', 'whiteAlpha.300')
  const wizardCalloutBg = useColorModeValue('gray.50', 'whiteAlpha.50')

  const resetRegisterForm = useCallback(() => {
    setName('')
    setScope('')
    setDescription('')
    setMultikey('')
    setRegisterStep(0)
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

  const openRegisterWizard = () => {
    resetRegisterForm()
    registerModal.onOpen()
  }

  const goNextStep = () => {
    if (registerStep === 0) {
      if (!description.trim()) {
        toast({ title: 'Description is required', status: 'warning' })
        return
      }
      setRegisterStep(1)
      return
    }
    if (registerStep === 1) {
      if (!name.trim() || !scope.trim()) {
        toast({ title: 'Name and scope are required', status: 'warning' })
        return
      }
      setRegisterStep(2)
    }
  }

  const goPrevStep = () => {
    if (registerStep > 0) {
      setRegisterStep((s) => s - 1)
    }
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
          browser). MongoDB writes use the <strong>MONGO_APP_DATABASE</strong> name (default{' '}
          <strong>untp-publisher</strong>), collection <code>IssuerRecord</code> — not necessarily the database in your{' '}
          <code>MONGO_URL</code> path.
          The resolved name is shown under <strong>Settings → Server environment → MongoDB app database</strong>.
        </Text>
      </Box>

      <Box>
        <Button colorScheme="brand" size="sm" onClick={openRegisterWizard}>
          Register issuer
        </Button>
      </Box>

      <Modal isOpen={registerModal.isOpen} onClose={closeRegisterModal} size="xl" motionPreset="slideInBottom">
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(6px)" />
        <ModalContent
          borderRadius="2xl"
          overflow="hidden"
          boxShadow="2xl"
          mx={3}
          display="flex"
          flexDirection="column"
          h="560px"
          maxH="90vh"
        >
          <ModalCloseButton top={4} right={4} zIndex={2} rounded="full" bg={wizardCloseBg} _hover={{ bg: wizardCloseHoverBg }} />
          <WizardHeaderChrome title="Register issuer" steps={REGISTER_WIZARD_STEPS} activeIndex={registerStep} />
          <ModalBody flex="1" minH={0} overflowY="auto" px={{ base: 5, md: 8 }} py={6} bg={wizardBodyBg}>
            <WizardAnimatedStep stepKey={registerStep}>
              <>
                {registerStep === 0 ? (
                  <Stack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Description</FormLabel>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Human-readable description of this issuer’s role or authority"
                        size="sm"
                        rows={5}
                        borderRadius="lg"
                        _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                      />
                      <FormHelperText>
                        Stored on the DID document and helps others understand who this issuer is. You can refine
                        technical identifiers in the next step.
                      </FormHelperText>
                    </FormControl>
                  </Stack>
                ) : null}
                {registerStep === 1 ? (
                  <Stack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Name</FormLabel>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Short identifier (DID path segment)"
                        size="sm"
                        borderRadius="lg"
                        _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                      />
                      <FormHelperText>Used with scope to build the DID namespace slug.</FormHelperText>
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Scope</FormLabel>
                      <Input
                        value={scope}
                        onChange={(e) => setScope(e.target.value)}
                        placeholder="e.g. Petroleum and Natural Gas Act"
                        size="sm"
                        borderRadius="lg"
                        _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                      />
                      <FormHelperText>Legal or programme scope (used for DID namespace slug)</FormHelperText>
                    </FormControl>
                  </Stack>
                ) : null}
                {registerStep === 2 ? (
                  <Stack spacing={4}>
                    <Box
                      fontSize="sm"
                      color={muted}
                      p={4}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor={cardBorder}
                      bg={wizardCalloutBg}
                    >
                      By default the publisher provisions the primary signing key in Traction. If you also use an
                      externally managed key, add its multikey here so it can be registered as a delegated verification
                      method on the DID document.
                    </Box>
                    <FormControl>
                      <FormLabel>Delegated multikey (optional)</FormLabel>
                      <Input
                        value={multikey}
                        onChange={(e) => setMultikey(e.target.value)}
                        placeholder="z6Mk… (additional issuing key)"
                        size="sm"
                        fontFamily="mono"
                        borderRadius="lg"
                        _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                      />
                      <FormHelperText>Leave blank to use only the publisher-provisioned key.</FormHelperText>
                    </FormControl>
                  </Stack>
                ) : null}
              </>
            </WizardAnimatedStep>
          </ModalBody>
          <ModalFooter
            flexShrink={0}
            gap={2}
            flexWrap="wrap"
            width="100%"
            borderTopWidth="1px"
            borderColor={wizardFooterBorder}
            bg={wizardFooterBg}
            py={4}
            px={{ base: 5, md: 8 }}
          >
            <Button variant="ghost" onClick={closeRegisterModal} isDisabled={submitting}>
              Cancel
            </Button>
            {registerStep > 0 ? (
              <Button variant="outline" onClick={goPrevStep} isDisabled={submitting} borderRadius="lg">
                Back
              </Button>
            ) : null}
            <Spacer />
            {registerStep < REGISTER_WIZARD_STEPS.length - 1 ? (
              <Button colorScheme="brand" onClick={goNextStep} borderRadius="lg" px={6}>
                Next
              </Button>
            ) : (
              <Button colorScheme="brand" onClick={() => void submitRegister()} isLoading={submitting} borderRadius="lg" px={6}>
                Register issuer
              </Button>
            )}
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
