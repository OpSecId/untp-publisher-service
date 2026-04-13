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
  Heading,
  Skeleton,
  Stack,
  Text,
  useColorModeValue,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { ApiError, apiJson } from '../api/client'
import type { PublisherCredentialTypeSummary, PublisherCredentialTypesResponse } from '../api/types'

function formatPaths(label: string, data: Record<string, string> | null | undefined): string {
  if (!data || Object.keys(data).length === 0) {
    return ''
  }
  return `${label}:\n${JSON.stringify(data, null, 2)}`
}

export function CredentialTemplatesPage() {
  const [data, setData] = useState<PublisherCredentialTypesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const cardBg = useColorModeValue('white', 'gray.700')
  const cardBorder = useColorModeValue('gray.100', 'gray.600')
  const muted = useColorModeValue('gray.600', 'gray.400')
  const preBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.100')
  const accordionOpenBg = useColorModeValue('blackAlpha.50', 'whiteAlpha.100')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const j = await apiJson<PublisherCredentialTypesResponse>('/publisher/credential-types')
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

  const rows = data?.credential_types ?? []

  return (
    <Stack spacing={6} align="stretch">
      <Box>
        <Heading size="lg" mb={2}>
          Credential templates
        </Heading>
        <Text color={muted} fontSize="sm" maxW="3xl">
          Registered credential types in Mongo (<strong>CredentialTypeRecord</strong>): type, version, issuer, path
          maps, and status list ids. Full VC templates, contexts, OCA bundles, and JSON Schema are omitted here. Add
          types with the admin API <code>POST /registrations/credentials</code> using <code>X-API-Key</code>.
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
              No credential types found. Register one with <code>POST /registrations/credentials</code> (admin API
              key).
            </Alert>
          </Box>
        )}
      </Box>
    </Stack>
  )
}
