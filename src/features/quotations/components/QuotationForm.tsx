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
  Heading,
  Input,
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
} from '@chakra-ui/react';
import { DeleteIcon, AddIcon } from '@chakra-ui/icons';
import { AdvertisementMedium, QuotationItem } from '../types';
import { getMediumOptions, getMediumDisplayName } from '../constants/mediums';
import { useQuotationCalculator } from '../hooks/useQuotationCalculator';
import { MediumSelector } from './MediumSelector';
import { LocationSelector } from './LocationSelector';

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

  // Current item being added
  const [currentMedium, setCurrentMedium] = useState<AdvertisementMedium | ''>('');
  const [currentOption, setCurrentOption] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [currentLocationName, setCurrentLocationName] = useState('');
  const [currentDuration, setCurrentDuration] = useState(1);
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [currentUnitPrice, setCurrentUnitPrice] = useState(0);

  const mediumOptions = currentMedium ? getMediumOptions(currentMedium) : [];
  const selectedOption = mediumOptions.find(opt => opt.id === currentOption);

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
      location: currentLocationName || undefined,
      duration: currentDuration,
      quantity: currentQuantity,
      unitPrice: currentUnitPrice,
      specifications: {
        optionName: selectedOption?.name,
        ...(currentLocationName && { location: currentLocationName }),
      },
    });

    // Reset form
    setCurrentOption('');
    setCurrentLocation('');
    setCurrentLocationName('');
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

  const handleSave = () => {
    if (!customerName || !customerEmail || !customerPhone) {
      toast({
        title: 'Missing customer information',
        description: 'Please fill in all customer details',
        status: 'warning',
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

    onSave?.(quotationData);
  };

  return (
    <Stack spacing={6}>
      {/* Customer Information */}
      <Card>
        <CardHeader>
          <Heading size="md">Customer Information</Heading>
        </CardHeader>
        <CardBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isRequired>
              <FormLabel>Customer Name</FormLabel>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Company Name</FormLabel>
              <Input
                value={customerCompany}
                onChange={(e) => setCustomerCompany(e.target.value)}
                placeholder="Enter company name (optional)"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Email</FormLabel>
              <Input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="customer@example.com"
              />
            </FormControl>
            <FormControl isRequired>
              <FormLabel>Phone</FormLabel>
              <Input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Enter phone number"
              />
            </FormControl>
          </SimpleGrid>
        </CardBody>
      </Card>

      {/* Add Items */}
      <Card>
        <CardHeader>
          <Heading size="md">Add Advertisement Items</Heading>
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
                    <Text fontSize="sm" color="gray.600" mt={2}>
                      {selectedOption.description}
                    </Text>
                  )}
                </FormControl>

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
        <Card>
          <CardHeader>
            <Heading size="md">Quotation Items ({items.length})</Heading>
          </CardHeader>
          <CardBody>
            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Medium</Th>
                    <Th>Option</Th>
                    <Th>Location</Th>
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
                      <Td fontSize="sm">{item.specifications?.optionName}</Td>
                      <Td fontSize="sm">{item.location || '-'}</Td>
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
      <HStack justify="flex-end" spacing={4}>
        <Button variant="outline" size="lg">
          Cancel
        </Button>
        <Button
          colorScheme="green"
          size="lg"
          onClick={handlePreview}
          isDisabled={items.length === 0}
        >
          Preview PDF
        </Button>
        <Button
          colorScheme="blue"
          size="lg"
          onClick={handleSave}
          isDisabled={items.length === 0}
        >
          Save Quotation
        </Button>
      </HStack>
    </Stack>
  );
};
