'use client';

import {
  Box,
  Heading,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  VStack,
  SimpleGrid,
  Card,
  CardBody,
  useToast,
  HStack,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getLeadById, addFollowUp } from '@/shared/lib/mock-data';

export default function ScheduleFollowUpPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const leadId = params?.id as string;

  const lead = getLeadById(leadId);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const [formData, setFormData] = useState({
    date: tomorrow.toISOString().split('T')[0],
    time: '10:00',
    priority: 'medium' as 'low' | 'medium' | 'high',
    notes: '',
  });

  if (!lead) {
    return (
      <Box p={8}>
        <VStack spacing={4}>
          <Heading>Lead not found</Heading>
          <Button onClick={() => router.back()} colorScheme="blue">
            Go Back
          </Button>
        </VStack>
      </Box>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.notes.trim()) {
      toast({
        title: 'Notes required',
        description: 'Please provide follow-up notes',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      // Create scheduled date/time
      const scheduledDateTime = new Date(`${formData.date}T${formData.time}`);

      // Add follow-up
      addFollowUp({
        leadId: lead.id,
        leadName: lead.name,
        scheduledFor: scheduledDateTime,
        status: 'pending',
        priority: formData.priority,
        notes: formData.notes,
        createdById: '2', // Mock current user
      });

      toast({
        title: 'Follow-up scheduled successfully',
        description: `Follow-up with ${lead.name} scheduled for ${scheduledDateTime.toLocaleString()}`,
        status: 'success',
        duration: 3000,
      });

      setLoading(false);
      router.push(`/dashboard/leads/${leadId}`);
    } catch (error) {
      toast({
        title: 'Error scheduling follow-up',
        description: 'Something went wrong',
        status: 'error',
        duration: 3000,
      });
      setLoading(false);
    }
  };

  return (
    <Box p={8}>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Schedule Follow-up - {lead.name}</Heading>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </HStack>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit}>
            <VStack spacing={6} align="stretch">
              <Box bg="blue.50" p={4} borderRadius="md">
                <Text fontWeight="semibold">Lead: {lead.name}</Text>
                <Text fontSize="sm">Phone: {lead.phone}</Text>
                <Text fontSize="sm">Status: {lead.status}</Text>
              </Box>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Follow-up Date</FormLabel>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Follow-up Time</FormLabel>
                  <Input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <FormLabel>Priority</FormLabel>
                <Select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Follow-up Notes</FormLabel>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Enter follow-up purpose, discussion points, action items, etc."
                  rows={6}
                />
              </FormControl>

              <HStack spacing={4} justify="flex-end">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  colorScheme="orange"
                  isLoading={loading}
                  loadingText="Scheduling..."
                >
                  Schedule Follow-up
                </Button>
              </HStack>
            </VStack>
          </form>
        </CardBody>
      </Card>
    </Box>
  );
}
