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
  Tooltip,
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
  HiCheckCircle,
  HiXCircle,
} from 'react-icons/hi';
import { useRouter } from 'next/navigation';
import { Lead } from '@/shared/types';
import { useRoleBasedAccess } from '@/shared/hooks/useRoleBasedAccess';

interface QuickActionsMenuProps {
  lead: Lead;
  userRole?: string;
  onAssign?: (lead: { id: string; name: string }) => void;
  onConvertUnreachable?: (lead: { id: string; name: string }) => void;
  onConvertUnqualified?: (lead: { id: string; name: string }) => void;
  onMarkAsWon?: (lead: { id: string; name: string }) => void;
  onMarkAsLost?: (lead: { id: string; name: string }) => void;
  onLogCall?: (lead: { id: string; name: string; phone: string }) => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'solid';
}

export default function QuickActionsMenu({
  lead,
  userRole,
  onAssign,
  onConvertUnreachable,
  onConvertUnqualified,
  onMarkAsWon,
  onMarkAsLost,
  onLogCall,
  size = 'sm',
  variant = 'ghost',
}: QuickActionsMenuProps) {
  const router = useRouter();
  const { hasPermission } = useRoleBasedAccess();

  // Check role-based permissions
  const canAssignLeads = hasPermission('canAssignLeads');
  const canUpdateLead = hasPermission('canUpdateOwnLead');
  const canLogCallPermission = hasPermission('canLogCall');

  const handleViewDetails = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    router.push(`/dashboard/leads/${lead.id}`);
  };

  const handleEditLead = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (canUpdateLead) {
      router.push(`/dashboard/leads/${lead.id}/edit`);
    }
  };

  const handleLogCall = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (canLogCallPermission) {
      if (onLogCall) {
        onLogCall({ id: lead.id, name: lead.name, phone: lead.phone });
      } else {
        router.push(`/dashboard/leads/${lead.id}/call`);
      }
    }
  };

  const handleScheduleFollowup = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    router.push(`/dashboard/leads/${lead.id}/followup`);
  };

  const handleAssign = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (canAssignLeads && onAssign) {
      onAssign({ id: lead.id, name: lead.name });
    }
  };

  return (
    <Menu isLazy>
      <Tooltip label="Quick Actions" placement="top" hasArrow>
        <MenuButton
          as={IconButton}
          icon={<HiDotsVertical />}
          variant={variant}
          size={size}
          aria-label="Quick Actions"
          onClick={(e) => e.stopPropagation()}
          _hover={{ bg: 'gray.100' }}
          _active={{ bg: 'gray.200' }}
        />
      </Tooltip>
      <Portal>
        <MenuList 
          zIndex={1500} 
          boxShadow="lg"
          borderWidth="1px"
          borderColor="gray.200"
          minW="200px"
        >
          {/* View & Edit Actions */}
          <Tooltip label="View full lead details" placement="left" hasArrow>
            <MenuItem 
              icon={<HiEye />} 
              onClick={handleViewDetails}
              fontSize="sm"
              _hover={{ bg: 'blue.50' }}
            >
              View Details
            </MenuItem>
          </Tooltip>
          
          {canUpdateLead && (
            <Tooltip label="Edit lead information" placement="left" hasArrow>
              <MenuItem 
                icon={<HiPencil />} 
                onClick={handleEditLead}
                fontSize="sm"
                _hover={{ bg: 'blue.50' }}
              >
                Edit
              </MenuItem>
            </Tooltip>
          )}
          
          <MenuDivider />
          
          {/* Communication Actions */}
          {canLogCallPermission && (
            <Tooltip label="Log a call with this lead" placement="left" hasArrow>
              <MenuItem 
                icon={<HiPhone />} 
                onClick={handleLogCall}
                fontSize="sm"
                _hover={{ bg: 'green.50' }}
              >
                Log Call
              </MenuItem>
            </Tooltip>
          )}
          
          <Tooltip label="Schedule a follow-up" placement="left" hasArrow>
            <MenuItem 
              icon={<HiClock />} 
              onClick={handleScheduleFollowup}
              fontSize="sm"
              _hover={{ bg: 'orange.50' }}
            >
              Schedule Follow-up
            </MenuItem>
          </Tooltip>
          
          {/* Assignment Action */}
          {canAssignLeads && onAssign && (
            <>
              <MenuDivider />
              <Tooltip label="Assign or reassign this lead" placement="left" hasArrow>
                <MenuItem
                  icon={<HiUserAdd />}
                  onClick={handleAssign}
                  fontSize="sm"
                  _hover={{ bg: 'purple.50' }}
                >
                  Assign/Reassign
                </MenuItem>
              </Tooltip>
            </>
          )}
          
          {/* Status Change Actions */}
          <MenuDivider />
          
          {lead.status !== 'won' && onMarkAsWon && (
            <Tooltip label="Mark this lead as won" placement="left" hasArrow>
              <MenuItem
                icon={<HiCheckCircle />}
                color="green.600"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsWon({ id: lead.id, name: lead.name });
                }}
                fontSize="sm"
                _hover={{ bg: 'green.50' }}
              >
                Mark as Won
              </MenuItem>
            </Tooltip>
          )}
          
          {lead.status !== 'lost' && onMarkAsLost && (
            <Tooltip label="Mark this lead as lost" placement="left" hasArrow>
              <MenuItem
                icon={<HiXCircle />}
                color="red.600"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsLost({ id: lead.id, name: lead.name });
                }}
                fontSize="sm"
                _hover={{ bg: 'red.50' }}
              >
                Mark as Lost
              </MenuItem>
            </Tooltip>
          )}
          
          {lead.status !== 'unreach' && onConvertUnreachable && (
            <Tooltip label="Mark as unreachable" placement="left" hasArrow>
              <MenuItem
                icon={<HiBan />}
                color="orange.600"
                onClick={(e) => {
                  e.stopPropagation();
                  onConvertUnreachable({ id: lead.id, name: lead.name });
                }}
                fontSize="sm"
                _hover={{ bg: 'orange.50' }}
              >
                Mark Unreachable
              </MenuItem>
            </Tooltip>
          )}
          
          {lead.status !== 'unqualified' && onConvertUnqualified && (
            <Tooltip label="Mark as unqualified" placement="left" hasArrow>
              <MenuItem
                icon={<HiX />}
                color="purple.600"
                onClick={(e) => {
                  e.stopPropagation();
                  onConvertUnqualified({ id: lead.id, name: lead.name });
                }}
                fontSize="sm"
                _hover={{ bg: 'purple.50' }}
              >
                Mark Unqualified
              </MenuItem>
            </Tooltip>
          )}
        </MenuList>
      </Portal>
    </Menu>
  );
}





