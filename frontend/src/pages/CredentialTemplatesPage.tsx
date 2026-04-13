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
  Button,
  Checkbox,
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
  Select,
  Skeleton,
  Spacer,
  Stack,
  Text,
  Textarea,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { WizardAnimatedStep, WizardHeaderChrome } from '../components/WizardModalChrome'
import { ApiError, apiJson } from '../api/client'
import type {
  PublisherCredentialTypeSummary,
  PublisherCredentialTypesResponse,
  PublisherIssuersResponse,
  PublisherRegisterCredentialTypeResponse,
} from '../api/types'

function formatPaths(label: string, data: Record<string, string> | null | undefined): string {
  if (!data || Object.keys(data).length === 0) {
    return ''
  }
  return `${label}:\n${JSON.stringify(data, null, 2)}`
}

const DEFAULT_CORE_ENTITY = '$.credentialSubject.issuedToParty.registeredId'
const DEFAULT_CORE_CARDINALITY = '$.credentialSubject.titleNumber'
const DEFAULT_SUBJECT_PATHS = `{
  "titleNumber": "$.credentialSubject.titleNumber"
}`
const DEFAULT_ADDITIONAL_PATHS = `{
  "wells": "$.credentialSubject.assessment[0].assessedFacility",
  "tracts": "$.credentialSubject.assessment[0].assessedProduct"
}`

/** Initial template version for portal-created credential types. */
const FIXED_CREDENTIAL_VERSION = '0.0.1'
const DIGITAL_CONFORMITY_CREDENTIAL_TYPE = 'DigitalConformityCredential'

const CREATE_WIZARD_STEPS = [
  { title: 'Credential identity', subtitle: 'Digital Conformity Credential and display name' },
  { title: 'Issuing party', subtitle: 'Which registered issuer signs this template' },
  { title: 'Resources & paths', subtitle: 'Context, JSONPaths, and optional DCC paths' },
] as const

