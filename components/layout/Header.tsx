'use client';

import {
  Box,
  Flex,
  Text,
  IconButton,
  useColorModeValue,
  Button,
  useBreakpointValue,
  HStack,
  Tooltip,
  Badge,
} from '@chakra-ui/react';
import { FiLogOut, FiRotateCcw, FiMenu } from 'react-icons/fi';
import { signOut } from 'next-auth/react';
import NotificationBell from '@/components/NotificationBell';
import { useUndo } from '@/lib/hooks/useUndo';
import { useEffect, useState } from 'react';

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const isMobile = useBreakpointValue({ base: true, lg: false });
  
  const { 
    undoAvailable, 
    latestAction, 
    isUndoing, 
    performUndo, 
    getTimeRemaining,
    formatActionName,
  } = useUndo();

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (undoAvailable) {
      const updateTimer = () => {
        setTimeLeft(getTimeRemaining());
      };
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [undoAvailable, getTimeRemaining]);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' });
  };

  return (
    <Box bg={bgColor} borderBottom="1px" borderColor={borderColor} px={{ base: 4, md: 6 }} py={{ base: 3, md: 4 }}>
      <Flex justify="space-between" align="center">
        <HStack spacing={3}>
          {isMobile && (
            <IconButton
              icon={<FiMenu />}
              variant="ghost"
              onClick={onMenuClick}
              aria-label="Open menu"
              size="md"
            />
          )}
          <Text fontSize={{ base: 'md', md: 'lg' }} fontWeight="600" display={{ base: 'none', sm: 'block' }}>
            Welcome back!
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="brand.500" display={{ base: 'block', sm: 'none' }}>
            E2W
          </Text>
        </HStack>

        <Flex align="center" gap={{ base: 2, md: 3 }}>
          {/* Undo Button */}
          {undoAvailable && (
            <>
              <Tooltip
                label={
                  latestAction 
                    ? `Undo: ${formatActionName(latestAction.action)} (${timeLeft}s)`
                    : 'Undo last action'
                }
                placement="bottom"
              >
                <Button
                  leftIcon={<FiRotateCcw />}
                  size="sm"
                  variant="solid"
                  colorScheme="orange"
                  onClick={performUndo}
                  isLoading={isUndoing}
                  display={{ base: 'none', md: 'flex' }}
                  position="relative"
                >
                  Undo
                  {timeLeft > 0 && timeLeft <= 10 && (
                    <Badge
                      ml={2}
                      colorScheme="red"
                      fontSize="xs"
                      borderRadius="full"
                    >
                      {timeLeft}s
                    </Badge>
                  )}
                </Button>
              </Tooltip>
              <Tooltip
                label={
                  latestAction 
                    ? `Undo: ${formatActionName(latestAction.action)} (${timeLeft}s)`
                    : 'Undo last action'
                }
                placement="bottom"
              >
                <IconButton
                  icon={<FiRotateCcw />}
                  size="sm"
                  variant="solid"
                  colorScheme="orange"
                  onClick={performUndo}
                  isLoading={isUndoing}
                  aria-label="Undo"
                  display={{ base: 'flex', md: 'none' }}
                />
              </Tooltip>
            </>
          )}

          {/* Notifications Bell */}
          <NotificationBell />

          {/* Logout */}
          <IconButton
            icon={<FiLogOut />}
            variant="ghost"
            colorScheme="red"
            onClick={handleSignOut}
            aria-label="Sign out"
          />
        </Flex>
      </Flex>
    </Box>
  );
}

