'use client';

import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  VStack,
  Heading,
  useToast,
  Card,
  CardBody,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';

export default function NewFollowUpPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const leadId = params?.id as string;

  const [loading, setLoading] = useState(false);
  
  // Default to tomorrow at 10 AM
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const [formData, setFormData] = useState({
    scheduledAt: tomorrow.toISOString().slice(0, 16),
    priority: 'medium',
    notes: '',
  });

  if (status === 'loading') {
    return <Box p={8}>Loading...</Box>;
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that leadId exists
    if (!leadId) {
      toast({
        title: 'Error',
        description: 'Lead ID is missing',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      const scheduledDate = new Date(formData.scheduledAt);
      const now = new Date();
      
      // Validate that scheduled date is in the future
      if (scheduledDate <= now) {
        throw new Error('Follow-up must be scheduled for a future date and time');
      }

      const payload = {
        leadId,
        scheduledAt: scheduledDate.toISOString(),
        priority: formData.priority,
        notes: formData.notes || null,
        status: 'pending',
      };

      const response = await fetch('/api/followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to schedule follow-up');
      }

      toast({
        title: 'Follow-up scheduled successfully',
        description: result.message || `Scheduled for ${scheduledDate.toLocaleString()}`,
        status: 'success',
        duration: 3000,
      });

      router.push(`/dashboard/leads/${leadId}`);
    } catch (error) {
      toast({
        title: 'Error scheduling follow-up',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <Box p={8}>
      <Heading size="lg" mb={6}>
        Schedule Follow-up
      </Heading>

      <Card maxW="600px">
        <CardBody>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Schedule Date & Time</FormLabel>
                <Input
                  name="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={handleChange}
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Priority</FormLabel>
                <Select name="priority" value={formData.priority} onChange={handleChange}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Enter follow-up notes, action items, discussion points, etc."
                  rows={6}
                />
              </FormControl>

              <Box display="flex" gap={4}>
                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={loading}
                  loadingText="Scheduling..."
                >
                  Schedule Follow-up
                </Button>
                <Button variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </Box>
            </VStack>
          </form>
        </CardBody>
      </Card>
    </Box>
  );
}
