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
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { mutate } from 'swr';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';

interface User {
  id: string;
  name: string;
  email: string;
  role: {
    name: string;
  };
}

interface UsersResponse {
  success: boolean;
  data: User[];
}

export default function NewLeadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  // Fetch agents for SuperAgent assignment dropdown
  const { data: usersResponse } = useSWR<UsersResponse>(
    session?.user?.role === 'SuperAgent' ? '/api/users?role=Agent' : null,
    fetcher
  );

  const agents = usersResponse?.data || [];
  const isSuperAgent = session?.user?.role === 'SuperAgent';

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    alternatePhone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    source: 'Website',
    campaign: '',
    priority: 'medium',
    assignedToId: '',
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
    setLoading(true);

    try {
      // Prepare payload - remove assignedToId if empty string
      const payload = {
        ...formData,
        assignedToId: formData.assignedToId || null,
      };

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create lead');
      }

      toast({
        title: 'Lead created successfully',
        description: result.message || 'The lead has been added to the system',
        status: 'success',
        duration: 3000,
      });

      // Refresh the leads list cache
      mutate('/api/leads');

      router.push('/dashboard/leads');
    } catch (error) {
      toast({
        title: 'Error creating lead',
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
        Create New Lead
      </Heading>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit}>
            <VStack spacing={6} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Name</FormLabel>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter lead name"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Phone</FormLabel>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+919876543210"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="lead@example.com"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Alternate Phone</FormLabel>
                  <Input
                    name="alternatePhone"
                    value={formData.alternatePhone}
                    onChange={handleChange}
                    placeholder="+919876543211"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>City</FormLabel>
                  <Input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="Enter city"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>State</FormLabel>
                  <Input
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    placeholder="Enter state"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Pincode</FormLabel>
                  <Input
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="560001"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Source</FormLabel>
                  <Select name="source" value={formData.source} onChange={handleChange}>
                    <option value="Website">Website</option>
                    <option value="Meta">Meta</option>
                    <option value="Referral">Referral</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Direct">Direct</option>
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Campaign</FormLabel>
                  <Input
                    name="campaign"
                    value={formData.campaign}
                    onChange={handleChange}
                    placeholder="Campaign name"
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

                {/* Show Assign To dropdown only for SuperAgent */}
                {isSuperAgent && (
                  <FormControl>
                    <FormLabel>Assign To</FormLabel>
                    <Select
                      name="assignedToId"
                      value={formData.assignedToId}
                      onChange={handleChange}
                      placeholder="Leave Unassigned"
                    >
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name} ({agent.email})
                        </option>
                      ))}
                    </Select>
                    <Text fontSize="xs" color="gray.600" mt={1}>
                      Leave empty to keep lead unassigned
                    </Text>
                  </FormControl>
                )}

                {/* Show info message for regular agents */}
                {!isSuperAgent && (
                  <Box
                    p={3}
                    bg="blue.50"
                    borderRadius="md"
                    borderLeft="4px solid"
                    borderColor="blue.500"
                  >
                    <Text fontSize="sm" color="blue.700">
                      This lead will be automatically assigned to you
                    </Text>
                  </Box>
                )}
              </SimpleGrid>

              <FormControl>
                <FormLabel>Address</FormLabel>
                <Textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter full address"
                  rows={2}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional notes about the lead"
                  rows={4}
                />
              </FormControl>

              <Box display="flex" gap={4}>
                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={loading}
                  loadingText="Creating..."
                >
                  Create Lead
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
