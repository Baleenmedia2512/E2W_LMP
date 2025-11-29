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
  Badge,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { HiArrowLeft, HiSave } from 'react-icons/hi';
import { useAuth } from '@/shared/lib/auth/auth-context';

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
  const { user } = useAuth();
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
    status: 'completed' as 'completed' | 'busy' | 'ring_not_response',
    customerRequirement: '',
    nextAction: 'no-action' as 'no-action' | 'followup' | 'unreach' | 'unqualified',
  });

  // Follow-up fields
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('09:00');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [followUpPriority, setFollowUpPriority] = useState<'low' | 'medium' | 'high'>('medium');

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

    if (!formData.customerRequirement.trim()) {
      toast({
        title: 'Customer Requirement required',
        description: 'Please provide call details/customer requirement',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
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
      const callRes = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          callerId: user.id,
          startedAt: dateTime.toISOString(),
          endedAt: endedAt.toISOString(),
          duration: durationInSeconds,
          callStatus: formData.status,
          remarks: formData.customerRequirement,
          customerRequirement: formData.customerRequirement,
        }),
      });

      if (!callRes.ok) {
        const errorData = await callRes.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to log call');
      }

      // 2. Handle next action
      if (formData.nextAction === 'unreach') {
        const updateRes = await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'unreach',
            customerRequirement: formData.customerRequirement,
            updatedById: user.id,
          }),
        });

        if (!updateRes.ok) {
          throw new Error('Failed to update lead status');
        }
      } else if (formData.nextAction === 'unqualified') {
        const updateRes = await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'unqualified',
            customerRequirement: formData.customerRequirement,
            updatedById: user.id,
          }),
        });

        if (!updateRes.ok) {
          throw new Error('Failed to update lead status');
        }
      } else if (formData.nextAction === 'followup' && followUpDate) {
        // Create follow-up and update lead status
        const followUpDateTime = new Date(`${followUpDate}T${followUpTime}`);
        const followUpRes = await fetch('/api/followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead.id,
            scheduledAt: followUpDateTime.toISOString(),
            status: 'pending',
            notes: followUpNotes || 'Follow-up scheduled from call log',
            priority: followUpPriority,
            createdById: user.id,
          }),
        });

        if (!followUpRes.ok) {
          throw new Error('Failed to schedule follow-up');
        }

        // Update lead status to 'followup'
        const updateRes = await fetch(`/api/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'followup',
            customerRequirement: formData.customerRequirement,
            updatedById: user.id,
          }),
        });

        if (!updateRes.ok) {
          throw new Error('Failed to update lead status');
        }
      }

      toast({
        title: 'Success!',
        description: `Call with ${lead.name} has been logged successfully`,
        status: 'success',
        duration: 3000,
      });

      setLoading(false);
      setTimeout(() => {
        router.push(`/dashboard/leads/${leadId}`);
      }, 500);
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
      <HStack justify="space-between" mb={6} align="flex-start">
        <VStack align="start" spacing={2}>
          <Button
            leftIcon={<HiArrowLeft />}
            variant="ghost"
            onClick={() => router.back()}
            size="sm"
          >
            Back
          </Button>
          <Heading size="lg">Log Call - {lead.name}</Heading>
        </VStack>
      </HStack>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit}>
            <VStack spacing={6} align="stretch">
              <Box bg="blue.50" p={4} borderRadius="md">
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Box>
                    <Text fontSize="xs" color="gray.600" fontWeight="bold">Lead Name</Text>
                    <Text fontSize="md" fontWeight="600">{lead.name}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.600" fontWeight="bold">Phone Number</Text>
                    <Text fontSize="md" fontWeight="600">{lead.phone}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="gray.600" fontWeight="bold">Call Attempts</Text>
                    <Badge colorScheme="purple" fontSize="md" px={2} py={1}>
                      {lead.callAttempts || 0} Attempts
                    </Badge>
                  </Box>
                </SimpleGrid>
              </Box>

              <Heading size="sm">Call Information</Heading>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Date</FormLabel>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Time</FormLabel>
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
                    placeholder="0"
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
                    <option value="completed">Answer</option>
                    <option value="busy">Busy</option>
                    <option value="ring_not_response">Wrong Number</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <FormLabel fontWeight="600">Customer Requirement (Required)</FormLabel>
                <Textarea
                  name="customerRequirement"
                  value={formData.customerRequirement}
                  onChange={handleChange}
                  placeholder="What was discussed? What is the customer's requirement/feedback?"
                  rows={4}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Next Action</FormLabel>
                <Select
                  name="nextAction"
                  value={formData.nextAction}
                  onChange={handleChange}
                >
                  <option value="no-action">No Action</option>
                  <option value="followup">Schedule Follow-up</option>
                  <option value="unreach">Mark as Unreachable</option>
                  <option value="unqualified">Mark as Unqualified</option>
                </Select>
              </FormControl>

              {formData.nextAction === 'followup' && (
                <VStack spacing={4} align="stretch" bg="orange.50" p={4} borderRadius="md">
                  <Heading size="sm">Schedule Follow-up</Heading>
                  
                  <FormControl isRequired>
                    <FormLabel>Follow-up Date</FormLabel>
                    <Input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      min={formData.date}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Follow-up Time</FormLabel>
                    <Input
                      type="time"
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      value={followUpPriority}
                      onChange={(e) => setFollowUpPriority(e.target.value as 'low' | 'medium' | 'high')}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </Select>
                  </FormControl>

                  <FormControl>
                    <FormLabel>Notes</FormLabel>
                    <Textarea
                      value={followUpNotes}
                      onChange={(e) => setFollowUpNotes(e.target.value)}
                      placeholder="Any specific notes for the follow-up?"
                      rows={3}
                    />
                  </FormControl>
                </VStack>
              )}

              <HStack spacing={4} justify="flex-end" pt={4}>
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  colorScheme="blue"
                  leftIcon={<HiSave />}
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
