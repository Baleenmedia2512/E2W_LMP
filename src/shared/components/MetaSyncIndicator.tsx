import { Box, HStack, Icon, Text, Tooltip } from '@chakra-ui/react';
import { FiRefreshCw, FiCheck, FiClock } from 'react-icons/fi';

interface MetaSyncIndicatorProps {
  lastSyncTime: Date | null;
  isSyncing: boolean;
  syncCount: number;
}

// Define spin animation CSS
const spinAnimation = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

/**
 * Optional visual indicator for Meta leads sync status
 * Shows when last sync occurred and if currently syncing
 */
export function MetaSyncIndicator({ lastSyncTime, isSyncing, syncCount }: MetaSyncIndicatorProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 min ago';
    if (diffMins < 60) return `${diffMins} mins ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  if (!lastSyncTime && !isSyncing) {
    return null; // Don't show until first sync
  }

  return (
    <>
      <style>{spinAnimation}</style>
      <Tooltip
        label={
          isSyncing 
            ? 'Syncing Meta leads...' 
            : `Last synced ${lastSyncTime ? formatTime(lastSyncTime) : 'never'}. Total syncs: ${syncCount}`
        }
        placement="bottom"
      >
        <Box
          px={3}
          py={1.5}
          bg={isSyncing ? 'blue.50' : 'green.50'}
          borderRadius="md"
          borderWidth="1px"
          borderColor={isSyncing ? 'blue.200' : 'green.200'}
          cursor="default"
        >
          <HStack spacing={2}>
            <Icon
              as={isSyncing ? FiRefreshCw : FiCheck}
              color={isSyncing ? 'blue.500' : 'green.500'}
              sx={isSyncing ? { animation: 'spin 1s linear infinite' } : undefined}
            />
            <Text fontSize="xs" color={isSyncing ? 'blue.700' : 'green.700'} fontWeight="medium">
              {isSyncing ? 'Syncing...' : 'Meta Synced'}
            </Text>
            {!isSyncing && lastSyncTime && (
              <HStack spacing={1}>
                <Icon as={FiClock} color="gray.400" w={3} h={3} />
                <Text fontSize="xs" color="gray.500">
                  {formatTime(lastSyncTime)}
                </Text>
              </HStack>
            )}
          </HStack>
        </Box>
      </Tooltip>
    </>
  );
}
