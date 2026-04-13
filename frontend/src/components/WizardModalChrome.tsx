import { Box, Flex, HStack, Text, useColorModeValue } from '@chakra-ui/react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReactNode } from 'react'
import { FiCheck } from 'react-icons/fi'

export type WizardStepMeta = { title: string; subtitle: string }

const MotionBox = motion(Box)

export function WizardHeaderChrome({
  title,
  eyebrow = 'Guided setup',
  steps,
  activeIndex,
}: {
  title: string
  eyebrow?: string
  steps: readonly WizardStepMeta[]
  activeIndex: number
}) {
  const headerBg = useColorModeValue('linear-gradient(135deg, #f8fafc 0%, #f1f5f9 45%, #eef2ff 100%)', 'linear-gradient(135deg, #1e293b 0%, #0f172a 50%, #1e1b4b 100%)')
  const eyebrowColor = useColorModeValue('brand.600', 'brand.300')
  const titleColor = useColorModeValue('gray.800', 'white')
  const subtitleColor = useColorModeValue('gray.600', 'gray.400')
  const railMuted = useColorModeValue('gray.200', 'gray.600')
  const railDone = useColorModeValue('teal.400', 'teal.300')
  const upcomingBg = useColorModeValue('white', 'gray.800')
  const upcomingBorder = useColorModeValue('gray.200', 'gray.600')
  const upcomingColor = useColorModeValue('gray.600', 'gray.400')

  const current = steps[activeIndex]

  return (
    <Box
      px={{ base: 5, md: 8 }}
      pt={6}
      pb={5}
      position="relative"
      bg={headerBg}
      borderTopRadius="2xl"
    >
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="4px"
        bgGradient="linear(to-r, #0ea5e9, #6366f1, #a855f7, #ec4899)"
        borderTopRadius="2xl"
      />
      <Text
        fontSize="10px"
        textTransform="uppercase"
        letterSpacing="0.18em"
        color={eyebrowColor}
        fontWeight="bold"
        mb={1}
      >
        {eyebrow}
      </Text>
      <Text fontSize="xl" fontWeight="extrabold" letterSpacing="-0.03em" color={titleColor} mb={4} lineHeight="short">
        {title}
      </Text>

      <HStack spacing={2} flexWrap="wrap" align="stretch" mb={3}>
        {steps.map((s, i) => {
          const done = i < activeIndex
          const cur = i === activeIndex
          return (
            <Flex key={s.title} align="center" gap={2}>
              <HStack
                spacing={2}
                px={{ base: 2.5, md: 3 }}
                py={2}
                borderRadius="lg"
                borderWidth="1px"
                transition="all 0.2s ease-out"
                borderColor={cur ? 'brand.500' : done ? railDone : upcomingBorder}
                bg={cur ? 'brand.500' : done ? railDone : upcomingBg}
                color={cur || done ? 'white' : upcomingColor}
                boxShadow={cur ? 'md' : 'none'}
                transform={cur ? 'translateY(-1px)' : undefined}
              >
                <Flex
                  align="center"
                  justify="center"
                  w="22px"
                  h="22px"
                  borderRadius="full"
                  bg={cur || done ? 'whiteAlpha.300' : 'gray.100'}
                  _dark={{ bg: cur || done ? 'whiteAlpha.200' : 'gray.700' }}
                >
                  {done ? <FiCheck size={13} strokeWidth={2.5} /> : <Text fontSize="xs" fontWeight="bold">{i + 1}</Text>}
                </Flex>
                <Text fontSize="xs" fontWeight="semibold" display={{ base: 'none', sm: 'inline' }} noOfLines={1}>
                  {s.title}
                </Text>
              </HStack>
              {i < steps.length - 1 ? (
                <Box
                  display={{ base: 'none', md: 'block' }}
                  w="12px"
                  h="3px"
                  borderRadius="full"
                  bg={i < activeIndex ? railDone : railMuted}
                  transition="background 0.25s ease"
                />
              ) : null}
            </Flex>
          )
        })}
      </HStack>

      {current ? (
        <Text fontSize="sm" color={subtitleColor} maxW="2xl" lineHeight="tall">
          {current.subtitle}
        </Text>
      ) : null}
    </Box>
  )
}

export function WizardAnimatedStep({ stepKey, children }: { stepKey: number; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      <MotionBox
        key={stepKey}
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -14 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </MotionBox>
    </AnimatePresence>
  )
}
