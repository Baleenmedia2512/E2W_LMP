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
  VStack,
  SimpleGrid,
  useToast,
  FormErrorMessage,
  Text,
  Box,
  HStack,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  ModalFooter,
  AlertTitle,
  AlertDescription,
} from '@chakra-ui/react';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/shared/lib/auth/auth-context';
import { useFormValidation } from '@/shared/hooks/useFormValidation';
import { useUnsavedChanges } from '@/shared/hooks/useUnsavedChanges';
import { ConfirmDialog, useConfirmDialog } from '@/shared/components/ConfirmDialog';
import ValidatedInput from '@/shared/components/ValidatedInput';
import ValidatedTextarea from '@/shared/components/ValidatedTextarea';
import { normalizePhoneForStorage } from '@/shared/utils/phone';

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AddLeadModal({ isOpen, onClose, onSuccess }: AddLeadModalProps) {
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<User[]>([]);
  const { errors, validateField, clearError, setError, clearAllErrors } = useFormValidation();
  const confirmDialog = useConfirmDialog();
  const router = useRouter();
  
  // Phone prefill feature states
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [existingLead, setExistingLead] = useState<any>(null);
  const [showPrefillPrompt, setShowPrefillPrompt] = useState(false);
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [prefilledSnapshot, setPrefilledSnapshot] = useState<Record<string, string> | null>(null);

  // Get current date and time
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);

  const [formData, setFormData] = useState({
    date: currentDate,
    time: currentTime,
    source: '',
    lead_category: '' as '' | 'INBOUND' | 'OUTBOUND',
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
    assignedToId: 'SYSTEM', // Default to auto-assignment
  });

  const [initialFormData, setInitialFormData] = useState(formData);
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialFormData);
  useUnsavedChanges(hasChanges);

  // Reset form data when modal opens
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const newDate = now.toISOString().split('T')[0];
      const newTime = now.toTimeString().slice(0, 5);
      const freshData = {
        date: newDate,
        time: newTime,
        source: '',
        lead_category: '' as '' | 'INBOUND' | 'OUTBOUND',
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
        assignedToId: 'SYSTEM', // Default to auto-assignment
      };
      setFormData(freshData);
      setInitialFormData(freshData);
    }
  }, [isOpen, user?.id]);

  // Fetch agents from API
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await fetch('/api/users');
        if (response.ok) {
          const result = await response.json();
          console.log('Fetched users:', result); // Debug log
          
          // API returns { success: true, data: [...] }
          const usersList = result.data || result.users || [];
          console.log('Users list:', usersList); // Debug log
          
          // Normalize role name for comparison (handle both 'Sales Agent' and 'sales_agent')
          const normalizeRole = (role: string) => role?.toLowerCase().replace(/\s+/g, '_');
          const userRoleNormalized = normalizeRole(user?.role || '');
          
          if (userRoleNormalized === 'sales_agent') {
            setAgents(usersList.filter((u: User) => u.id === user.id));
          } else if (userRoleNormalized === 'team_lead') {
            setAgents(usersList.filter((u: User) => 
              normalizeRole(u.role) === 'sales_agent' || u.id === user.id
            ));
          } else {
            // Super Agent, Admin, or other roles - show all agents
            setAgents(usersList);
          }
          
          console.log('Filtered agents:', agents.length); // Debug log
        } else {
          console.error('Failed to fetch users - response not ok');
          setAgents([]);
        }
      } catch (err) {
        console.error('Failed to fetch agents:', err);
        setAgents([]);
        toast({
          title: 'Warning',
          description: 'Could not load users list',
          status: 'warning',
          duration: 3000,
        });
      }
    };
    
    if (isOpen && user) {
      fetchAgents();
    }
  }, [isOpen, user]);

  // Function to check if phone exists and fetch data
  const checkPhoneAndFetchData = async (phoneNumber: string) => {
    // Only check if we have a valid 10-digit phone
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length !== 10) {
      setExistingLead(null);
      setShowPrefillPrompt(false);
      return;
    }

    setIsCheckingPhone(true);
    try {
      const response = await fetch(`/api/leads/check-phone?phone=${digits}`);
      const data = await response.json();

      if (data.exists && data.lead) {
        setExistingLead(data.lead);
        setShowPrefillPrompt(true);
        
        // Automatically prefill the form with existing lead data
        setPrefilledSnapshot({
          name: data.lead.name || '',
          email: data.lead.email || '',
          alternatePhone: data.lead.alternatePhone || '',
          address: data.lead.address || '',
          city: data.lead.city || '',
          state: data.lead.state || '',
          pincode: data.lead.pincode || '',
          source: data.lead.source || '',
          campaign: data.lead.campaign || '',
          customerRequirement: data.lead.customerRequirement || '',
          lead_category: (data.lead.lead_category as string) || '',
        });
        setFormData(prev => {
          const prefilledData = {
            ...prev,
            name: data.lead.name || prev.name,
            email: data.lead.email || prev.email,
            alternatePhone: data.lead.alternatePhone || prev.alternatePhone,
            address: data.lead.address || prev.address,
            city: data.lead.city || prev.city,
            state: data.lead.state || prev.state,
            pincode: data.lead.pincode || prev.pincode,
            source: data.lead.source || prev.source,
            campaign: data.lead.campaign || prev.campaign,
            customerRequirement: data.lead.customerRequirement || prev.customerRequirement,
            lead_category: (data.lead.lead_category as '' | 'INBOUND' | 'OUTBOUND') || prev.lead_category,
          };
          // Update initialFormData to match prefilled data so auto-prefill doesn't count as "changes"
          setInitialFormData(prefilledData);
          return prefilledData;
        });
        
        toast({
          title: 'Lead Information Loaded',
          description: `Found existing lead: ${data.lead.name}`,
          status: 'info',
          duration: 3000,
        });
      } else {
        setExistingLead(null);
        setShowPrefillPrompt(false);
      }
    } catch (error) {
      console.error('Error checking phone:', error);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  // Function to prefill form with existing lead data
  const prefillFormData = () => {
    if (existingLead) {
      setFormData({
        ...formData,
        name: existingLead.name || formData.name,
        email: existingLead.email || formData.email,
        alternatePhone: existingLead.alternatePhone || formData.alternatePhone,
        address: existingLead.address || formData.address,
        city: existingLead.city || formData.city,
        state: existingLead.state || formData.state,
        pincode: existingLead.pincode || formData.pincode,
        source: existingLead.source || formData.source,
        campaign: existingLead.campaign || formData.campaign,
        customerRequirement: existingLead.customerRequirement || formData.customerRequirement,
        lead_category: (existingLead.lead_category as '' | 'INBOUND' | 'OUTBOUND') || formData.lead_category,
      });
      
      setShowPrefillPrompt(false);
      
      toast({
        title: 'Form Prefilled',
        description: 'Existing lead information has been loaded',
        status: 'info',
        duration: 3000,
      });
    }
  };

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

    if (!formData.lead_category) {
      setError('lead_category', 'Lead Category is required');
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

    // Block submit if existing lead detected but no changes made
    if (existingLead && prefilledSnapshot) {
      const fields = ['name', 'email', 'alternatePhone', 'address', 'city', 'state', 'pincode', 'source', 'campaign', 'customerRequirement', 'lead_category'] as const;
      const noChanges = fields.every(f => (formData[f] || '') === (prefilledSnapshot[f] || ''));
      if (noChanges) {
        setShowDuplicateAlert(true);
        return;
      }
    }

    setLoading(true);

    try {
      // AC-4: Clean phone number on manual entry (store only last 10 digits)
      const cleanedPhone = normalizePhoneForStorage(formData.phone);
      const cleanedAltPhone = formData.alternatePhone ? normalizePhoneForStorage(formData.alternatePhone) : null;
      
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: cleanedPhone,
          email: formData.email || null,
          alternatePhone: cleanedAltPhone,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || null,
          pincode: formData.pincode || null,
          status: 'new',
          source: formData.source,
          campaign: formData.campaign || null,
          customerRequirement: formData.customerRequirement || null,
          assignedToId: formData.assignedToId === 'SYSTEM' ? null : (formData.assignedToId || null),
          createdById: user?.id || null,
          lead_category: formData.lead_category,
          notes: null,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const isUpdate = !!existingLead;
        const wasAutoAssigned = formData.assignedToId === 'SYSTEM';
        const assignedAgent = result.data?.assignedTo?.name || 'an agent';
        
        toast({
          title: isUpdate ? 'Lead updated successfully' : 'Lead created successfully',
          description: isUpdate
            ? `${result.data.name} has been updated`
            : wasAutoAssigned
              ? `${result.data.name} has been added and auto-assigned to ${assignedAgent}`
              : `${result.data.name} has been added to the system`,
          status: 'success',
          duration: 4000,
        });
        resetAndClose();
        if (onSuccess) onSuccess();
      } else {
        throw new Error(existingLead ? 'Failed to update lead' : 'Failed to create lead');
      }
    } catch (error) {
      toast({
        title: existingLead ? 'Error updating lead' : 'Error creating lead',
        description: existingLead
          ? 'An error occurred while updating the lead'
          : 'An error occurred while creating the lead',
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
    
    // For phone fields, only allow numbers and limit to last 10 digits
    if (name === 'phone' || name === 'alternatePhone') {
      const numbersOnly = value.replace(/\D/g, '');
      // Take only last 10 digits to handle country code prefixes like +91 or 91
      const last10Digits = numbersOnly.slice(-10);
      setFormData({
        ...formData,
        [name]: last10Digits,
      });
      
      // Trigger phone lookup for the main phone field
      if (name === 'phone') {
        checkPhoneAndFetchData(last10Digits);
      }
    } else if (name === 'pincode') {
      const numbersOnly = value.replace(/\D/g, '').slice(0, 6);
      setFormData({
        ...formData,
        [name]: numbersOnly,
      });
    } else {
      // Auto-derive lead_category when source changes
      if (name === 'source') {
        const inboundSources = ['meta', 'website', 'whatsapp', 'online', 'referral', 'direct', 'consultant', 'indiamart', 'sulekha', 'just dial'];
        const autoCategory = inboundSources.includes(value.toLowerCase()) ? 'INBOUND' : 'OUTBOUND';
        setFormData({
          ...formData,
          [name]: value,
          lead_category: autoCategory,
        });
      } else {
        setFormData({
          ...formData,
          [name]: value,
        });
      }
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
      if (phoneDigits.length !== 10) {
        setError('phone', 'Client Contact must be exactly 10 digits');
      }
    }

    if (name === 'alternatePhone' && value.trim()) {
      const altPhoneDigits = value.replace(/\D/g, '');
      if (altPhoneDigits.length !== 10) {
        setError('alternatePhone', 'Alternate Phone must be exactly 10 digits');
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

  const formRef = useRef<HTMLFormElement>(null);

  const handleMenuSelect = (name: string, value: string) => {
    if (errors[name]) clearError(name);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleQuickSave = () => {
    formRef.current?.requestSubmit();
  };

  const resetAndClose = () => {
    const resetData = {
      date: currentDate,
      time: currentTime,
      source: '',
      lead_category: '' as '' | 'INBOUND' | 'OUTBOUND',
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
      assignedToId: 'SYSTEM', // Default to auto-assignment
    };
    setFormData(resetData);
    setInitialFormData(resetData);
    clearAllErrors();
    setExistingLead(null);
    setShowPrefillPrompt(false);
    setIsCheckingPhone(false);
    setShowDuplicateAlert(false);
    setPrefilledSnapshot(null);
    confirmDialog.onClose();
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} size={{ base: 'full', md: 'xl' }} scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent
          mx={0}
          my={0}
          borderRadius={{ base: 0, md: 'md' }}
          maxH={{ base: '100dvh', md: '90vh' }}
          h={{ base: '100dvh', md: 'auto' }}
        >
          <ModalHeader color="blue.500" fontSize={{ base: 'md', md: '2xl' }} py={{ base: 3, md: 4 }} px={{ base: 4, md: 6 }}>
            Add New Lead
            {hasChanges && (
              <Text as="span" color="orange.500" fontSize="sm" ml={2}>
                (Unsaved)
              </Text>
            )}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6} px={{ base: 4, md: 6 }} overflowY="auto">
            <form ref={formRef} onSubmit={handleSubmit}>
              <VStack spacing={4} align="stretch">

                {/* 1. Client Contact */}
                <ValidatedInput
                  label="Client Contact"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  error={errors.phone}
                  isRequired={true}
                  placeholder="Enter phone number (supports +91 prefix)"
                  size={{ base: 'sm', md: 'md' }}
                  helperText={isCheckingPhone ? "Checking for existing lead..." : "10 digits required (country code will be removed)"}
                />

                {/* Prefill Prompt */}
                {showPrefillPrompt && existingLead && (
                  <Box p={2.5} bg="blue.50" borderRadius="md" borderWidth="1px" borderColor="blue.200">
                    <HStack justify="space-between" align="start" spacing={2}>
                      <VStack align="start" spacing={1} flex="1">
                        <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                          ℹ️ Existing record found
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          Please update the record if any changes or additional information are required.
                        </Text>
                        <HStack spacing={3} pt={0.5} flexWrap="wrap">
                          <Text fontSize="xs" fontWeight="medium" color="gray.800">👤 {existingLead.name}</Text>
                          {existingLead.source && <Text fontSize="xs" color="gray.600">📱 {existingLead.source}</Text>}
                          {existingLead.campaign && <Text fontSize="xs" color="gray.600">📢 {existingLead.campaign}</Text>}
                        </HStack>
                      </VStack>
                      <Button size="xs" variant="ghost" colorScheme="blue" onClick={() => setShowPrefillPrompt(false)} minW="auto">✕</Button>
                    </HStack>
                  </Box>
                )}

                {/* 2. Client Name */}
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

                {/* 3. Source (renamed from Client Platform) */}
                <FormControl isRequired isInvalid={!!errors.source}>
                  <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">
                    Source <Text as="span" color="red.500">*</Text>
                  </FormLabel>
                  <Menu matchWidth>
                    <MenuButton
                      as={Button}
                      w="100%"
                      textAlign="left"
                      variant="outline"
                      fontWeight="normal"
                      color={formData.source ? 'gray.800' : 'gray.400'}
                      size={{ base: 'sm', md: 'md' }}
                      borderColor={errors.source ? 'red.500' : 'gray.200'}
                      _hover={{ borderColor: 'blue.300' }}
                      rightIcon={<Text as="span" fontSize="xs">▾</Text>}
                    >
                      {formData.source || 'Select a Source'}
                    </MenuButton>
                    <MenuList maxH="220px" overflowY="auto" zIndex={2000} fontSize={{ base: 'sm', md: 'md' }}>
                      {['ChatGPT','Cold Call','Consultant','Direct','Google Maps','Indiamart','Just Dial','LG','Meta','Newspaper','Online','Own','Referral','Sulekha','Web App DB','Website','WhatsApp'].map(opt => (
                        <MenuItem
                          key={opt}
                          onClick={() => handleMenuSelect('source', opt)}
                          bg={formData.source === opt ? 'blue.50' : undefined}
                          fontWeight={formData.source === opt ? 'semibold' : 'normal'}
                        >
                          {opt}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </Menu>
                  {errors.source && <FormErrorMessage>{errors.source}</FormErrorMessage>}
                </FormControl>

                {/* Lead Category — required, user must select */}
                <FormControl isRequired isInvalid={!!errors.lead_category}>
                  <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">
                    Lead Category
                  </FormLabel>
                  <HStack spacing={2}>
                    <Button
                      size="sm"
                      variant={formData.lead_category === 'INBOUND' ? 'solid' : 'outline'}
                      colorScheme={formData.lead_category === 'INBOUND' ? 'green' : 'gray'}
                      onClick={() => { setFormData(prev => ({ ...prev, lead_category: 'INBOUND' })); clearError('lead_category'); }}
                      flex={1}
                    >
                      INBOUND
                    </Button>
                    <Button
                      size="sm"
                      variant={formData.lead_category === 'OUTBOUND' ? 'solid' : 'outline'}
                      colorScheme={formData.lead_category === 'OUTBOUND' ? 'blue' : 'gray'}
                      onClick={() => { setFormData(prev => ({ ...prev, lead_category: 'OUTBOUND' })); clearError('lead_category'); }}
                      flex={1}
                    >
                      OUTBOUND
                    </Button>
                  </HStack>
                  {errors.lead_category
                    ? <FormErrorMessage>{errors.lead_category}</FormErrorMessage>
                    : formData.lead_category && (
                        <Text fontSize="2xs" color={formData.lead_category === 'INBOUND' ? 'green.600' : 'blue.600'} mt={1}>
                          {formData.lead_category === 'INBOUND'
                            ? '⚡ High priority — must be processed within 1 hour'
                            : 'Normal priority — no automatic SLA timer'}
                        </Text>
                      )
                  }
                </FormControl>

                {/* 4. Assigned To (name only) */}
                <FormControl>
                  <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">Assigned To:</FormLabel>
                  <Menu matchWidth>
                    <MenuButton
                      as={Button}
                      w="100%"
                      textAlign="left"
                      variant="outline"
                      fontWeight="normal"
                      color={formData.assignedToId ? 'gray.800' : 'gray.400'}
                      size={{ base: 'sm', md: 'md' }}
                      borderColor="gray.200"
                      _hover={{ borderColor: 'blue.300' }}
                      rightIcon={<Text as="span" fontSize="xs">▾</Text>}
                    >
                      {formData.assignedToId === 'SYSTEM'
                        ? '🤖 System (Auto-assign)'
                        : agents.find(a => a.id === formData.assignedToId)?.name || 'Loading...'}
                    </MenuButton>
                    <MenuList maxH="200px" overflowY="auto" zIndex={2000} fontSize={{ base: 'sm', md: 'md' }}>
                      <MenuItem
                        key="SYSTEM"
                        onClick={() => handleMenuSelect('assignedToId', 'SYSTEM')}
                        bg={formData.assignedToId === 'SYSTEM' ? 'blue.50' : undefined}
                        fontWeight={formData.assignedToId === 'SYSTEM' ? 'semibold' : 'normal'}
                        icon={<Text>🤖</Text>}
                      >
                        <VStack align="start" spacing={0}>
                          <Text>System (Auto-assign)</Text>
                          <Text fontSize="xs" color="gray.500">Assigns to agent with least work today</Text>
                        </VStack>
                      </MenuItem>
                      {agents.map(agent => (
                        <MenuItem
                          key={agent.id}
                          onClick={() => handleMenuSelect('assignedToId', agent.id)}
                          bg={formData.assignedToId === agent.id ? 'blue.50' : undefined}
                          fontWeight={formData.assignedToId === agent.id ? 'semibold' : 'normal'}
                        >
                          {agent.name}
                        </MenuItem>
                      ))}
                    </MenuList>
                  </Menu>
                  {formData.assignedToId === 'SYSTEM' && (
                    <Text fontSize="xs" color="blue.600" mt={1}>
                      ℹ️ Will automatically assign to agent with least workload today
                    </Text>
                  )}
                </FormControl>

                {/* Quick Submit button */}
                <Button
                  onClick={handleQuickSave}
                  colorScheme="green"
                  size={{ base: 'md', md: 'lg' }}
                  width="full"
                  isLoading={loading}
                  loadingText="Saving..."
                  isDisabled={!formData.phone || !formData.name || !formData.source || loading}
                >
                  ⚡ Quick Submit
                </Button>

                {/* Optional Details divider */}
                <HStack spacing={3} pt={2}>
                  <Divider />
                  <Text fontSize="xs" color="gray.400" whiteSpace="nowrap" fontWeight="600">OPTIONAL DETAILS</Text>
                  <Divider />
                </HStack>

                {/* Date / Time */}
                <SimpleGrid columns={2} spacing={3}>
                  <FormControl>
                    <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">Date:</FormLabel>
                    <Input type="date" name="date" value={formData.date} onChange={handleChange} size={{ base: 'sm', md: 'md' }} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize={{ base: 'xs', md: 'sm' }} fontWeight="600">Time:</FormLabel>
                    <Input type="time" name="time" value={formData.time} onChange={handleChange} size={{ base: 'sm', md: 'md' }} />
                  </FormControl>
                </SimpleGrid>

                {/* Ad Enquiry */}
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

                {/* Email / Alternate Phone */}
                <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
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
                    placeholder="Alternate number (supports +91 prefix, optional)"
                    size={{ base: 'sm', md: 'md' }}
                    helperText="10 digits optional (country code will be removed)"
                  />
                </SimpleGrid>

                {/* Address */}
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

                {/* City / State / Pincode */}
                <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
                  <ValidatedInput label="City" name="city" value={formData.city} onChange={handleChange} error={errors.city} placeholder="City (optional)" size={{ base: 'sm', md: 'md' }} maxLength={50} />
                  <ValidatedInput label="State" name="state" value={formData.state} onChange={handleChange} error={errors.state} placeholder="State (optional)" size={{ base: 'sm', md: 'md' }} maxLength={50} />
                  <ValidatedInput label="Pincode" name="pincode" value={formData.pincode} onChange={handleChange} onBlur={handleBlur} error={errors.pincode} placeholder="6 digit pincode (optional)" maxLength={6} size={{ base: 'sm', md: 'md' }} helperText="6 digits (optional)" />
                </SimpleGrid>

                {/* Remarks */}
                <ValidatedTextarea
                  label="Remarks"
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

                {/* Full Submit */}
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

      {/* Duplicate Lead Alert */}
      {showDuplicateAlert && existingLead && (
        <Modal isOpen={showDuplicateAlert} onClose={() => setShowDuplicateAlert(false)} isCentered size="md">
          <ModalOverlay />
          <ModalContent mx={4}>
            <ModalHeader fontSize="lg" pb={2}>
              ⚠️ Lead Already Exists
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={2}>
              <VStack align="start" spacing={3}>
                <Box p={3} bg="orange.50" borderRadius="md" borderWidth="1px" borderColor="orange.200" w="full">
                  <Text fontSize="xs" color="orange.800" fontWeight="medium">
                    No changes made. Please update something before submitting.
                  </Text>
                </Box>
              </VStack>
            </ModalBody>
            <ModalFooter gap={2} flexWrap="wrap" justifyContent="flex-start" pt={3}>
              <Button
                variant="ghost"
                colorScheme="red"
                size="sm"
                onClick={() => setShowDuplicateAlert(false)}
              >
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

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





