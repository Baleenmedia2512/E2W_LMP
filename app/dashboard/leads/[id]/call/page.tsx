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
import { getLeadById, addCallLog, updateLead } from '@/lib/mock-data';

export default function LogCallPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const leadId = params?.id as string;

  const lead = getLeadById(leadId);

  const now = new Date();
  const [formData, setFormData] = useState({
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().slice(0, 5),
    duration: '',
    status: 'completed' as 'completed' | 'missed' | 'voicemail',
    notes: '',
    nextAction: 'none' as 'none' | 'followup' | 'qualified' | 'unreach' | 'unqualified',
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
        description: 'Please provide call notes',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      // Parse duration (in minutes) to seconds
      const durationInSeconds = formData.duration ? parseInt(formData.duration) * 60 : 0;

      // Add call log
      addCallLog({
        leadId: lead.id,
        leadName: lead.name,
        duration: durationInSeconds,
        status: formData.status,
        notes: formData.notes,
        userId: '2', // Mock current user
        userName: 'John Doe',
      });

      // Update lead call attempts
      const currentAttempts = lead.callAttempts || 0;
      updateLead(lead.id, {
        callAttempts: currentAttempts + 1,
        status: formData.nextAction !== 'none' ? formData.nextAction : lead.status,
        notes: `Call logged on ${formData.date} at ${formData.time}. ${formData.notes}`,
      });

      toast({
        title: 'Call logged successfully',
        description: `Call with ${lead.name} has been logged`,
        status: 'success',
        duration: 3000,
      });

      setLoading(false);
      router.push(`/dashboard/leads/${leadId}`);
    } catch (error) {
      toast({
        title: 'Error logging call',
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
        <Heading size="lg">Log Call - {lead.name}</Heading>
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
                <Text fontSize="sm">Call Attempts: {lead.callAttempts || 0}</Text>
              </Box>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Call Date</FormLabel>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Call Time</FormLabel>
                  <Input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <Input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    placeholder="e.g., 5"
                    min="0"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Call Status</FormLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="completed">Completed</option>
                    <option value="missed">Missed/No Answer</option>
                    <option value="voicemail">Voicemail</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <FormLabel>Call Notes</FormLabel>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Enter call details, discussion points, outcomes, etc."
                  rows={6}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Next Action</FormLabel>
                <Select
                  name="nextAction"
                  value={formData.nextAction}
                  onChange={handleChange}
                >
                  <option value="none">No Status Change</option>
                  <option value="followup">Schedule Follow-up</option>
                  <option value="qualified">Mark as Qualified</option>
                  <option value="unreach">Mark as Unreachable</option>
                  <option value="unqualified">Mark as Unqualified</option>
                </Select>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Optionally update lead status based on this call
                </Text>
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
                  colorScheme="green"
                  isLoading={loading}
                  loadingText="Logging..."
                >
                  Log Call
                </Button>
              </HStack>
            </VStack>
          </form>
        </CardBody>
      </Card>
    </Box>
  );
}
