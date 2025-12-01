'use client';

import {
  Box,
  Grid,
  Text,
  VStack,
  HStack,
  Badge,
  Button,
  Tooltip,
  useColorModeValue,
} from '@chakra-ui/react';
import { useState, useMemo } from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi';

interface FollowUp {
  id: string;
  leadId: string;
  lead: {
    id: string;
    name: string;
    phone: string;
    status?: string;
  };
  scheduledAt: string;
  status: 'pending' | 'cancelled';
  customerRequirement: string | null;
  notes: string | null;
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

interface CalendarViewProps {
  followUps: FollowUp[];
  onSelectFollowUp: (id: string) => void;
}

export default function CalendarView({ followUps, onSelectFollowUp }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const cellBg = useColorModeValue('white', 'gray.800');
  const todayBg = useColorModeValue('blue.50', 'blue.900');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of month
    const firstDay = new Date(year, month, 1);
    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    
    // Get day of week for first day (0 = Sunday)
    const startDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days in month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }, [currentDate]);

  // Group follow-ups by date
  const followUpsByDate = useMemo(() => {
    const grouped: { [key: string]: FollowUp[] } = {};
    
    followUps.forEach(followUp => {
      const date = new Date(followUp.scheduledAt);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(followUp);
    });
    
    return grouped;
  }, [followUps]);

  const getFollowUpsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    return followUpsByDate[dateKey] || [];
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthYear = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <Box p={4}>
      {/* Calendar Header */}
      <HStack justify="space-between" mb={4}>
        <Button
          size="sm"
          leftIcon={<HiChevronLeft />}
          onClick={previousMonth}
          variant="outline"
        >
          Previous
        </Button>
        <Text fontSize="xl" fontWeight="bold">
          {monthYear}
        </Text>
        <Button
          size="sm"
          rightIcon={<HiChevronRight />}
          onClick={nextMonth}
          variant="outline"
        >
          Next
        </Button>
      </HStack>

      {/* Day of week headers */}
      <Grid templateColumns="repeat(7, 1fr)" gap={2} mb={2}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Box key={day} textAlign="center" fontWeight="semibold" fontSize="sm" p={2}>
            {day}
          </Box>
        ))}
      </Grid>

      {/* Calendar Grid */}
      <Grid templateColumns="repeat(7, 1fr)" gap={2}>
        {calendarDays.map((date, index) => {
          const dayFollowUps = getFollowUpsForDate(date);
          const today = isToday(date);

          return (
            <Box
              key={index}
              minH="100px"
              p={2}
              bg={today ? todayBg : cellBg}
              borderWidth="1px"
              borderColor={borderColor}
              borderRadius="md"
              position="relative"
            >
              {date && (
                <>
                  <Text
                    fontSize="sm"
                    fontWeight={today ? 'bold' : 'normal'}
                    color={today ? 'blue.600' : 'gray.600'}
                    mb={1}
                  >
                    {date.getDate()}
                  </Text>
                  
                  <VStack spacing={1} align="stretch">
                    {dayFollowUps.slice(0, 3).map(followUp => {
                      const now = new Date();
                      const scheduledDate = new Date(followUp.scheduledAt);
                      const isOverdue = followUp.status === 'pending' && scheduledDate < now;
                      
                      return (
                        <Tooltip
                          key={followUp.id}
                          label={
                            <Box>
                              <Text fontWeight="bold">{followUp.lead.name}</Text>
                              <Text fontSize="xs">{followUp.customerRequirement}</Text>
                              <Text fontSize="xs">
                                {new Date(followUp.scheduledAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Text>
                            </Box>
                          }
                          placement="top"
                        >
                          <Box
                            p={1}
                            bg={
                              isOverdue
                                ? 'red.100'
                                : followUp.status === 'cancelled'
                                ? 'gray.100'
                                : 'blue.100'
                            }
                            borderRadius="sm"
                            cursor="pointer"
                            onClick={() => onSelectFollowUp(followUp.id)}
                            _hover={{ opacity: 0.8 }}
                          >
                            <Text fontSize="xs" noOfLines={1} fontWeight="medium">
                              {new Date(followUp.scheduledAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              {followUp.lead.name}
                            </Text>
                          </Box>
                        </Tooltip>
                      );
                    })}
                    
                    {dayFollowUps.length > 3 && (
                      <Text fontSize="xs" color="gray.500" textAlign="center">
                        +{dayFollowUps.length - 3} more
                      </Text>
                    )}
                  </VStack>
                </>
              )}
            </Box>
          );
        })}
      </Grid>

      {/* Legend */}
      <HStack spacing={4} mt={4} justify="center" flexWrap="wrap">
        <HStack>
          <Box w={4} h={4} bg="red.100" borderRadius="sm" />
          <Text fontSize="sm">Overdue</Text>
        </HStack>
        <HStack>
          <Box w={4} h={4} bg="orange.100" borderRadius="sm" />
          <Text fontSize="sm">High Priority</Text>
        </HStack>
        <HStack>
          <Box w={4} h={4} bg="blue.100" borderRadius="sm" />
          <Text fontSize="sm">Pending</Text>
        </HStack>
        <HStack>
          <Box w={4} h={4} bg="green.100" borderRadius="sm" />
          <Text fontSize="sm">Completed</Text>
        </HStack>
      </HStack>
    </Box>
  );
}
