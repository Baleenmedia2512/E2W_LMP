'use client';

import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableProps,
  useBreakpointValue,
  Text,
  VStack,
  HStack,
  Divider,
} from '@chakra-ui/react';
import { ReactNode } from 'react';

export interface Column {
  header: string;
  accessor: string;
  isSticky?: boolean;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
  render?: (value: any, row: any) => ReactNode;
}

export interface ResponsiveTableProps extends TableProps {
  columns: Column[];
  data: any[];
  emptyMessage?: string;
  mobileCardView?: boolean;
}

/**
 * Responsive table component with horizontal scroll and sticky columns
 * Implements US-25 requirements:
 * - Scroll horizontally on mobile
 * - Sticky important columns (e.g., Name, Status)
 * - Optimized layout for different screen sizes
 */
export default function ResponsiveTable({
  columns,
  data,
  emptyMessage = 'No data available',
  mobileCardView = true,
  ...tableProps
}: ResponsiveTableProps) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Mobile card view for better UX on small screens
  if (isMobile && mobileCardView) {
    return (
      <VStack spacing={3} align="stretch">
        {data.length === 0 ? (
          <Box textAlign="center" py={8}>
            <Text color="gray.500">{emptyMessage}</Text>
          </Box>
        ) : (
          data.map((row, rowIndex) => (
            <Box
              key={rowIndex}
              bg="white"
              p={4}
              borderRadius="md"
              boxShadow="sm"
              borderWidth="1px"
              borderColor="gray.200"
            >
              <VStack spacing={2} align="stretch">
                {columns
                  .filter((col) => !col.hideOnMobile)
                  .map((col, colIndex) => (
                    <HStack
                      key={colIndex}
                      justify="space-between"
                      align="flex-start"
                    >
                      <Text
                        fontSize="xs"
                        fontWeight="600"
                        color="gray.600"
                        textTransform="uppercase"
                        flex="0 0 40%"
                      >
                        {col.header}
                      </Text>
                      <Box flex="1" textAlign="right">
                        {col.render
                          ? col.render(row[col.accessor], row)
                          : row[col.accessor]}
                      </Box>
                    </HStack>
                  ))}
              </VStack>
            </Box>
          ))
        )}
      </VStack>
    );
  }

  // Desktop/Tablet table view with horizontal scroll and sticky columns
  return (
    <Box
      overflowX="auto"
      overflowY="visible"
      bg="white"
      borderRadius="lg"
      boxShadow="sm"
      sx={{
        // Custom scrollbar styling
        '&::-webkit-scrollbar': {
          height: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'gray.100',
          borderRadius: 'md',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'gray.400',
          borderRadius: 'md',
          '&:hover': {
            background: 'gray.500',
          },
        },
      }}
    >
      <Table variant="simple" size={{ base: 'sm', md: 'md' }} {...tableProps}>
        <Thead bg="gray.50" position="sticky" top={0} zIndex={1}>
          <Tr>
            {columns.map((col, index) => {
              const isHidden =
                (col.hideOnMobile && isMobile) ||
                (col.hideOnTablet && !isMobile);

              if (isHidden) return null;

              return (
                <Th
                  key={index}
                  position={col.isSticky ? 'sticky' : 'relative'}
                  left={col.isSticky ? 0 : 'auto'}
                  bg={col.isSticky ? 'white' : 'gray.50'}
                  zIndex={col.isSticky ? 2 : 1}
                  whiteSpace="nowrap"
                  boxShadow={col.isSticky ? 'md' : 'none'}
                >
                  {col.header}
                </Th>
              );
            })}
          </Tr>
        </Thead>
        <Tbody>
          {data.length === 0 ? (
            <Tr>
              <Td colSpan={columns.length} textAlign="center" py={8}>
                <Text color="gray.500">{emptyMessage}</Text>
              </Td>
            </Tr>
          ) : (
            data.map((row, rowIndex) => (
              <Tr key={rowIndex} _hover={{ bg: 'gray.50' }}>
                {columns.map((col, colIndex) => {
                  const isHidden =
                    (col.hideOnMobile && isMobile) ||
                    (col.hideOnTablet && !isMobile);

                  if (isHidden) return null;

                  return (
                    <Td
                      key={colIndex}
                      position={col.isSticky ? 'sticky' : 'relative'}
                      left={col.isSticky ? 0 : 'auto'}
                      bg={col.isSticky ? 'white' : 'transparent'}
                      zIndex={col.isSticky ? 1 : 0}
                      whiteSpace="nowrap"
                      boxShadow={col.isSticky ? 'md' : 'none'}
                    >
                      {col.render
                        ? col.render(row[col.accessor], row)
                        : row[col.accessor]}
                    </Td>
                  );
                })}
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </Box>
  );
}
