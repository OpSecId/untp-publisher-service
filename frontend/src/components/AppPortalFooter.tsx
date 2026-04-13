import { Box, Flex, HStack, Image, Link, Text, useColorModeValue } from '@chakra-ui/react'
import { BC_THEME_CONFIG } from '../config/bcThemeColors'
import { PoweredByTraction } from './PoweredByTraction'

/** Bottom padding for main shell so fixed footer does not cover content. */
export const APP_PORTAL_FOOTER_RESERVED = '4.75rem'

export function AppPortalFooter() {
  const year = new Date().getFullYear()
  const bg = useColorModeValue('rgba(255,255,255,0.96)', 'rgba(23,25,35,0.96)')
  const border = useColorModeValue('gray.200', 'whiteAlpha.200')
  const muted = useColorModeValue('gray.600', 'gray.400')
  const blur = BC_THEME_CONFIG.appChrome.backdropBlur

  return (
    <Box
      as="footer"
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      zIndex={15}
      borderTopWidth="1px"
      borderColor={border}
      bg={bg}
      backdropFilter={blur}
      sx={{ WebkitBackdropFilter: blur }}
      px={{ base: 4, md: 8 }}
      py={3}
      pb={`calc(0.75rem + env(safe-area-inset-bottom, 0px))`}
    >
      <Flex
        direction={{ base: 'column', sm: 'row' }}
        align={{ base: 'stretch', sm: 'center' }}
        justify="space-between"
        gap={4}
        rowGap={3}
        w="full"
      >
        <HStack spacing={3} align="center" flexWrap="wrap" flexShrink={0}>
          <Link href="https://www.gov.bc.ca/" isExternal display="block" lineHeight={0} aria-label="Government of British Columbia">
            <Image
              src="/bc-gov-wordmark.svg"
              alt=""
              h={{ base: '32px', md: '36px' }}
              w="auto"
              maxW={{ base: '200px', md: '240px' }}
              objectFit="contain"
              draggable={false}
            />
          </Link>
          <Text fontSize="xs" color={muted} whiteSpace="nowrap">
            © {year} Government of British Columbia
          </Text>
        </HStack>
        <Box flexShrink={0} alignSelf={{ base: 'flex-end', sm: 'auto' }}>
          <PoweredByTraction justify="flex-end" />
        </Box>
      </Flex>
    </Box>
  )
}
