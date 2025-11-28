'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  VStack,
  SimpleGrid,
  useToast,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: {
    name: string;
  };
}

export default function AddLeadModal({ isOpen, onClose }: AddLeadModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);

  // Fetch agents from API
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        // In a real scenario, you'd fetch agents from an API endpoint
        // For now, we'll use empty array as placeholder
        setAgents([]);
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      }
    };
    
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  // Get current date and time
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);

  const [formData, setFormData] = useState({
    date: currentDate,
    time: currentTime,
    source: '',
    name: '',
    campaign: '',
    phone: '',
    email: '',
    customerRequirement: '',
    assignedToId: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name || !formData.phone || !formData.source) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in Client Name, Client Contact, and Client Platform',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      // Create lead via API
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email || null,
          alternatePhone: null,
          address: null,
          city: null,
          state: null,
          pincode: null,
          status: 'new',
          source: formData.source,
          campaign: formData.campaign || null,
          customerRequirement: formData.customerRequirement || null,
          assignedToId: formData.assignedToId || null,
          createdById: null,
          notes: `Lead created on ${formData.date} at ${formData.time}${formData.campaign ? '. Campaign: ' + formData.campaign : ''}`,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Lead created successfully',
          description: `${result.data.name} has been added to the system`,
          status: 'success',
          duration: 3000,
        });
        onClose();
        // Refresh page to see new lead
        setTimeout(() => window.location.reload(), 500);
      } else {
        throw new Error('Failed to create lead');
      }
    } catch (error) {
      toast({
        title: 'Error creating lead',
        description: 'An error occurred while creating the lead',
        status: 'error',
        duration: 3000,
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleClose = () => {
    // Reset form on close
    setFormData({
      date: currentDate,
      time: currentTime,
      source: '',
      name: '',
      campaign: '',
      phone: '',
      email: '',
      customerRequirement: '',
      assignedToId: '',
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size={{ base: 'full', md: 'xl' }}>
      <ModalOverlay />
      <ModalContent mx={{ base: 0, md: 4 }} my={{ base: 0, md: 16 }}>
        <ModalHeader color="blue.500" fontSize={{ base: 'lg', md: '2xl' }}>
          Add New Lead
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <form onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">
                    Date:
                  </FormLabel>
                  <Input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    size={{ base: 'sm', md: 'md' }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">
                    Time:
                  </FormLabel>
                  <Input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleChange}
                    size={{ base: 'sm', md: 'md' }}
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                <FormControl isRequired>
                  <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">
                    Client Platform:
                  </FormLabel>
                  <Select
                    name="source"
                    value={formData.source}
                    onChange={handleChange}
                    placeholder="Select a Platform"
                    size={{ base: 'sm', md: 'md' }}
                  >
                    <option value="Website">Website</option>
                    <option value="Meta">Meta</option>
                    <option value="Referral">Referral</option>
                    <option value="Cold Call">Cold Call</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Direct">Direct</option>
                  </Select>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">
                    Client Name:
                  </FormLabel>
                  <Input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter client name"
                    size={{ base: 'sm', md: 'md' }}
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">
                    Ad Enquiry:
                  </FormLabel>
                  <Input
                    name="campaign"
                    value={formData.campaign}
                    onChange={handleChange}
                    placeholder="Campaign/Ad details"
                    size={{ base: 'sm', md: 'md' }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">
                    Client Contact:
                  </FormLabel>
                  <Input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Phone number"
                    size={{ base: 'sm', md: 'md' }}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">
                  Client Email Address:
                </FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Email address (optional)"
                  size={{ base: 'sm', md: 'md' }}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">
                  Customer Requirement:
                </FormLabel>
                <Input
                  name="customerRequirement"
                  value={formData.customerRequirement}
                  onChange={handleChange}
                  placeholder="What does the customer need?"
                  size={{ base: 'sm', md: 'md' }}
                />
              </FormControl>

              <FormControl>
                <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">
                  Handled By:
                </FormLabel>
                <Select
                  name="assignedToId"
                  value={formData.assignedToId}
                  onChange={handleChange}
                  placeholder="Select a Handled By"
                  size={{ base: 'sm', md: 'md' }}
                >
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.email})
                    </option>
                  ))}
                </Select>
              </FormControl>

              <Button
                type="submit"
                colorScheme="blue"
                size={{ base: 'md', md: 'lg' }}
                width="full"
                isLoading={loading}
                loadingText="Creating..."
                mt={2}
              >
                Submit
              </Button>
            </VStack>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}





