import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Heading,
  HStack,
  Spinner,
  Stack,
  Text,
  Textarea,
  useToast,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiFetch } from '../api/client'
import type { TestSuiteValidateResponse } from '../api/types'

const SAMPLE_PATH = `${import.meta.env.BASE_URL}samples/conformity-credential-instance.json`

async function loadDefaultSample(): Promise<string> {
  const r = await fetch(SAMPLE_PATH)
  if (!r.ok) {
    throw new Error(`Could not load sample (${r.status})`)
  }
  const data: unknown = await r.json()
  return JSON.stringify(data, null, 2)
}

export function TestSuitePage() {
  const toast = useToast()
  const [jsonText, setJsonText] = useState('')
  const [sampleLoading, setSampleLoading] = useState(true)
  const [validating, setValidating] = useState(false)
  const [result, setResult] = useState<TestSuiteValidateResponse | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)

  const resetSample = useCallback(async () => {
    setSampleLoading(true)
    setRequestError(null)
    setResult(null)
    try {
      const t = await loadDefaultSample()
      setJsonText(t)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load sample'
      toast({ title: msg, status: 'error' })
      setJsonText('')
    } finally {
      setSampleLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void resetSample()
  }, [resetSample])

  const runValidate = async () => {
    setRequestError(null)
    setResult(null)
    let body: unknown
    try {
      body = JSON.parse(jsonText) as unknown
    } catch {
      toast({ title: 'Invalid JSON', description: 'Fix the editor content and try again.', status: 'warning' })
      return
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      toast({ title: 'Expected a JSON object', status: 'warning' })
      return
    }
    setValidating(true)
    try {
      const res = await apiFetch('/test-suite/validate', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      const text = await res.text()
      if (!res.ok) {
        let message = res.statusText || 'Request failed'
        try {
          const j = JSON.parse(text) as { detail?: unknown }
          if (j.detail !== undefined) {
            message = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail)
          }
        } catch {
          /* keep */
        }
        throw new ApiError(message, res.status, text)
      }
      setResult(JSON.parse(text) as TestSuiteValidateResponse)
    } catch (e) {
      setRequestError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Request failed')
    } finally {
      setValidating(false)
    }
  }

  return (
    <Stack spacing={6} align="stretch">
      <Box>
        <Heading size="lg" mb={2}>
          Test suite
        </Heading>
        <Text color="gray.600" _dark={{ color: 'gray.400' }} fontSize="sm" maxW="3xl">
          Run the same UNTP checks as <code>POST /test-suite/validate</code> (JSON Schema, JSON-LD, Pydantic). The
          editor loads a bundled v0.7.0 Digital Conformity Credential sample; replace it with your own JSON object.
        </Text>
      </Box>

      <HStack spacing={3} flexWrap="wrap">
        <Button size="sm" variant="outline" onClick={() => void resetSample()} isDisabled={sampleLoading}>
          Reset to sample
        </Button>
        <Button size="sm" colorScheme="brand" onClick={() => void runValidate()} isLoading={validating}>
          Run validation
        </Button>
        {sampleLoading && (
          <HStack>
            <Spinner size="sm" />
            <Text fontSize="sm" color="gray.500">
              Loading sample…
            </Text>
          </HStack>
        )}
      </HStack>

      <Textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        fontFamily="mono"
        fontSize="sm"
        minH="320px"
        isDisabled={sampleLoading}
        placeholder="{}"
      />

      {requestError && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {requestError}
        </Alert>
      )}

      {result && (
        <Stack spacing={3} align="stretch">
          <HStack spacing={2} flexWrap="wrap">
            <Badge colorScheme={result.success ? 'green' : 'red'} fontSize="0.8em">
              {result.success ? 'success' : 'failed'}
            </Badge>
            {result.artefact_kind != null && (
              <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                artefact_kind: <code>{result.artefact_kind}</code>
              </Text>
            )}
          </HStack>
          {result.error && (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              {result.error}
            </Alert>
          )}
          <Box
            as="pre"
            p={4}
            borderRadius="md"
            borderWidth="1px"
            fontSize="xs"
            overflow="auto"
            maxH="420px"
            bg="blackAlpha.50"
            _dark={{ bg: 'whiteAlpha.100' }}
          >
            {JSON.stringify(result.validation_checks, null, 2)}
          </Box>
        </Stack>
      )}
    </Stack>
  )
}
