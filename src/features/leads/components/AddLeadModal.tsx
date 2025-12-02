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
  FormErrorMessage,
  Text,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/shared/lib/auth/auth-context';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { useUnsavedChanges } from '@/shared/hooks/useUnsavedChanges';
import { ConfirmDialog, useConfirmDialog } from '@/shared/components/ConfirmDialog';
import ValidatedInput from '@/shared/components/ValidatedInput';
import ValidatedTextarea from '@/shared/components/ValidatedTextarea';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AddLeadModal({ isOpen, onClose }: AddLeadModalProps) {
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);
  const { errors, validateField, clearError, setError, clearAllErrors } = useFormValidation();
  const confirmDialog = useConfirmDialog();

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
    alternatePhone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    customerRequirement: '',
    assignedToId: user?.id || '',
  });

  const [initialFormData] = useState(formData);
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
  useUnsavedChanges(hasChanges);

  // Fetch agents from API
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const data = await response.json();
          if (user?.role === 'sales_agent') {
            setAgents(data.users.filter((u: User) => u.id === user.id));
          } else if (user?.role === 'team_lead') {
            setAgents(data.users.filter((u: User) => 
              u.role === 'sales_agent' || u.id === user.id
            ));
          } else {
            setAgents(data.users || []);
          }
        }
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      }
    };
    
    if (isOpen && user) {
      fetchAgents();
    }
  }, [isOpen, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAllErrors();

    // Validate required fields
    let hasErrors = false;

    if (!formData.name.trim()) {
      setError('name', 'Client Name is required');
      hasErrors = true;
    }

    if (!formData.phone.trim()) {
      setError('phone', 'Client Contact is required');
      hasErrors = true;
    } else {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        setError('phone', 'Client Contact must be 10 digits or include valid country code');
        hasErrors = true;
      }
    }

    if (!formData.source) {
      setError('source', 'Client Platform is required');
      hasErrors = true;
    }

    // Validate email if provided
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('email', 'Please enter a valid email address');
        hasErrors = true;
      }
    }

    // Validate alternate phone if provided
    if (formData.alternatePhone.trim()) {
      const altPhoneDigits = formData.alternatePhone.replace(/\D/g, '');
      if (altPhoneDigits.length < 10 || altPhoneDigits.length > 15) {
        setError('alternatePhone', 'Alternate Phone must be 10 digits or include valid country code');
        hasErrors = true;
      }
    }

    // Validate pincode if provided
    if (formData.pincode.trim()) {
      const pincodeRegex = /^[1-9][0-9]{5}$/;
      if (!pincodeRegex.test(formData.pincode)) {
        setError('pincode', 'Please enter a valid 6-digit Indian pincode');
        hasErrors = true;
      }
    }

    if (hasErrors) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);

    try {
      const phoneDigits = formData.phone.replace(/\D/g, '');
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: phoneDigits,
          email: formData.email || null,
          alternatePhone: formData.alternatePhone || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          pincode: formData.pincode || null,
          status: 'new',
          source: formData.source,
          campaign: formData.campaign || null,
          customerRequirement: formData.customerRequirement || null,
          assignedToId: formData.assignedToId || user?.id || null,
          createdById: user?.id || null,
          notes: null,
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
        handleClose();
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Clear error when user starts typing
    if (errors[name]) {
      clearError(name);
    }
    
    // For phone fields, only allow numbers
    if (name === 'phone' || name === 'alternatePhone') {
      const numbersOnly = value.replace(/\D/g, '');
      setFormData({
        ...formData,
        [name]: numbersOnly,
      });
    } else if (name === 'pincode') {
      const numbersOnly = value.replace(/\D/g, '').slice(0, 6);
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

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Real-time validation on blur
    if (name === 'email' && value.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setError('email', 'Please enter a valid email address');
      }
    }

    if (name === 'phone' && value.trim()) {
      const phoneDigits = value.replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        setError('phone', 'Client Contact must be 10 digits or include valid country code');
      }
    }

    if (name === 'alternatePhone' && value.trim()) {
      const altPhoneDigits = value.replace(/\D/g, '');
      if (altPhoneDigits.length < 10 || altPhoneDigits.length > 15) {
        setError('alternatePhone', 'Alternate Phone must be 10 digits or include valid country code');
      }
    }

    if (name === 'pincode' && value.trim()) {
      const pincodeRegex = /^[1-9][0-9]{5}$/;
      if (!pincodeRegex.test(value)) {
        setError('pincode', 'Please enter a valid 6-digit Indian pincode');
      }
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      confirmDialog.onOpen();
    } else {
      resetAndClose();
    }
  };

  const resetAndClose = () => {
    setFormData({
      date: currentDate,
      time: currentTime,
      source: '',
      name: '',
      campaign: '',
      phone: '',
      alternatePhone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      customerRequirement: '',
      assignedToId: user?.id || '',
    });
    clearAllErrors();
    confirmDialog.onClose();
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} size={{ base: 'full', md: 'xl' }}>
        <ModalOverlay />
        <ModalContent mx={{ base: 0, md: 4 }} my={{ base: 0, md: 16 }}>
          <ModalHeader color="blue.500" fontSize={{ base: 'lg', md: '2xl' }}>
            Add New Lead
            {hasChanges && (
              <Text as="span" color="orange.500" fontSize="sm" ml={2}>
                (Unsaved)
              </Text>
            )}
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
                  <FormControl isRequired isInvalid={!!errors.source}>
                    <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">
                      Client Platform <Text as="span" color="red.500">*</Text>
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
                    {errors.source && <FormErrorMessage>{errors.source}</FormErrorMessage>}
                  </FormControl>

                  <ValidatedInput
                    label="Client Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.name}
                    isRequired={true}
                    placeholder="Enter client name"
                    size={{ base: 'sm', md: 'md' }}
                    maxLength={100}
                    showCharCount={true}
                  />
                </SimpleGrid>

                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                  <ValidatedInput
                    label="Ad Enquiry"
                    name="campaign"
                    value={formData.campaign}
                    onChange={handleChange}
                    error={errors.campaign}
                    placeholder="Campaign/Ad details"
                    size={{ base: 'sm', md: 'md' }}
                    maxLength={100}
                  />

                  <ValidatedInput
                    label="Client Contact"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.phone}
                    isRequired={true}
                    placeholder="Enter 10 digit phone number"
                    maxLength={10}
                    size={{ base: 'sm', md: 'md' }}
                    helperText="10 digits required"
                  />
                </SimpleGrid>

                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
                  <ValidatedInput
                    label="Client Email Address"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.email}
                    placeholder="Email address (optional)"
                    size={{ base: 'sm', md: 'md' }}
                    maxLength={100}
                  />

                  <ValidatedInput
                    label="Alternate Phone"
                    name="alternatePhone"
                    value={formData.alternatePhone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.alternatePhone}
                    placeholder="10 digit alternate number (optional)"
                    maxLength={10}
                    size={{ base: 'sm', md: 'md' }}
                    helperText="10 digits (optional)"
                  />
                </SimpleGrid>

                <ValidatedInput
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  error={errors.address}
                  placeholder="Street address (optional)"
                  size={{ base: 'sm', md: 'md' }}
                  maxLength={200}
                />

                <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4}>
                  <ValidatedInput
                    label="City"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    error={errors.city}
                    placeholder="City (optional)"
                    size={{ base: 'sm', md: 'md' }}
                    maxLength={50}
                  />

                  <ValidatedInput
                    label="State"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    error={errors.state}
                    placeholder="State (optional)"
                    size={{ base: 'sm', md: 'md' }}
                    maxLength={50}
                  />

                  <ValidatedInput
                    label="Pincode"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={errors.pincode}
                    placeholder="6 digit pincode (optional)"
                    maxLength={6}
                    size={{ base: 'sm', md: 'md' }}
                    helperText="6 digits (optional)"
                  />
                </SimpleGrid>

                <ValidatedTextarea
                  label="Customer Requirement"
                  name="customerRequirement"
                  value={formData.customerRequirement}
                  onChange={handleChange}
                  error={errors.customerRequirement}
                  placeholder="What does the customer need?"
                  size={{ base: 'sm', md: 'md' }}
                  maxLength={500}
                  showCharCount={true}
                  rows={3}
                />

                <FormControl>
                  <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">
                    Handled By:
                  </FormLabel>
                  <Select
                    name="assignedToId"
                    value={formData.assignedToId}
                    onChange={handleChange}
                    size={{ base: 'sm', md: 'md' }}
                  >
                    {agents.length === 0 && (
                      <option value="">Loading...</option>
                    )}
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
                  isDisabled={!hasChanges || loading}
                >
                  Submit
                </Button>
              </VStack>
            </form>
          </ModalBody>
        </ModalContent>
      </Modal>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.onClose}
        onConfirm={resetAndClose}
        title="Discard Changes?"
        message="You have unsaved changes. Are you sure you want to close this form? All changes will be lost."
        confirmText="Discard"
        cancelText="Keep Editing"
        confirmColorScheme="red"
      />
    </>
  );
}





