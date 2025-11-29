'use client';

import {
  Box,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Text,
  useDisclosure,
  Portal,
} from '@chakra-ui/react';
import {
  HiDotsVertical,
  HiEye,
  HiPencil,
  HiPhone,
  HiClock,
  HiUserAdd,
  HiBan,
  HiX,
} from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { Lead } from '@/shared/types';

interface QuickActionsMenuProps {
  lead: Lead;
  userRole?: string;
  onAssign?: (lead: { id: string; name: string }) => void;
  onConvertUnreachable?: (lead: { id: string; name: string }) => void;
  onConvertUnqualified?: (lead: { id: string; name: string }) => void;
}

export default function QuickActionsMenu({
  lead,
  userRole,
  onAssign,
  onConvertUnreachable,
  onConvertUnqualified,
}: QuickActionsMenuProps) {
  const router = useRouter();

  const handleViewDetails = () => {
    router.push(`/dashboard/leads/${lead.id}`);
  };

  const handleEditLead = () => {
    router.push(`/dashboard/leads/${lead.id}/edit`);
  };

  const handleLogCall = () => {
    router.push(`/dashboard/leads/${lead.id}/call`);
  };

  const handleScheduleFollowup = () => {
    router.push(`/dashboard/leads/${lead.id}/followup`);
  };

  return (
    <Menu>
      <MenuButton
        as={IconButton}
        icon={<HiDotsVertical />}
        variant="ghost"
        size="sm"
        aria-label="Actions"
      />
      <Portal>
        <MenuList zIndex={10}>
          <MenuItem icon={<HiEye />} onClick={handleViewDetails}>
            View Details
          </MenuItem>
          <MenuItem icon={<HiPencil />} onClick={handleEditLead}>
            Edit Lead
          </MenuItem>
          <MenuDivider />
          <MenuItem icon={<HiPhone />} onClick={handleLogCall}>
            Log Call
          </MenuItem>
          <MenuItem icon={<HiClock />} onClick={handleScheduleFollowup}>
            Schedule Follow-up
          </MenuItem>
          {userRole === 'SuperAgent' && onAssign && (
            <>
              <MenuDivider />
              <MenuItem
                icon={<HiUserAdd />}
                onClick={() => onAssign({ id: lead.id, name: lead.name })}
              >
                Assign Lead
              </MenuItem>
            </>
          )}
          {lead.status !== 'unreach' && onConvertUnreachable && (
            <>
              <MenuDivider />
              <MenuItem
                icon={<HiBan />}
                color="orange.500"
                onClick={() => onConvertUnreachable({ id: lead.id, name: lead.name })}
              >
                Mark as Unreachable
              </MenuItem>
            </>
          )}
          {lead.status !== 'unqualified' && onConvertUnqualified && (
            <MenuItem
              icon={<HiX />}
              color="red.500"
              onClick={() => onConvertUnqualified({ id: lead.id, name: lead.name })}
            >
              Mark as Unqualified
            </MenuItem>
          )}
        </MenuList>
      </Portal>
    </Menu>
  );
}





