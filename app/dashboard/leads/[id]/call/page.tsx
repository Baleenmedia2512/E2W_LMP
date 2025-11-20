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
  Text,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';

export default function NewCallLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const leadId = params?.id as string;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    startedAt: new Date().toISOString().slice(0, 16),
    endedAt: '',
    callStatus: 'answered',
    remarks: '',
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
      const startedAt = new Date(formData.startedAt);
      const endedAt = formData.endedAt ? new Date(formData.endedAt) : null;
      
      // Validate that endedAt is after startedAt
      if (endedAt && endedAt <= startedAt) {
        throw new Error('End time must be after start time');
      }
      
      const duration = endedAt
        ? Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)
        : null;

      const payload = {
        leadId,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt?.toISOString() || null,
        duration,
        callStatus: formData.callStatus,
        remarks: formData.remarks || null,
      };

      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to log call');
      }

      toast({
        title: 'Call logged successfully',
        description: result.message || 'Call log has been saved',
        status: 'success',
        duration: 3000,
      });

      router.push(`/dashboard/leads/${leadId}`);
    } catch (error) {
      toast({
        title: 'Error logging call',
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
        Log Call
      </Heading>

      <Card maxW="600px">
        <CardBody>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Call Started At</FormLabel>
                <Input
                  name="startedAt"
                  type="datetime-local"
                  value={formData.startedAt}
                  onChange={handleChange}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Call Ended At</FormLabel>
                <Input
                  name="endedAt"
                  type="datetime-local"
                  value={formData.endedAt}
                  onChange={handleChange}
                />
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Leave empty for ongoing calls
                </Text>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Call Status</FormLabel>
                <Select name="callStatus" value={formData.callStatus} onChange={handleChange}>
                  <option value="answered">Answered</option>
                  <option value="not_answered">Not Answered</option>
                  <option value="busy">Busy</option>
                  <option value="invalid">Invalid Number</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Remarks / Notes</FormLabel>
                <Textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  placeholder="Enter call notes, customer feedback, next steps, etc."
                  rows={6}
                />
              </FormControl>

              <Box display="flex" gap={4}>
                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={loading}
                  loadingText="Saving..."
                >
                  Save Call Log
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
