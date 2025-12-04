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
  status: string;
}

interface FollowUp {
  id: string;
  leadId: string;
  scheduledAt: string;
  status: string;
  customerRequirement?: string;
  notes?: string;
}

export default function ScheduleFollowUpPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingLead, setLoadingLead] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  const [existingFollowUp, setExistingFollowUp] = useState<FollowUp | null>(null);
  const leadId = params?.id as string;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadRes, followUpRes] = await Promise.all([
          fetch(`/api/leads/${leadId}`),
          fetch(`/api/followups?leadId=${leadId}&limit=1`)
        ]);
        
        if (!leadRes.ok) throw new Error('Lead not found');
        const leadData = await leadRes.json();
        setLead(leadData.data || leadData);

        // Check if there's an existing pending follow-up
        if (followUpRes.ok) {
          const followUpData = await followUpRes.json();
          if (followUpData.success && followUpData.data && followUpData.data.length > 0) {
            const existingFU = followUpData.data[0];
            setExistingFollowUp(existingFU);
            
            // Pre-populate form with existing follow-up data
            const scheduledDate = new Date(existingFU.scheduledAt);
            setFormData({
              date: scheduledDate.toISOString().split('T')[0],
              time: scheduledDate.toTimeString().slice(0, 5),
              customerRequirement: existingFU.customerRequirement || '',
              notes: existingFU.notes || '',
            });
          }
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load data',
          status: 'error',
          duration: 3000,
        });
        router.push('/dashboard/leads');
      } finally {
        setLoadingLead(false);
      }
    };

    if (leadId) {
      fetchData();
    }
  }, [leadId, toast, router]);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const [formData, setFormData] = useState({
    date: tomorrow.toISOString().split('T')[0],
    time: '10:00',
    customerRequirement: '',
    notes: '',
  });
  
  const [validationErrors, setValidationErrors] = useState({
    date: '',
    time: '',
    customerRequirement: '',
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

  // Generate time options in 15-minute intervals (12-hour format)
  const generateTimeOptions = () => {
    const times = [];
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += 15) {
        const hour24 = h.toString().padStart(2, '0');
        const minute = m.toString().padStart(2, '0');
        const hour12 = h % 12 || 12;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const display = `${hour12.toString().padStart(2, '0')}:${minute} ${ampm}`;
        const value = `${hour24}:${minute}`; // Store as 24-hour for backend
        times.push({ value, display });
      }
    }
    return times;
  };

  const validateDateTime = (date: string, time: string): boolean => {
    const errors = { date: '', time: '', customerRequirement: '' };
    let isValid = true;

    // Create selected datetime
    const selectedDateTime = new Date(`${date}T${time}`);
    const now = new Date();

    // Check if date/time is in the past
    if (selectedDateTime <= now) {
      errors.date = 'Follow-up date and time must be in the future';
      errors.time = 'Follow-up date and time must be in the future';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Clear validation errors when user starts typing
    if (validationErrors[name as keyof typeof validationErrors]) {
      setValidationErrors({
        ...validationErrors,
        [name]: '',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate customer requirement (required field)
    const errors = { ...validationErrors };
    let isValid = true;

    if (!formData.customerRequirement.trim()) {
      errors.customerRequirement = 'Customer requirement is required';
      isValid = false;
    }

    if (!formData.notes.trim()) {
      toast({
        title: 'Notes required',
        description: 'Please provide follow-up notes',
        status: 'error',
        duration: 3000,
      });
      isValid = false;
    }

    // Validate date/time
    if (!formData.date || !formData.time) {
      errors.date = 'Date and time are required';
      isValid = false;
    } else {
      // Validate that date/time is in the future
      const isDateTimeValid = validateDateTime(formData.date, formData.time);
      if (!isDateTimeValid) {
        isValid = false;
      }
    }

    if (!isValid) {
      setValidationErrors(errors);
      if (errors.customerRequirement) {
        toast({
          title: 'Validation Error',
          description: errors.customerRequirement,
          status: 'error',
          duration: 3000,
        });
      }
      return;
    }

    setLoading(true);

    try {
      // Create scheduled date/time
      const scheduledDateTime = new Date(`${formData.date}T${formData.time}`);

      let res;
      let actionDescription = '';

      if (existingFollowUp) {
        // Update existing follow-up
        res = await fetch(`/api/followups/${existingFollowUp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scheduledAt: scheduledDateTime.toISOString(),
            customerRequirement: formData.customerRequirement,
            notes: formData.notes,
          }),
        });
        actionDescription = 'followup_rescheduled';
      } else {
        // Create new follow-up
        res = await fetch('/api/followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead.id,
            scheduledAt: scheduledDateTime.toISOString(),
            customerRequirement: formData.customerRequirement,
            notes: formData.notes,
            createdById: 'current-user-id',
          }),
        });
        actionDescription = 'followup_scheduled';
      }

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || `Failed to ${existingFollowUp ? 'reschedule' : 'schedule'} follow-up`);
      }

      // Log activity with remarks
      try {
        await fetch('/api/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: lead.id,
            action: actionDescription,
            description: `Follow-up ${existingFollowUp ? 'rescheduled' : 'scheduled'} for ${scheduledDateTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} at ${scheduledDateTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })} - ${formData.customerRequirement}`,
          }),
        });
      } catch (err) {
        console.error('Failed to log activity:', err);
      }

      toast({
        title: existingFollowUp ? 'Follow-up rescheduled successfully' : 'Follow-up scheduled successfully',
        description: `Follow-up with ${lead.name} ${existingFollowUp ? 'rescheduled' : 'scheduled'} for ${scheduledDateTime.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} at ${scheduledDateTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}`,
        status: 'success',
        duration: 5000,
      });

      // Navigate back to leads list page with forced refresh
      const backUrl = `/dashboard/leads?t=${Date.now()}`;
      router.push(backUrl);
      router.refresh();
      
      // Use window.location for hard refresh to clear all caches
      setTimeout(() => {
        window.location.href = '/dashboard/leads';
      }, 100);
    } catch (error) {
      toast({
        title: 'Error scheduling follow-up',
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
        <Heading size="lg">
          {existingFollowUp ? 'Reschedule' : 'Schedule'} Follow-up - {lead.name}
        </Heading>
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
                <FormControl isRequired isInvalid={!!validationErrors.date}>
                  <FormLabel>Follow-up Date *</FormLabel>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {validationErrors.date && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {validationErrors.date}
                    </Text>
                  )}
                </FormControl>

                <FormControl isRequired isInvalid={!!validationErrors.time}>
                  <FormLabel>Follow-up Time (15-min intervals) *</FormLabel>
                  <Select
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                  >
                    {generateTimeOptions().map((time) => (
                      <option key={time.value} value={time.value}>
                        {time.display}
                      </option>
                    ))}
                  </Select>
                  {validationErrors.time && (
                    <Text color="red.500" fontSize="sm" mt={1}>
                      {validationErrors.time}
                    </Text>
                  )}
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired isInvalid={!!validationErrors.customerRequirement}>
                <FormLabel>Customer Requirement *</FormLabel>
                <Textarea
                  name="customerRequirement"
                  value={formData.customerRequirement}
                  onChange={handleChange}
                  placeholder="Enter customer requirement for context (e.g., interested in product demo, needs pricing, technical clarification)"
                  rows={3}
                  maxLength={500}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {formData.customerRequirement.length}/500 characters
                </Text>
                {validationErrors.customerRequirement && (
                  <Text color="red.500" fontSize="sm" mt={1}>
                    {validationErrors.customerRequirement}
                  </Text>
                )}
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Follow-up Notes *</FormLabel>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Enter follow-up purpose, discussion points, action items, etc."
                  rows={6}
                  maxLength={1000}
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  {formData.notes.length}/1000 characters
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
                  colorScheme="orange"
                  isLoading={loading}
                  loadingText={existingFollowUp ? 'Rescheduling...' : 'Scheduling...'}
                >
                  {existingFollowUp ? 'Reschedule Follow-up' : 'Schedule Follow-up'}
                </Button>
              </HStack>
            </VStack>
          </form>
        </CardBody>
      </Card>
    </Box>
  );
}
