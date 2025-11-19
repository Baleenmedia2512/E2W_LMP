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
  Spinner,
  Text,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';

export default function EditLeadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const leadId = params?.id as string;

  const { data: lead, error } = useSWR(leadId ? `/api/leads/${leadId}` : null, fetcher);

  const [loading, setLoading] = useState(false);
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
    status: 'new',
    priority: 'medium',
    notes: '',
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        phone: lead.phone || '',
        email: lead.email || '',
        alternatePhone: lead.alternatePhone || '',
        address: lead.address || '',
        city: lead.city || '',
        state: lead.state || '',
        pincode: lead.pincode || '',
        source: lead.source || 'Website',
        campaign: lead.campaign || '',
        status: lead.status || 'new',
        priority: lead.priority || 'medium',
        notes: lead.notes || '',
      });
    }
  }, [lead]);

  if (status === 'loading' || !lead) {
    return (
      <Box p={8} display="flex" justifyContent="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!session) {
    router.push('/auth/signin');
    return null;
  }

  if (error) {
    return (
      <Box p={8}>
        <Text color="red.500">Error loading lead</Text>
      </Box>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to update lead');
      }

      toast({
        title: 'Lead updated successfully',
        status: 'success',
        duration: 3000,
      });

      router.push(`/dashboard/leads/${leadId}`);
    } catch (error) {
      toast({
        title: 'Error updating lead',
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
        Edit Lead
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
                  <FormLabel>Status</FormLabel>
                  <Select name="status" value={formData.status} onChange={handleChange}>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Priority</FormLabel>
                  <Select name="priority" value={formData.priority} onChange={handleChange}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                </FormControl>
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
                  loadingText="Updating..."
                >
                  Update Lead
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
