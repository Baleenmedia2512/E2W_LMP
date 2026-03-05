'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Stack,
  Card,
  CardBody,
  HStack,
  Button,
  Text,
  Badge,
  Divider,
  Grid,
  GridItem,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useRouter, useParams } from 'next/navigation';
import { DownloadIcon, EmailIcon, EditIcon, ArrowBackIcon } from '@chakra-ui/icons';
import { format } from 'date-fns';
import { getMediumDisplayName } from '@/features/quotations/constants/mediums';

// Demo data - In real app, fetch from API
const demoQuotation = {
  id: '1',
  quotationNumber: 'QUO-20260305-ABC123',
  customerName: 'Rajesh Kumar',
  customerEmail: 'rajesh@techinnovations.com',
  customerPhone: '+91 98765 43210',
  customerCompany: 'Tech Innovations Pvt Ltd',
  status: 'sent',
  createdAt: new Date('2026-03-01'),
  validUntil: new Date('2026-03-31'),
  items: [
    {
      id: '1',
      medium: 'hoarding',
      mediumOption: 'hoarding_premium',
      location: 'T. Nagar - Pondy Bazaar',
      duration: 3,
      quantity: 2,
      unitPrice: 50000,
      totalPrice: 300000,
      specifications: { optionName: 'Premium Location Hoarding' },
    },
    {
      id: '2',
      medium: 'bus',
      mediumOption: 'bus_full_wrap',
      location: 'Route 27 - Broadway to Velachery',
      duration: 1,
      quantity: 5,
      unitPrice: 30000,
      totalPrice: 150000,
      specifications: { optionName: 'Full Bus Wrap' },
    },
    {
      id: '3',
      medium: 'radio',
      mediumOption: 'radio_prime_time',
      location: 'Radio Mirchi 98.3 FM',
      duration: 7,
      quantity: 10,
      unitPrice: 3000,
      totalPrice: 210000,
      specifications: { optionName: 'Prime Time Slot (7-11 AM, 5-9 PM)' },
    },
  ],
  subtotal: 660000,
  discount: 5,
  discountAmount: 33000,
  tax: 112860,
  total: 739860,
  notes: 'Campaign duration: 3 months\nDesign mockups will be provided for approval\n50% advance required',
};