export function CredentialTemplatesPage() {
  const toast = useToast()
  const createModal = useDisclosure()
  const [data, setData] = useState<PublisherCredentialTypesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [issuers, setIssuers] = useState<{ id: string; name: string }[]>([])
  const [loadingIssuers, setLoadingIssuers] = useState(false)

  const [credName, setCredName] = useState('')
  const [issuerDid, setIssuerDid] = useState('')
  const [contextUrl, setContextUrl] = useState('')
  const [legalActUrl, setLegalActUrl] = useState('')
  const [governanceUrl, setGovernanceUrl] = useState('')
  const [entityIdPath, setEntityIdPath] = useState(DEFAULT_CORE_ENTITY)
  const [cardinalityIdPath, setCardinalityIdPath] = useState(DEFAULT_CORE_CARDINALITY)
  const [subjectPathsJson, setSubjectPathsJson] = useState(DEFAULT_SUBJECT_PATHS)
  const [includeDcc, setIncludeDcc] = useState(false)
  const [additionalPathsJson, setAdditionalPathsJson] = useState(DEFAULT_ADDITIONAL_PATHS)
  const [submitting, setSubmitting] = useState(false)
  const [createStep, setCreateStep] = useState(0)

  const cardBg = useColorModeValue('white', 'gray.700')
  const cardBorder = useColorModeValue('gray.100', 'gray.600')
  const muted = useColorModeValue('gray.600', 'gray.400')
  const preBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.100')
  const accordionOpenBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.100')
  const readonlyInputBg = useColorModeValue('gray.50', 'gray.600')
  const wizardBodyBg = useColorModeValue('white', 'gray.900')
  const wizardFooterBg = useColorModeValue('gray.50', 'blackAlpha.400')
  const wizardFooterBorder = useColorModeValue('gray.100', 'gray.700')
  const wizardCloseBg = useColorModeValue('blackAlpha.100', 'whiteAlpha.200')
  const wizardCloseHoverBg = useColorModeValue('blackAlpha.200', 'whiteAlpha.300')
  const issuerHintBg = useColorModeValue('gray.50', 'whiteAlpha.50')

  const loadCredentialTypes = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const j = await apiJson<PublisherCredentialTypesResponse>('/publisher/credential-types')
      setData(j)
    } catch (e) {
      setData(null)
      setError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCredentialTypes()
  }, [loadCredentialTypes])

  const loadIssuers = useCallback(async () => {
    setLoadingIssuers(true)
    try {
      const j = await apiJson<PublisherIssuersResponse>('/publisher/issuers')
      setIssuers(j.issuers ?? [])
    } catch {
      setIssuers([])
    } finally {
      setLoadingIssuers(false)
    }
  }, [])

  useEffect(() => {
    if (createModal.isOpen) {
      void loadIssuers()
    }
  }, [createModal.isOpen, loadIssuers])

  const resetCreateForm = useCallback(() => {
    setCredName('')
    setIssuerDid('')
    setContextUrl('')
    setLegalActUrl('')
    setGovernanceUrl('')
    setEntityIdPath(DEFAULT_CORE_ENTITY)
    setCardinalityIdPath(DEFAULT_CORE_CARDINALITY)
    setSubjectPathsJson(DEFAULT_SUBJECT_PATHS)
    setIncludeDcc(false)
    setAdditionalPathsJson(DEFAULT_ADDITIONAL_PATHS)
    setCreateStep(0)
  }, [])

  const openCreateWizard = () => {
    resetCreateForm()
    createModal.onOpen()
  }

  const closeCreateModal = () => {
    createModal.onClose()
    resetCreateForm()
  }

  const goNextStep = () => {
    if (createStep === 0) {
      if (!credName.trim()) {
        toast({ title: 'Name is required', status: 'warning' })
        return
      }
      setCreateStep(1)
      return
    }
    if (createStep === 1) {
      if (!issuerDid.trim()) {
        toast({ title: 'Select or enter an issuer DID', status: 'warning' })
        return
      }
      setCreateStep(2)
    }
  }

  const goPrevStep = () => {
    if (createStep > 0) {
      setCreateStep((s) => s - 1)
    }
  }

  const submitCreate = async () => {
    const t = DIGITAL_CONFORMITY_CREDENTIAL_TYPE
    const v = FIXED_CREDENTIAL_VERSION
    const iss = issuerDid.trim()
    const st = DIGITAL_CONFORMITY_CREDENTIAL_TYPE
    const ctx = contextUrl.trim()
    const desc = credName.trim()
    if (!desc || !iss || !ctx) {
      toast({
        title: 'Complete all wizard steps',
        description: 'Name, issuer, and context URL are required.',
        status: 'warning',
      })
      return
    }
    const ei = entityIdPath.trim()
    const ci = cardinalityIdPath.trim()
    if (!ei || !ci) {
      toast({ title: 'Core path fields are required', status: 'warning' })
      return
    }
    let subjectPaths: Record<string, string>
    try {
      const parsed = JSON.parse(subjectPathsJson) as unknown
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('not an object')
      }
      subjectPaths = parsed as Record<string, string>
    } catch {
      toast({ title: 'Subject paths must be valid JSON object', status: 'warning' })
      return
    }
    let additionalPaths: Record<string, string> | undefined
    if (includeDcc) {
      try {
        const parsed = JSON.parse(additionalPathsJson) as unknown
        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('not an object')
        }
        additionalPaths = parsed as Record<string, string>
      } catch {
        toast({ title: 'Additional paths must be valid JSON object', status: 'warning' })
        return
      }
    }

    const relatedResources: Record<string, string> = { context: ctx }
    const la = legalActUrl.trim()
    const go = governanceUrl.trim()
    if (la) {
      relatedResources.legalAct = la
    }
    if (go) {
      relatedResources.governance = go
    }

    const body: Record<string, unknown> = {
      type: t,
      version: v,
      description: desc,
      issuer: iss,
      corePaths: { entityId: ei, cardinalityId: ci },
      subjectType: st,
      subjectPaths,
      relatedResources,
    }
    if (includeDcc) {
      body.additionalType = 'DigitalConformityCredential'
      body.additionalPaths = additionalPaths
    }

    setSubmitting(true)
    try {
      const res = await apiJson<PublisherRegisterCredentialTypeResponse>('/publisher/credential-types', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      toast({
        title: 'Credential template created',
        description: `${res.type} v${res.version}`,
        status: 'success',
      })
      closeCreateModal()
      await loadCredentialTypes()
    } catch (e) {
      toast({
        title: 'Create failed',
        description: e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Request failed',
        status: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const rows = data?.credential_types ?? []

  return (
    <Stack spacing={6} align="stretch">
      <Box>
        <Heading size="lg" mb={2}>
          Credential templates
        </Heading>
        <Text color={muted} fontSize="sm" maxW="3xl">
          Registered credential types in Mongo (<strong>CredentialTypeRecord</strong>): type, version, issuer, path
          maps, and status list ids. Full VC templates, contexts, OCA bundles, and JSON Schema are omitted here. Use{' '}
          <strong>Create credential template</strong> for the same flow as <code>POST /registrations/credentials</code>,
          authenticated with your portal session.
        </Text>
      </Box>

      <Box>
        <Button colorScheme="brand" size="sm" onClick={openCreateWizard}>
          Create credential template
        </Button>
      </Box>

      <Modal
        isOpen={createModal.isOpen}
        onClose={closeCreateModal}
        size="xl"
        motionPreset="slideInBottom"
        scrollBehavior="inside"
      >
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(6px)" />
        <ModalContent borderRadius="2xl" overflow="hidden" boxShadow="2xl" mx={3}>
          <ModalCloseButton top={4} right={4} zIndex={2} rounded="full" bg={wizardCloseBg} _hover={{ bg: wizardCloseHoverBg }} />
          <WizardHeaderChrome
            title="Create credential template"
            eyebrow="Credential template"
            steps={CREATE_WIZARD_STEPS}
            activeIndex={createStep}
          />
          <ModalBody px={{ base: 5, md: 8 }} py={6} bg={wizardBodyBg}>
            <WizardAnimatedStep stepKey={createStep}>
              <>
                {createStep === 0 ? (
                  <Stack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>Type</FormLabel>
                      <Select
                        value={DIGITAL_CONFORMITY_CREDENTIAL_TYPE}
                        isDisabled
                        size="sm"
                        borderRadius="lg"
                      >
                        <option value={DIGITAL_CONFORMITY_CREDENTIAL_TYPE}>Digital Conformity Credential</option>
                      </Select>
                      <FormHelperText>Additional credential types may be added later.</FormHelperText>
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Name</FormLabel>
                      <Input
                        value={credName}
                        onChange={(e) => setCredName(e.target.value)}
                        placeholder="Display name for this template (stored as the VC name)"
                        size="sm"
                        borderRadius="lg"
                        _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                      />
                      <FormHelperText>Shown on the verifiable credential template and in issuer tooling.</FormHelperText>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Version</FormLabel>
                      <Input
                        value={FIXED_CREDENTIAL_VERSION}
                        isReadOnly
                        size="sm"
                        bg={readonlyInputBg}
                        borderRadius="lg"
                      />
                      <FormHelperText>New templates use version {FIXED_CREDENTIAL_VERSION}.</FormHelperText>
                    </FormControl>
                  </Stack>
                ) : null}
                {createStep === 1 ? (
                  <Stack spacing={4}>
                    <Box
                      fontSize="sm"
                      color={muted}
                      p={4}
                      borderRadius="lg"
                      borderWidth="1px"
                      borderColor={cardBorder}
                      bg={issuerHintBg}
                    >
                      Choose the issuer that will sign credentials of this type. The issuer must already be registered
                      for this publisher.
                    </Box>
                    <FormControl isRequired>
                      <FormLabel>Issuer</FormLabel>
                      {loadingIssuers ? (
                        <Skeleton height="32px" borderRadius="lg" />
                      ) : issuers.length ? (
                        <Select
                          placeholder="Select a registered issuer"
                          value={issuerDid}
                          onChange={(e) => setIssuerDid(e.target.value)}
                          size="sm"
                          borderRadius="lg"
                        >
                          {issuers.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.name || row.id} — {row.id}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Stack spacing={2}>
                          <Alert status="warning" variant="subtle" borderRadius="lg" fontSize="sm">
                            <AlertIcon />
                            No issuers found. Register an issuer first, or enter a DID manually below.
                          </Alert>
                          <Input
                            value={issuerDid}
                            onChange={(e) => setIssuerDid(e.target.value)}
                            placeholder="did:web:…"
                            size="sm"
                            fontFamily="mono"
                            borderRadius="lg"
                            _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                          />
                        </Stack>
                      )}
                    </FormControl>
                  </Stack>
                ) : null}
                {createStep === 2 ? (
                  <Stack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>JSON-LD context URL</FormLabel>
                      <Input
                        value={contextUrl}
                        onChange={(e) => setContextUrl(e.target.value)}
                        placeholder="https://…/context.jsonld"
                        size="sm"
                        borderRadius="lg"
                        _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                      />
                      <FormHelperText>relatedResources.context — fetched when the template is created.</FormHelperText>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Legal act URL (optional)</FormLabel>
                      <Input
                        value={legalActUrl}
                        onChange={(e) => setLegalActUrl(e.target.value)}
                        size="sm"
                        borderRadius="lg"
                        _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel>Governance URL (optional)</FormLabel>
                      <Input
                        value={governanceUrl}
                        onChange={(e) => setGovernanceUrl(e.target.value)}
                        size="sm"
                        borderRadius="lg"
                        _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Core path — entity id (JSONPath)</FormLabel>
                      <Input
                        value={entityIdPath}
                        onChange={(e) => setEntityIdPath(e.target.value)}
                        size="sm"
                        fontFamily="mono"
                        borderRadius="lg"
                        _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Core path — cardinality id (JSONPath)</FormLabel>
                      <Input
                        value={cardinalityIdPath}
                        onChange={(e) => setCardinalityIdPath(e.target.value)}
                        size="sm"
                        fontFamily="mono"
                        borderRadius="lg"
                        _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>Subject paths (JSON object)</FormLabel>
                      <Textarea
                        value={subjectPathsJson}
                        onChange={(e) => setSubjectPathsJson(e.target.value)}
                        size="sm"
                        fontFamily="mono"
                        rows={6}
                        borderRadius="lg"
                        _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                      />
                      <FormHelperText>Map of label → JSONPath strings (credentialSubject fields).</FormHelperText>
                    </FormControl>
                    <FormControl>
                      <Checkbox isChecked={includeDcc} onChange={(e) => setIncludeDcc(e.target.checked)}>
                        Include Digital Conformity Credential (UNTP DCC)
                      </Checkbox>
                      <FormHelperText ml={6} mt={1}>
                        Sets <code>additionalType</code> to DigitalConformityCredential and sends additional paths below.
                      </FormHelperText>
                    </FormControl>
                    {includeDcc ? (
                      <FormControl isRequired>
                        <FormLabel>Additional paths (JSON object)</FormLabel>
                        <Textarea
                          value={additionalPathsJson}
                          onChange={(e) => setAdditionalPathsJson(e.target.value)}
                          size="sm"
                          fontFamily="mono"
                          rows={5}
                          borderRadius="lg"
                          _focusVisible={{ boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                        />
                      </FormControl>
                    ) : null}
                  </Stack>
                ) : null}
              </>
            </WizardAnimatedStep>
          </ModalBody>
          <ModalFooter
            gap={2}
            flexWrap="wrap"
            width="100%"
            borderTopWidth="1px"
            borderColor={wizardFooterBorder}
            bg={wizardFooterBg}
            py={4}
            px={{ base: 5, md: 8 }}
          >
            <Button variant="ghost" onClick={closeCreateModal} isDisabled={submitting}>
              Cancel
            </Button>
            {createStep > 0 ? (
              <Button variant="outline" onClick={goPrevStep} isDisabled={submitting} borderRadius="lg">
                Back
              </Button>
            ) : null}
            <Spacer />
            {createStep < CREATE_WIZARD_STEPS.length - 1 ? (
              <Button colorScheme="brand" onClick={goNextStep} borderRadius="lg" px={6}>
                Next
              </Button>
            ) : (
              <Button colorScheme="brand" onClick={() => void submitCreate()} isLoading={submitting} borderRadius="lg" px={6}>
                Create template
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
        ) : rows.length ? (
          <Accordion allowMultiple reduceMotion>
            {rows.map((row: PublisherCredentialTypeSummary, i: number) => (
              <AccordionItem
                key={`${i}-${row.type}-${row.version}`}
                borderTopWidth={i === 0 ? '0' : '1px'}
                borderColor={cardBorder}
              >
                <AccordionButton px={4} py={3} _expanded={{ bg: accordionOpenBg }}>
                  <Stack align="flex-start" flex="1" spacing={1} textAlign="left">
                    <Text fontWeight="semibold" fontSize="sm">
                      {row.type || '—'}
                      <Text as="span" fontWeight="normal" color={muted} ml={2}>
                        v{row.version || '—'}
                      </Text>
                    </Text>
                    <Text fontSize="xs" fontFamily="mono" wordBreak="break-all" color={muted}>
                      {row.issuer || '—'}
                    </Text>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {row.subject_type ? (
                        <Badge size="sm" colorScheme="blue" variant="subtle">
                          {row.subject_type}
                        </Badge>
                      ) : null}
                      {row.additional_type ? (
                        <Badge size="sm" colorScheme="purple" variant="subtle">
                          {row.additional_type}
                        </Badge>
                      ) : null}
                      {row.status_lists?.length ? (
                        <Badge size="sm" colorScheme="gray" variant="outline">
                          {row.status_lists.length} status list{row.status_lists.length === 1 ? '' : 's'}
                        </Badge>
                      ) : null}
                    </Stack>
                  </Stack>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel px={4} pb={4} pt={0}>
                  <Stack spacing={3}>
                    {row.status_lists?.length ? (
                      <Box>
                        <Text fontSize="xs" fontWeight="semibold" color={muted} mb={1}>
                          Status list ids
                        </Text>
                        <Text fontSize="xs" fontFamily="mono">
                          {row.status_lists.map((x) => String(x)).join(', ')}
                        </Text>
                      </Box>
                    ) : null}
                    {[formatPaths('core_paths', row.core_paths), formatPaths('subject_paths', row.subject_paths)]
                      .filter(Boolean)
                      .map((block, idx) => (
                        <Box
                          key={idx}
                          as="pre"
                          fontSize="xs"
                          p={3}
                          borderRadius="md"
                          bg={preBg}
                          overflow="auto"
                          whiteSpace="pre-wrap"
                        >
                          {block}
                        </Box>
                      ))}
                    {row.additional_paths && Object.keys(row.additional_paths).length > 0 ? (
                      <Box
                        as="pre"
                        fontSize="xs"
                        p={3}
                        borderRadius="md"
                        bg={preBg}
                        overflow="auto"
                        whiteSpace="pre-wrap"
                      >
                        {formatPaths('additional_paths', row.additional_paths)}
                      </Box>
                    ) : null}
                  </Stack>
                </AccordionPanel>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Box p={6}>
            <Alert status="info" variant="subtle" borderRadius="md">
              <AlertIcon />
              No credential types yet. Use <strong>Create credential template</strong> to add one.
            </Alert>
          </Box>
        )}
      </Box>
    </Stack>
  )
}
