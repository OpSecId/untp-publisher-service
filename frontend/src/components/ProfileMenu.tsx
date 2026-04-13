import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  SkeletonCircle,
} from '@chakra-ui/react'
import { useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { toSvg } from 'jdenticon'
import { MdLogout, MdScience, MdSettings } from 'react-icons/md'

const ICON_PX = 36

function ProfileIdenticon({ seed, sizePx }: { seed: string; sizePx: number }) {
  const svg = useMemo(() => toSvg(seed.trim() || 'guest', sizePx), [seed, sizePx])
  return (
    <Box
      boxSize={`${sizePx}px`}
      borderRadius="full"
      overflow="hidden"
      flexShrink={0}
      lineHeight={0}
      dangerouslySetInnerHTML={{ __html: svg }}
      sx={{
        '& > svg': {
          display: 'block',
          width: '100%',
          height: '100%',
        },
      }}
    />
  )
}

type Props = {
  clientId: string | undefined
  loading: boolean
  onSignOut: () => void
}

export function ProfileMenu({ clientId, loading, onSignOut }: Props) {
  return (
    <Menu placement="bottom-end" strategy="fixed">
      <MenuButton
        as={Button}
        variant="ghost"
        px={1}
        py={1}
        minW="unset"
        h="auto"
        borderRadius="full"
        aria-label="Account menu"
        _hover={{ bg: 'blackAlpha.100' }}
        _active={{ bg: 'blackAlpha.200' }}
      >
        {loading ? (
          <SkeletonCircle boxSize="9" startColor="gray.200" endColor="gray.400" />
        ) : (
          <ProfileIdenticon seed={clientId ?? 'guest'} sizePx={ICON_PX} />
        )}
      </MenuButton>
      <MenuList zIndex={20} maxW="sm">
        <MenuItem as={RouterLink} to="/test-suite" icon={<MdScience />}>
          Test suite
        </MenuItem>
        <MenuItem as={RouterLink} to="/settings" icon={<MdSettings />}>
          Settings
        </MenuItem>
        <MenuDivider />
        <MenuItem icon={<MdLogout />} onClick={onSignOut}>
          Sign out
        </MenuItem>
      </MenuList>
    </Menu>
  )
}
