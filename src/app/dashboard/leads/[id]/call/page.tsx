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
  Spinner,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Lead {
  id: string;
  name: string;
  phone: string;
  callAttempts?: number;
  status: string;
}

export default function LogCallPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingLead, setLoadingLead] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  const leadId = params?.id as string;

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const res = await fetch(`/api/leads/${leadId}`);
        if (!res.ok) throw new Error('Lead not found');
        const response = await res.json();
        // Extract lead data from response wrapper
        const leadData = response.data || response;
        setLead(leadData);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load lead',
          status: 'error',
          duration: 3000,
        });
        router.push('/dashboard/leads');
      } finally {
        setLoadingLead(false);
      }
    };

    if (leadId) {
      fetchLead();
    }
  }, [leadId, toast, router]);

  const now = new Date();
  const [formData, setFormData] = useState({
    date: now.toISOString().split('T')[0],
    time: now.toTimeString().slice(0, 5),
    duration: '',
    status: 'completed' as 'completed' | 'missed' | 'voicemail',
    notes: '',
    nextAction: 'none' as 'none' | 'followup' | 'qualified' | 'unreach' | 'unqualified',
  });

  if (loadingLead) {
    return (
      <Box p={8} display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="lg" color="blue.500" />
      </Box>
    );
  }

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
      // Parse date and time to create startedAt timestamp
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      const durationInSeconds = formData.duration ? parseInt(formData.duration) * 60 : 0;
      const endedAt = new Date(dateTime.getTime() + durationInSeconds * 1000);

      // 1. Log the call
      // TODO: Get actual current user ID from session/auth
      const callerId = '1'; // Using default user ID for now
      const callRes = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          callerId: callerId,
          startedAt: dateTime.toISOString(),
          endedAt: endedAt.toISOString(),
          duration: durationInSeconds,
          callStatus: formData.status,
          remarks: formData.notes,
        }),
      });

      if (!callRes.ok) {
        const errorData = await callRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to log call');
      }

      // 2. Update lead status if needed
      if (formData.nextAction !== 'none') {
        let statusUpdate = lead.status;
        let updateData: any = { status: statusUpdate };

        if (formData.nextAction === 'qualified') {
          statusUpdate = 'qualified';
        } else if (formData.nextAction === 'unreach') {
          statusUpdate = 'unreach';
        } else if (formData.nextAction === 'unqualified') {
          statusUpdate = 'unqualified';
        } else if (formData.nextAction === 'followup') {
          statusUpdate = 'followup';
        }

        updateData.status = statusUpdate;

        const updateRes = await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (!updateRes.ok) {
          const errorData = await updateRes.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to update lead status');
        }
      }

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
        description: error instanceof Error ? error.message : 'Something went wrong',
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
