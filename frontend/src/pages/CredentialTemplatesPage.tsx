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
  ModalHeader,
  ModalOverlay,
  Progress,
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

const CREATE_WIZARD_STEPS = [
  { title: 'Description', subtitle: 'What this credential represents' },
  { title: 'Credential identity', subtitle: 'Type string, version, and subject type' },
  { title: 'Issuing party', subtitle: 'Which registered issuer signs this template' },
  { title: 'Resources & paths', subtitle: 'Context, JSONPaths, and optional DCC' },
] as const

export function CredentialTemplatesPage() {
  const toast = useToast()
  const createModal = useDisclosure()
  const [data, setData] = useState<PublisherCredentialTypesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [issuers, setIssuers] = useState<{ id: string; name: string }[]>([])
  const [loadingIssuers, setLoadingIssuers] = useState(false)

  const [credDescription, setCredDescription] = useState('')
  const [credType, setCredType] = useState('')
  const [version, setVersion] = useState('1.0')
  const [issuerDid, setIssuerDid] = useState('')
  const [subjectType, setSubjectType] = useState('')
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
    setCredDescription('')
    setCredType('')
    setVersion('1.0')
    setIssuerDid('')
    setSubjectType('')
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
      if (!credDescription.trim()) {
        toast({ title: 'Description is required', status: 'warning' })
        return
      }
      setCreateStep(1)
      return
    }
    if (createStep === 1) {
      if (!credType.trim() || !version.trim() || !subjectType.trim()) {
        toast({ title: 'Credential type, version, and subject type are required', status: 'warning' })
        return
      }
      setCreateStep(2)
      return
    }
    if (createStep === 2) {
      if (!issuerDid.trim()) {
        toast({ title: 'Select or enter an issuer DID', status: 'warning' })
        return
      }
      setCreateStep(3)
    }
  }

  const goPrevStep = () => {
    if (createStep > 0) {
      setCreateStep((s) => s - 1)
    }
  }

  const submitCreate = async () => {
    const t = credType.trim()
    const v = version.trim()
    const iss = issuerDid.trim()
    const st = subjectType.trim()
    const ctx = contextUrl.trim()
    const desc = credDescription.trim()
    if (!desc || !t || !v || !iss || !st || !ctx) {
      toast({
        title: 'Complete all wizard steps',
        description: 'Description, type, version, issuer, subject type, and context URL are required.',
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
        <ModalOverlay />
        <ModalContent>
          <ModalHeader pb={2}>
            <Stack spacing={2}>
              <Text fontSize="md" fontWeight="semibold">
                Create credential template
              </Text>
              <Stack spacing={1}>
                <Text fontSize="xs" fontWeight="normal" color={muted}>
                  Step {createStep + 1} of {CREATE_WIZARD_STEPS.length} — {CREATE_WIZARD_STEPS[createStep].title}
                </Text>
                <Text fontSize="xs" fontWeight="normal" color={muted}>
                  {CREATE_WIZARD_STEPS[createStep].subtitle}
                </Text>
                <Progress
                  value={((createStep + 1) / CREATE_WIZARD_STEPS.length) * 100}
                  size="xs"
                  colorScheme="brand"
                  borderRadius="sm"
                />
              </Stack>
            </Stack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {createStep === 0 ? (
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={credDescription}
                    onChange={(e) => setCredDescription(e.target.value)}
                    placeholder="Human-readable summary of this credential (shown as the template VC name)"
                    size="sm"
                    rows={5}
                  />
                  <FormHelperText>
                    Explains what is being attested. Technical identifiers and the signing issuer come in the following
                    steps.
                  </FormHelperText>
                </FormControl>
              </Stack>
            ) : null}
            {createStep === 1 ? (
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Credential type</FormLabel>
                  <Input
                    value={credType}
                    onChange={(e) => setCredType(e.target.value)}
                    placeholder="e.g. BCPetroleumAndNaturalGasTitleCredential"
                    size="sm"
                  />
                  <FormHelperText>VC type string appended to the template (PascalCase convention).</FormHelperText>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Version</FormLabel>
                  <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.0" size="sm" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Credential subject type</FormLabel>
                  <Input
                    value={subjectType}
                    onChange={(e) => setSubjectType(e.target.value)}
                    placeholder="PascalCase subject type label"
                    size="sm"
                  />
                  <FormHelperText>Used in <code>credentialSubject.type</code> (distinct from the display description).</FormHelperText>
                </FormControl>
              </Stack>
            ) : null}
            {createStep === 2 ? (
              <Stack spacing={4}>
                <Text fontSize="sm" color={muted}>
                  Choose the issuer that will sign credentials of this type. The issuer must already be registered for
                  this publisher.
                </Text>
                <FormControl isRequired>
                  <FormLabel>Issuer</FormLabel>
                  {loadingIssuers ? (
                    <Skeleton height="32px" borderRadius="md" />
                  ) : issuers.length ? (
                    <Select
                      placeholder="Select a registered issuer"
                      value={issuerDid}
                      onChange={(e) => setIssuerDid(e.target.value)}
                      size="sm"
                    >
                      {issuers.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name || row.id} — {row.id}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Stack spacing={2}>
                      <Alert status="warning" variant="subtle" borderRadius="md" fontSize="sm">
                        <AlertIcon />
                        No issuers found. Register an issuer first, or enter a DID manually below.
                      </Alert>
                      <Input
                        value={issuerDid}
                        onChange={(e) => setIssuerDid(e.target.value)}
                        placeholder="did:web:…"
                        size="sm"
                        fontFamily="mono"
                      />
                    </Stack>
                  )}
                </FormControl>
              </Stack>
            ) : null}
            {createStep === 3 ? (
              <Stack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>JSON-LD context URL</FormLabel>
                  <Input
                    value={contextUrl}
                    onChange={(e) => setContextUrl(e.target.value)}
                    placeholder="https://…/context.jsonld"
                    size="sm"
                  />
                  <FormHelperText>relatedResources.context — fetched when the template is created.</FormHelperText>
                </FormControl>
                <FormControl>
                  <FormLabel>Legal act URL (optional)</FormLabel>
                  <Input value={legalActUrl} onChange={(e) => setLegalActUrl(e.target.value)} size="sm" />
                </FormControl>
                <FormControl>
                  <FormLabel>Governance URL (optional)</FormLabel>
                  <Input value={governanceUrl} onChange={(e) => setGovernanceUrl(e.target.value)} size="sm" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Core path — entity id (JSONPath)</FormLabel>
                  <Input value={entityIdPath} onChange={(e) => setEntityIdPath(e.target.value)} size="sm" fontFamily="mono" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Core path — cardinality id (JSONPath)</FormLabel>
                  <Input
                    value={cardinalityIdPath}
                    onChange={(e) => setCardinalityIdPath(e.target.value)}
                    size="sm"
                    fontFamily="mono"
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
                    />
                  </FormControl>
                ) : null}
              </Stack>
            ) : null}
          </ModalBody>
          <ModalFooter gap={2} flexWrap="wrap" width="100%">
            <Button variant="ghost" onClick={closeCreateModal} isDisabled={submitting}>
              Cancel
            </Button>
            {createStep > 0 ? (
              <Button variant="outline" onClick={goPrevStep} isDisabled={submitting}>
                Back
              </Button>
            ) : null}
            <Spacer />
            {createStep < CREATE_WIZARD_STEPS.length - 1 ? (
              <Button colorScheme="brand" onClick={goNextStep}>
                Next
              </Button>
            ) : (
              <Button colorScheme="brand" onClick={() => void submitCreate()} isLoading={submitting}>
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
