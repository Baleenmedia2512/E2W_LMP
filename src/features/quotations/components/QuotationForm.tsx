'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Divider,
  FormControl,
  FormLabel,
  FormErrorMessage,
  FormHelperText,
  Heading,
  Input,
  InputGroup,
  InputLeftAddon,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  IconButton,
  Text,
  Badge,
  useToast,
  HStack,
  Textarea,
  Alert,
  AlertIcon,
  AlertDescription,
  Tooltip,
  Spinner,
} from '@chakra-ui/react';
import { DeleteIcon, AddIcon, InfoIcon } from '@chakra-ui/icons';
import { AdvertisementMedium, QuotationItem } from '../types';
import { getMediumOptions, getMediumDisplayName } from '../constants/mediums';
import { useQuotationCalculator } from '../hooks/useQuotationCalculator';
import { MediumSelector } from './MediumSelector';
import { LocationSelector } from './LocationSelector';
import { NewspaperSelector } from './NewspaperSelector';

interface QuotationFormProps {
  leadId?: string;
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  onSave?: (data: any) => void;
  onPreview?: (data: any) => void;
}

export const QuotationForm = ({
  leadId,
  leadName = '',
  leadEmail = '',
  leadPhone = '',
  onSave,
  onPreview,
}: QuotationFormProps) => {
  const toast = useToast();
  const { items, discount, setDiscount, addItem, updateItem, removeItem, calculations } = useQuotationCalculator();

  // Form state
  const [customerName, setCustomerName] = useState(leadName);
  const [customerEmail, setCustomerEmail] = useState(leadEmail);
  const [customerPhone, setCustomerPhone] = useState(leadPhone);
  const [customerCompany, setCustomerCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [validDays, setValidDays] = useState(30);
  
  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Current item being added
  const [currentMedium, setCurrentMedium] = useState<AdvertisementMedium | ''>('');
  const [currentOption, setCurrentOption] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [currentLocationName, setCurrentLocationName] = useState('');
  const [currentDuration, setCurrentDuration] = useState(1);
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [currentUnitPrice, setCurrentUnitPrice] = useState(0);
  
  // Newspaper-specific fields
  const [currentNewspaper, setCurrentNewspaper] = useState('');
  const [currentNewspaperLanguage, setCurrentNewspaperLanguage] = useState<'english' | 'tamil'>('tamil');
  const [currentNewspaperCategory, setCurrentNewspaperCategory] = useState('');
  const [currentLines, setCurrentLines] = useState(1); // For line ads

  const mediumOptions = currentMedium ? getMediumOptions(currentMedium) : [];
  const selectedOption = mediumOptions.find(opt => opt.id === currentOption);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    const regex = /^[0-9]{10}$/;
    return regex.test(phone.replace(/[\s-]/g, ''));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    }

    if (!customerEmail.trim()) {
      newErrors.customerEmail = 'Email is required';
    } else if (!validateEmail(customerEmail)) {
      newErrors.customerEmail = 'Invalid email format';
    }

    if (!customerPhone.trim()) {
      newErrors.customerPhone = 'Phone number is required';
    } else if (!validatePhone(customerPhone)) {
      newErrors.customerPhone = 'Invalid phone number (10 digits required)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddItem = () => {
    if (!currentMedium || !currentOption) {
      toast({
        title: 'Missing information',
        description: 'Please select medium and option',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    // Validate newspaper-specific fields
    if (currentMedium === 'newspaper' && !currentNewspaper) {
      toast({
        title: 'Missing newspaper',
        description: 'Please select a newspaper',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    if (currentUnitPrice <= 0) {
      toast({
        title: 'Invalid price',
        description: 'Please enter a valid unit price',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    addItem({
      medium: currentMedium,
      mediumOption: currentOption,
      location: currentLocationName || currentNewspaper || undefined,
      duration: currentDuration,
      quantity: currentQuantity,
      unitPrice: currentUnitPrice,
      specifications: {
        optionName: selectedOption?.name,
        ...(currentLocationName && { location: currentLocationName }),
        ...(selectedOption?.specifications && {
          dimensions: selectedOption.specifications.dimensions,
          size: selectedOption.specifications.size,
          color: selectedOption.specifications.color,
          area: selectedOption.specifications.area,
        }),
        ...(currentMedium === 'newspaper' && {
          newspaper: currentNewspaper,
          category: currentNewspaperCategory,
          lines: currentOption.includes('line_ad') ? currentLines : undefined,
        }),
      },
    });

    // Reset form
    setCurrentOption('');
    setCurrentLocation('');
    setCurrentLocationName('');
    setCurrentNewspaper('');
    setCurrentNewspaperCategory('');
    setCurrentLines(1);
    setCurrentDuration(1);
    setCurrentQuantity(1);
    setCurrentUnitPrice(0);

    toast({
      title: 'Item added',
      status: 'success',
      duration: 2000,
    });
  };

  const handlePreview = () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in customer information',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: 'No items',
        description: 'Please add at least one item to preview',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    const quotationData = {
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      leadId,
      items,
      discount,
      notes,
      validDays,
      calculations,
    };

    onPreview?.(quotationData);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in customer information',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    if (items.length === 0) {
      toast({
        title: 'No items',
        description: 'Please add at least one item',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const quotationData = {
        customerName,
        customerEmail,
        customerPhone,
        customerCompany,
        leadId,
        items,
        discount,
        notes,
        validDays,
        calculations,
      };

      await onSave?.(quotationData);
      
      toast({
        title: 'Success',
        description: 'Quotation saved successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save quotation',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Stack spacing={6}>
      {/* Customer Information */}
      <Card variant="outline" borderColor="blue.200" borderWidth="2px">
        <CardHeader bg="blue.50">
          <Heading size="md" color="blue.800">Customer Information</Heading>
          <Text fontSize="sm" color="gray.600" mt={1}>
            Please provide accurate customer details for the quotation
          </Text>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isRequired isInvalid={!!errors.customerName}>
              <FormLabel>Customer Name</FormLabel>
              <Input
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  if (errors.customerName) {
                    setErrors({ ...errors, customerName: '' });
                  }
                }}
                placeholder="Enter customer name"
                size="lg"
              />
              <FormErrorMessage>{errors.customerName}</FormErrorMessage>
            </FormControl>

            <FormControl>
              <FormLabel>
                Company Name
                <Tooltip label="Optional - Add if customer represents a company">
                  <InfoIcon ml={2} boxSize={3} color="gray.400" />
                </Tooltip>
              </FormLabel>
              <Input
                value={customerCompany}
                onChange={(e) => setCustomerCompany(e.target.value)}
                placeholder="Enter company name (optional)"
                size="lg"
              />
              <FormHelperText>Optional field</FormHelperText>
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.customerEmail}>
              <FormLabel>Email Address</FormLabel>
              <InputGroup size="lg">
                <InputLeftAddon>📧</InputLeftAddon>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => {
                    setCustomerEmail(e.target.value);
                    if (errors.customerEmail) {
                      setErrors({ ...errors, customerEmail: '' });
                    }
                  }}
                  placeholder="customer@example.com"
                />
              </InputGroup>
              <FormErrorMessage>{errors.customerEmail}</FormErrorMessage>
              {!errors.customerEmail && customerEmail && validateEmail(customerEmail) && (
                <FormHelperText color="green.600">✓ Valid email</FormHelperText>
              )}
            </FormControl>

            <FormControl isRequired isInvalid={!!errors.customerPhone}>
              <FormLabel>Phone Number</FormLabel>
              <InputGroup size="lg">
                <InputLeftAddon>📱</InputLeftAddon>
                <Input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    if (errors.customerPhone) {
                      setErrors({ ...errors, customerPhone: '' });
                    }
                  }}
                  placeholder="10-digit phone number"
                />
              </InputGroup>
              <FormErrorMessage>{errors.customerPhone}</FormErrorMessage>
              {!errors.customerPhone && customerPhone && validatePhone(customerPhone) && (
                <FormHelperText color="green.600">✓ Valid phone number</FormHelperText>
              )}
            </FormControl>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Add Items */}
      <Card variant="outline" borderColor="purple.200" borderWidth="2px">
        <CardHeader bg="purple.50">
          <Heading size="md" color="purple.800">Add Advertisement Items</Heading>
          <Text fontSize="sm" color="gray.600" mt={1}>
            Select medium and configure advertisement options
          </Text>
        </CardHeader>
        <CardBody>
          <Stack spacing={6}>
            <MediumSelector
              value={currentMedium as AdvertisementMedium}
              onChange={setCurrentMedium}
            />

            {currentMedium && (
              <>
                <Divider />
                <FormControl isRequired>
                  <FormLabel>Select Option</FormLabel>
                  <Select
                    placeholder="Choose advertisement option"
                    value={currentOption}
                    onChange={(e) => {
                      setCurrentOption(e.target.value);
                      const option = mediumOptions.find(opt => opt.id === e.target.value);
                      if (option) {
                        setCurrentUnitPrice(option.priceRange.min);
                      }
                    }}
                  >
                    {mediumOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name} - ₹{option.priceRange.min.toLocaleString()} - ₹
                        {option.priceRange.max.toLocaleString()} {option.priceRange.unit}
                      </option>
                    ))}
                  </Select>
                  {selectedOption && (
                    <Box mt={3} p={3} bg="blue.50" borderRadius="md" borderLeft="3px solid" borderLeftColor="blue.500">
                      <Text fontSize="sm" color="gray.700" mb={2}>
                        {selectedOption.description}
                      </Text>
                      {selectedOption.specifications && (
                        <HStack spacing={3} flexWrap="wrap">
                          {selectedOption.specifications.dimensions && (
                            <Badge colorScheme="teal" fontSize="xs" px={2} py={1}>
                              📏 {selectedOption.specifications.dimensions.displayText || 
                                  `${selectedOption.specifications.dimensions.width}${selectedOption.specifications.dimensions.unit} × ${selectedOption.specifications.dimensions.height}${selectedOption.specifications.dimensions.unit}`}
                            </Badge>
                          )}
                          {selectedOption.specifications.size && (
                            <Badge colorScheme="orange" fontSize="xs" px={2} py={1}>
                              📐 {selectedOption.specifications.size}
                            </Badge>
                          )}
                          {selectedOption.specifications.area && (
                            <Badge colorScheme="purple" fontSize="xs" px={2} py={1}>
                              📊 {selectedOption.specifications.area} sq{selectedOption.specifications.dimensions?.unit || 'ft'}
                            </Badge>
                          )}
                          {selectedOption.specifications.color && (
                            <Badge colorScheme="pink" fontSize="xs" px={2} py={1}>
                              🎨 {selectedOption.specifications.color}
                            </Badge>
                          )}
                          {selectedOption.specifications.position && (
                            <Badge colorScheme="cyan" fontSize="xs" px={2} py={1}>
                              📍 {selectedOption.specifications.position}
                            </Badge>
                          )}
                          {selectedOption.specifications.duration && (
                            <Badge colorScheme="yellow" fontSize="xs" px={2} py={1}>
                              ⏱️ {selectedOption.specifications.duration}
                            </Badge>
                          )}
                        </HStack>
                      )}
                    </Box>
                  )}
                </FormControl>

                {/* Newspaper Selector - shown only for newspaper medium */}
                {currentMedium === 'newspaper' && (
                  <>
                    <Divider />
                    <NewspaperSelector
                      selectedNewspaper={currentNewspaper}
                      selectedLanguage={currentNewspaperLanguage}
                      selectedCategory={currentNewspaperCategory}
                      onNewspaperChange={setCurrentNewspaper}
                      onLanguageChange={setCurrentNewspaperLanguage}
                      onCategoryChange={setCurrentNewspaperCategory}
                      showLanguageFilter={true}
                      showCategoryFilter={true}
                    />
                    
                    {/* For line ads, show number of lines input */}
                    {currentOption.includes('line_ad') && (
                      <FormControl>
                        <FormLabel>Number of Lines</FormLabel>
                        <NumberInput
                          min={1}
                          max={50}
                          value={currentLines}
                          onChange={(_, val) => setCurrentLines(val)}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          Pricing is per line. Total: ₹{(currentUnitPrice * currentLines * currentDuration).toLocaleString()}
                        </Text>
                      </FormControl>
                    )}
                  </>
                )}

                {currentMedium && ['hoarding', 'bus_shelter', 'auto', 'van_branding'].includes(currentMedium) && (
                  <LocationSelector
                    medium={currentMedium}
                    value={currentLocation}
                    onChange={(id, name) => {
                      setCurrentLocation(id);
                      setCurrentLocationName(name);
                    }}
                  />
                )}

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Duration (days/months)</FormLabel>
                    <NumberInput
                      min={1}
                      value={currentDuration}
                      onChange={(_, val) => setCurrentDuration(val)}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Quantity</FormLabel>
                    <NumberInput
                      min={1}
                      value={currentQuantity}
                      onChange={(_, val) => setCurrentQuantity(val)}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Unit Price (₹)</FormLabel>
                    <NumberInput
                      min={0}
                      value={currentUnitPrice}
                      onChange={(_, val) => setCurrentUnitPrice(val)}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </SimpleGrid>

                <Button
                  leftIcon={<AddIcon />}
                  colorScheme="blue"
                  onClick={handleAddItem}
                  isDisabled={!currentOption}
                >
                  Add Item to Quotation
                </Button>
              </>
            )}
          </Stack>
        </CardBody>
      </Card>

      {/* Items List */}
      {items.length > 0 && (
        <Card variant="outline" borderColor="green.200" borderWidth="2px">
          <CardHeader bg="green.50">
            <HStack justify="space-between">
              <Box>
                <Heading size="md" color="green.800">
                  Quotation Items ({items.length})
                </Heading>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Review and manage your quotation items
                </Text>
              </Box>
              <Badge colorScheme="green" fontSize="lg" px={4} py={2}>
                ₹{calculations.subtotal.toLocaleString()}
              </Badge>
            </HStack>
          </CardHeader>
          <CardBody>
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Medium</Th>
                    <Th>Option & Specs</Th>
                    <Th>Location/Details</Th>
                    <Th isNumeric>Duration</Th>
                    <Th isNumeric>Qty</Th>
                    <Th isNumeric>Unit Price</Th>
                    <Th isNumeric>Total</Th>
                    <Th></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {items.map((item) => (
                    <Tr key={item.id}>
                      <Td>
                        <Badge colorScheme="blue">{getMediumDisplayName(item.medium)}</Badge>
                      </Td>
                      <Td fontSize="sm">
                        <VStack align="start" spacing={1}>
                          <Text fontWeight="semibold">{item.specifications?.optionName}</Text>
                          {item.specifications?.dimensions && (
                            <Badge colorScheme="teal" fontSize="xs">
                              {item.specifications.dimensions.displayText || 
                               `${item.specifications.dimensions.width}×${item.specifications.dimensions.height}${item.specifications.dimensions.unit}`}
                            </Badge>
                          )}
                          {item.specifications?.size && (
                            <Badge colorScheme="orange" fontSize="xs">
                              {item.specifications.size}
                            </Badge>
                          )}
                        </VStack>
                      </Td>
                      <Td fontSize="sm">
                        <VStack align="start" spacing={1}>
                          {item.location && <Text>{item.location}</Text>}
                          {item.specifications?.lines && (
                            <Badge colorScheme="blue" fontSize="xs">
                              {item.specifications.lines} lines
                            </Badge>
                          )}
                          {item.specifications?.color && (
                            <Badge colorScheme="pink" fontSize="xs">
                              {item.specifications.color}
                            </Badge>
                          )}
                        </VStack>
                      </Td>
                      <Td isNumeric>{item.duration}</Td>
                      <Td isNumeric>{item.quantity}</Td>
                      <Td isNumeric>₹{item.unitPrice.toLocaleString()}</Td>
                      <Td isNumeric fontWeight="semibold">
                        ₹{item.totalPrice.toLocaleString()}
                      </Td>
                      <Td>
                        <IconButton
                          aria-label="Remove item"
                          icon={<DeleteIcon />}
                          size="sm"
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => removeItem(item.id)}
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>

            <Divider my={4} />

            {/* Summary */}
            <Box>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={4}>
                <FormControl>
                  <FormLabel>Discount (%)</FormLabel>
                  <NumberInput
                    min={0}
                    max={100}
                    value={discount}
                    onChange={(_, val) => setDiscount(val)}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>

                <FormControl>
                  <FormLabel>Quotation Valid For (days)</FormLabel>
                  <NumberInput
                    min={1}
                    value={validDays}
                    onChange={(_, val) => setValidDays(val)}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </FormControl>
              </SimpleGrid>

              <Stack spacing={2} align="flex-end" bg="gray.50" p={4} borderRadius="md">
                <HStack justify="space-between" w="full" maxW="300px">
                  <Text>Subtotal:</Text>
                  <Text fontWeight="semibold">₹{calculations.subtotal.toLocaleString()}</Text>
                </HStack>
                {discount > 0 && (
                  <HStack justify="space-between" w="full" maxW="300px" color="green.600">
                    <Text>Discount ({discount}%):</Text>
                    <Text fontWeight="semibold">
                      - ₹{calculations.discountAmount.toLocaleString()}
                    </Text>
                  </HStack>
                )}
                <HStack justify="space-between" w="full" maxW="300px">
                  <Text>GST (18%):</Text>
                  <Text fontWeight="semibold">₹{calculations.tax.toLocaleString()}</Text>
                </HStack>
                <Divider />
                <HStack justify="space-between" w="full" maxW="300px">
                  <Text fontSize="lg" fontWeight="bold">
                    Total Amount:
                  </Text>
                  <Text fontSize="lg" fontWeight="bold" color="blue.600">
                    ₹{calculations.total.toLocaleString()}
                  </Text>
                </HStack>
              </Stack>
            </Box>

            <FormControl mt={4}>
              <FormLabel>Notes / Terms & Conditions</FormLabel>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any special notes, terms, or conditions..."
                rows={4}
              />
            </FormControl>
          </CardBody>
        </Card>
      )}

      {/* Actions */}
      <Card bg="gray.50" variant="outline">
        <CardBody>
          {items.length === 0 && (
            <Alert status="info" mb={4} borderRadius="md">
              <AlertIcon />
              <AlertDescription>
                Add at least one advertisement item to generate a quotation
              </AlertDescription>
            </Alert>
          )}
          
          <HStack justify="space-between" flexWrap="wrap" gap={4}>
            <HStack spacing={2}>
              <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
                {items.length} {items.length === 1 ? 'Item' : 'Items'}
              </Badge>
              {items.length > 0 && (
                <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                  Total: ₹{calculations.total.toLocaleString()}
                </Badge>
              )}
            </HStack>
            
            <HStack spacing={4}>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => window.history.back()}
              >
                Cancel
              </Button>
              <Button
                colorScheme="green"
                size="lg"
                onClick={handlePreview}
                isDisabled={items.length === 0}
                leftIcon={items.length === 0 ? undefined : <InfoIcon />}
              >
                Preview PDF
              </Button>
              <Button
                colorScheme="blue"
                size="lg"
                onClick={handleSave}
                isDisabled={items.length === 0}
                isLoading={isSubmitting}
                loadingText="Saving..."
              >
                Save Quotation
              </Button>
            </HStack>
          </HStack>
        </CardBody>
      </Card>
    </Stack>
  );
};
