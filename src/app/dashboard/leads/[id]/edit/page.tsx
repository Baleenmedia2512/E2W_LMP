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
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { mockUsers, getLeadById, updateLead } from '@/shared/lib/mock-data';

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const leadId = params?.id as string;

  const agents = mockUsers.filter(user => user.role.name === 'Agent' || user.role.name === 'SuperAgent');
  const lead = getLeadById(leadId);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    alternatePhone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    source: '',
    campaign: '',
    customerRequirement: '',
    status: 'new' as any,
    assignedToId: '',
    notes: ''
  });

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        phone: lead.phone,
        email: lead.email || '',
        alternatePhone: lead.alternatePhone || '',
        address: lead.address || '',
        city: lead.city || '',
        state: lead.state || '',
        pincode: lead.pincode || '',
        source: lead.source,
        campaign: lead.campaign || '',
        customerRequirement: lead.customerRequirement || '',
        status: lead.status,
        assignedToId: lead.assignedTo?.id || '',
        notes: lead.notes || ''
      });
    }
  }, [lead]);

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

    if (!formData.name || !formData.phone || !formData.source) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in Name, Phone, and Source',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      const selectedAgent = formData.assignedToId 
        ? agents.find(a => a.id === formData.assignedToId)
        : undefined;

      updateLead(leadId, {
        name: formData.name,
        phone: formData.phone,
        email: formData.email || null,
        alternatePhone: formData.alternatePhone || null,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        pincode: formData.pincode || null,
        source: formData.source,
        campaign: formData.campaign || null,
        customerRequirement: formData.customerRequirement || null,
        status: formData.status,
        assignedTo: selectedAgent ? {
          id: selectedAgent.id,
          name: selectedAgent.name,
          email: selectedAgent.email,
        } : undefined,
        notes: formData.notes || null,
      });

      toast({
        title: 'Lead updated successfully',
        description: `${formData.name} has been updated`,
        status: 'success',
        duration: 3000,
      });

      setLoading(false);
      router.push(`/dashboard/leads/${leadId}`);
    } catch (error) {
      toast({
        title: 'Error updating lead',
        description: 'Something went wrong',
        status: 'error',
        duration: 3000,
      });
      setLoading(false);
    }
  };

  return (
    <Box>
      <HStack justify="space-between" mb={6}>
        <Heading size="lg">Edit Lead</Heading>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </HStack>

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
                    placeholder="Enter phone number"
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Alternate Phone</FormLabel>
                  <Input
                    name="alternatePhone"
                    value={formData.alternatePhone}
                    onChange={handleChange}
                    placeholder="Enter alternate phone"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Address</FormLabel>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter address"
                />
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
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
                    placeholder="Enter pincode"
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Source</FormLabel>
                  <Select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                  >
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
                    placeholder="Enter campaign name"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Customer Requirement</FormLabel>
                <Input
                  name="customerRequirement"
                  value={formData.customerRequirement}
                  onChange={handleChange}
                  placeholder="What does the customer need?"
                />
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Status</FormLabel>
                  <Select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="followup">Follow-up</option>
                    <option value="qualified">Qualified</option>
                    <option value="unreach">Unreachable</option>
                    <option value="unqualified">Unqualified</option>
                    <option value="won">Won</option>
                    <option value="lost">Lost</option>
                  </Select>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>Assign To</FormLabel>
                <Select
                  name="assignedToId"
                  value={formData.assignedToId}
                  onChange={handleChange}
                  placeholder="Select agent (optional)"
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.email})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>Notes</FormLabel>
                <Textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Enter any notes about this lead"
                  rows={4}
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
                  colorScheme="blue"
                  isLoading={loading}
                  loadingText="Updating..."
                >
                  Update Lead
                </Button>
              </HStack>
            </VStack>
          </form>
        </CardBody>
      </Card>
    </Box>
  );
}
