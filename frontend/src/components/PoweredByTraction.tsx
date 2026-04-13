import { Box, HStack, Image, Link, Text, useColorModeValue, type SpaceProps } from '@chakra-ui/react'

const TRACTION_REPO = 'https://github.com/bcgov/traction'

type Props = {
  /** Horizontal alignment of the row. */
  justify?: 'flex-start' | 'center' | 'flex-end'
} & Pick<SpaceProps, 'mb' | 'mt'>

/** Attribution row using the Traction wordmark from bcgov/traction tenant-ui. */
export function PoweredByTraction({ justify = 'center', mb, mt }: Props) {
  const labelColor = useColorModeValue('gray.600', 'gray.400')
  const logoOpacity = useColorModeValue(1, 0.95)

  return (
    <Link
      href={TRACTION_REPO}
      isExternal
      aria-label="Traction — open on GitHub"
      mb={mb}
      mt={mt}
      _hover={{ textDecoration: 'none', opacity: 0.92 }}
    >
      <HStack spacing={2.5} justify={justify} align="center" flexWrap="wrap">
        <Text fontSize="xs" fontWeight="600" color={labelColor} letterSpacing="0.02em">
          Powered by
        </Text>
        <Box lineHeight={0} opacity={logoOpacity}>
          <Image
            src="/traction-logo.svg"
            alt="Traction"
            h={{ base: '18px', md: '22px' }}
            w="auto"
            maxW="140px"
            objectFit="contain"
            draggable={false}
          />
        </Box>
      </HStack>
    </Link>
  )
}