export default function ViewQuotationPage() {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const [quotation] = useState(demoQuotation);

  const handleBack = () => {
    router.push('/dashboard/quotations');
  };

  const handleEdit = () => {
    router.push(`/dashboard/quotations/${params.id}/edit`);
  };

  const handleDownload = () => {
    toast({
      title: 'Download Started',
      description: `Downloading ${quotation.quotationNumber}.pdf`,
      status: 'info',
      duration: 3000,
    });
  };

  const handleSend = () => {
    toast({
      title: 'Email Sent',
      description: `Quotation sent to ${quotation.customerEmail}`,
      status: 'success',
      duration: 3000,
    });
  };

  const statusColors: Record<string, string> = {
    draft: 'gray',
    sent: 'blue',
    accepted: 'green',
    rejected: 'red',
    expired: 'orange',
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={6}>
        {/* Header */}
        <HStack justify="space-between">
          <HStack>
            <Button leftIcon={<ArrowBackIcon />} variant="ghost" onClick={handleBack}>
              Back
            </Button>
            <Box>
              <Heading size="lg">{quotation.quotationNumber}</Heading>
              <Text color="gray.600" fontSize="sm">
                Created on {format(quotation.createdAt, 'MMMM dd, yyyy')}
              </Text>
            </Box>
          </HStack>
          <HStack>
            <Badge colorScheme={statusColors[quotation.status]} fontSize="md" px={3} py={1}>
              {quotation.status.toUpperCase()}
            </Badge>
          </HStack>
        </HStack>

        {/* Actions */}
        <HStack>
          <Button leftIcon={<EditIcon />} colorScheme="blue" onClick={handleEdit}>
            Edit
          </Button>
          <Button leftIcon={<DownloadIcon />} onClick={handleDownload}>
            Download PDF
          </Button>
          <Button leftIcon={<EmailIcon />} colorScheme="green" onClick={handleSend}>
            Send Email
          </Button>
        </HStack>

        {/* Customer Details */}
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>
              Customer Information
            </Heading>
            <Grid templateColumns="repeat(2, 1fr)" gap={6}>
              <GridItem>
                <VStack align="start" spacing={2}>
                  <Box>
                    <Text fontSize="sm" color="gray.600">
                      Name
                    </Text>
                    <Text fontWeight="semibold">{quotation.customerName}</Text>
                  </Box>
                  {quotation.customerCompany && (
                    <Box>
                      <Text fontSize="sm" color="gray.600">
                        Company
                      </Text>
                      <Text fontWeight="semibold">{quotation.customerCompany}</Text>
                    </Box>
                  )}
                </VStack>
              </GridItem>
              <GridItem>
                <VStack align="start" spacing={2}>
                  <Box>
                    <Text fontSize="sm" color="gray.600">
                      Email
                    </Text>
                    <Text fontWeight="semibold">{quotation.customerEmail}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.600">
                      Phone
                    </Text>
                    <Text fontWeight="semibold">{quotation.customerPhone}</Text>
                  </Box>
                </VStack>
              </GridItem>
            </Grid>
          </CardBody>
        </Card>

        {/* Quotation Details */}
        <Card>
          <CardBody>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">Quotation Details</Heading>
              <Text fontSize="sm" color="gray.600">
                Valid until: <strong>{format(quotation.validUntil, 'MMMM dd, yyyy')}</strong>
              </Text>
            </HStack>

            <Box overflowX="auto">
              <Table variant="simple" size="sm">
                <Thead bg="gray.100">
                  <Tr>
                    <Th>S.No</Th>
                    <Th>Description</Th>
                    <Th>Location/Channel</Th>
                    <Th isNumeric>Duration</Th>
                    <Th isNumeric>Quantity</Th>
                    <Th isNumeric>Rate</Th>
                    <Th isNumeric>Amount</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {quotation.items.map((item, index) => (
                    <Tr key={item.id}>
                      <Td>{index + 1}</Td>
                      <Td>
                        <VStack align="start" spacing={0}>
                          <Text fontWeight="semibold">
                            {getMediumDisplayName(item.medium as any)}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            {item.specifications?.optionName}
                          </Text>
                        </VStack>
                      </Td>
                      <Td fontSize="sm">{item.location}</Td>
                      <Td isNumeric>{item.duration}</Td>
                      <Td isNumeric>{item.quantity}</Td>
                      <Td isNumeric>₹{item.unitPrice.toLocaleString()}</Td>
                      <Td isNumeric fontWeight="semibold">
                        ₹{item.totalPrice.toLocaleString()}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>

            <Divider my={4} />

            {/* Summary */}
            <Stack spacing={2} align="flex-end">
              <Grid templateColumns="200px 150px" gap={2} fontSize="sm">
                <GridItem textAlign="right">
                  <Text>Subtotal:</Text>
                </GridItem>
                <GridItem textAlign="right">
                  <Text fontWeight="semibold">₹{quotation.subtotal.toLocaleString()}</Text>
                </GridItem>

                {quotation.discount > 0 && (
                  <>
                    <GridItem textAlign="right" color="green.600">
                      <Text>Discount ({quotation.discount}%):</Text>
                    </GridItem>
                    <GridItem textAlign="right" color="green.600">
                      <Text fontWeight="semibold">
                        - ₹{quotation.discountAmount.toLocaleString()}
                      </Text>
                    </GridItem>
                  </>
                )}

                <GridItem textAlign="right">
                  <Text>GST (18%):</Text>
                </GridItem>
                <GridItem textAlign="right">
                  <Text fontWeight="semibold">₹{quotation.tax.toLocaleString()}</Text>
                </GridItem>
              </Grid>

              <Box bg="blue.50" p={3} borderRadius="md" width="350px">
                <Grid templateColumns="200px 150px" gap={2}>
                  <GridItem textAlign="right">
                    <Text fontSize="lg" fontWeight="bold">
                      TOTAL AMOUNT:
                    </Text>
                  </GridItem>
                  <GridItem textAlign="right">
                    <Text fontSize="lg" fontWeight="bold" color="blue.600">
                      ₹{quotation.total.toLocaleString()}
                    </Text>
                  </GridItem>
                </Grid>
              </Box>
            </Stack>
          </CardBody>
        </Card>

        {/* Notes */}
        {quotation.notes && (
          <Card>
            <CardBody>
              <Heading size="md" mb={3}>
                Notes / Terms
              </Heading>
              <Box bg="gray.50" p={4} borderRadius="md">
                <Text whiteSpace="pre-wrap">{quotation.notes}</Text>
              </Box>
            </CardBody>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
