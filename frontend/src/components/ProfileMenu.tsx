import {
  Avatar,
  Button,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  SkeletonCircle,
  Text,
} from '@chakra-ui/react'
import { MdLogout } from 'react-icons/md'

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
          <Avatar size="sm" name={clientId ?? 'Publisher'} bg="brand.500" color="white" />
        )}
      </MenuButton>
      <MenuList zIndex={20} maxW="sm">
        {clientId ? (
          <>
            <Text px={3} py={2} fontSize="xs" color="gray.500" fontFamily="mono" noOfLines={3} title={clientId}>
              {clientId}
            </Text>
            <MenuDivider />
          </>
        ) : null}
        <MenuItem icon={<MdLogout />} onClick={onSignOut}>
          Sign out
        </MenuItem>
      </MenuList>
    </Menu>
  )
}
