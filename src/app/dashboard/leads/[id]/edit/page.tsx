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
  Spinner,
  Text,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/shared/lib/auth/auth-context';
import { normalizePhoneForStorage, cleanPhoneNumber } from '@/shared/utils/phone';

interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  source?: string;
  campaign?: string;
  customerRequirement?: string;
  status: string;
  assignedTo?: { id: string; name: string; email: string };
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function EditLeadPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingLead, setLoadingLead] = useState(true);
  const [lead, setLead] = useState<Lead | null>(null);
  const [agents, setAgents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const leadId = params?.id as string;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    alternatePhone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    campaign: '',
    customerRequirement: '',
    status: 'new' as any,
    assignedToId: '',
    notes: ''
  });

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          const usersList = data.data || data.users || [];
          // Filter based on role:
          // Sales Agent: sees only themselves
          // Lead/Team Lead: sees sales agents + themselves
          // Super Agent/Admin: sees all
          if (user?.role === 'sales_agent') {
            setAgents(usersList.filter((u: any) => u.id === user.id));
          } else if (user?.role === 'team_lead') {
            setAgents(usersList.filter((u: any) => 
              u.role === 'sales_agent' || u.id === user.id
            ));
          } else {
            setAgents(usersList);
          }
        }
      } catch (error) {
        console.error('Failed to fetch agents:', error);
      }
    };

    fetchAgents();
  }, [user]);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const res = await fetch(`/api/leads/${leadId}`);
        if (!res.ok) throw new Error('Lead not found');
        const response = await res.json();
        // Extract lead data from response wrapper
        const data = response.data || response;
        setLead(data);

        setFormData({
          name: data.name,
          phone: cleanPhoneNumber(data.phone),
          email: data.email || '',
          alternatePhone: cleanPhoneNumber(data.alternatePhone),
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          pincode: data.pincode || '',
          campaign: data.campaign || '',
          customerRequirement: data.customerRequirement || '',
          status: data.status,
          assignedToId: data.assignedTo?.id || '',
          notes: data.notes || ''
        });
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
    const { name, value } = e.target;
    
    // For phone fields, only allow numbers
    if (name === 'phone' || name === 'alternatePhone') {
      const numbersOnly = value.replace(/\D/g, '');
      setFormData({
        ...formData,
        [name]: numbersOnly,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in Name and Phone',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    // Validate phone number (10 digits local or 10-15 digits international)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      toast({
        title: 'Invalid phone number',
        description: 'Phone number must be 10 digits or include valid country code',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    // Validate email if provided
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast({
          title: 'Invalid email',
          description: 'Please enter a valid email address',
          status: 'error',
          duration: 3000,
        });
        return;
      }
    }

    // Validate alternate phone if provided
    if (formData.alternatePhone && formData.alternatePhone.trim()) {
      const altPhoneDigits = formData.alternatePhone.replace(/\D/g, '');
      if (altPhoneDigits.length < 10 || altPhoneDigits.length > 15) {
        toast({
          title: 'Invalid alternate phone',
          description: 'Alternate phone must be 10 digits or include valid country code',
          status: 'error',
          duration: 3000,
        });
        return;
      }
    }

    // Validate pincode if provided
    if (formData.pincode && formData.pincode.trim()) {
      const pincodeRegex = /^[1-9][0-9]{5}$/;
      if (!pincodeRegex.test(formData.pincode)) {
        toast({
          title: 'Invalid pincode',
          description: 'Please enter a valid 6-digit pincode',
          status: 'error',
          duration: 3000,
        });
        return;
      }
    }

    setLoading(true);

    try {
      // AC-4: Clean phone numbers on manual entry (store only last 10 digits)
      const cleanedPhone = normalizePhoneForStorage(formData.phone);
      const cleanedAltPhone = formData.alternatePhone ? normalizePhoneForStorage(formData.alternatePhone) : null;
      
      const updateData: any = {
        name: formData.name,
        phone: cleanedPhone,
        email: formData.email || null,
        alternatePhone: cleanedAltPhone,
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        pincode: formData.pincode || null,
        campaign: formData.campaign || null,
        customerRequirement: formData.customerRequirement || null,
        status: formData.status,
        notes: formData.notes || null,
        updatedById: user?.id,
      };

      if (formData.assignedToId) {
        updateData.assignedToId = formData.assignedToId;
      }

      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error('Failed to update lead');

      toast({
        title: 'Lead updated successfully',
        description: `${formData.name}'s information has been updated. Changes are now visible in the lead list and detail view.`,
        status: 'success',
        duration: 4000,
        isClosable: true,
      });

      setLoading(false);
      // Use router.push with force refresh to ensure lead list updates
      router.push(`/dashboard/leads/${leadId}`);
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error updating lead',
        description: error instanceof Error ? error.message : 'Something went wrong',
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
              {/* Protected Fields - Read Only */}
              <Box bg="gray.50" p={4} borderRadius="md" borderLeft="4px" borderColor="blue.500">
                <Heading size="sm" mb={3} color="gray.700">Lead Information (Read-Only)</Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="gray.600">Lead ID</Text>
                    <Text fontSize="sm" color="gray.800">{lead.id}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="gray.600">Created At</Text>
                    <Text fontSize="sm" color="gray.800">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\//g, '-') + ' ' + new Date(lead.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                    </Text>
                  </Box>
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="gray.600">Last Updated</Text>
                    <Text fontSize="sm" color="gray.800">
                      {lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/\//g, '-') + ' ' + new Date(lead.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                    </Text>
                  </Box>
                </SimpleGrid>
              </Box>

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
                    placeholder="Enter 10 digit phone number"
                    maxLength={10}
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
                    placeholder="Enter 10 digit alternate phone"
                    maxLength={10}
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
                    placeholder="Enter 6-digit pincode"
                    maxLength={6}
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>Source (Cannot be changed)</FormLabel>
                  <Input
                    value={lead.source}
                    isReadOnly
                    bg="gray.100"
                    cursor="not-allowed"
                    _hover={{ bg: "gray.100" }}
                  />
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
                <FormLabel>Remarks</FormLabel>
                <Input
                  name="customerRequirement"
                  value={formData.customerRequirement}
                  onChange={handleChange}
                  placeholder="What does the customer need?"
                />
              </FormControl>

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
