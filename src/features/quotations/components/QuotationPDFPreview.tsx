'use client';

import {
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  Badge,
  Grid,
  GridItem,
  useColorModeValue,
  Flex,
  Container,
} from '@chakra-ui/react';
import { DownloadIcon, EmailIcon } from '@chakra-ui/icons';
import { format } from 'date-fns';
import { getMediumDisplayName } from '../constants/mediums';

interface QuotationPDFPreviewProps {
  data: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    customerCompany?: string;
    items: Array<{
      id: string;
      medium: string;
      mediumOption: string;
      location?: string;
      duration: number;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      specifications?: any;
    }>;
    discount: number;
    notes?: string;
    validDays: number;
    calculations: {
      subtotal: number;
      discountAmount: number;
      tax: number;
      total: number;
    };
  };
  onDownload?: () => void;
  onSend?: () => void;
}

export const QuotationPDFPreview = ({ data, onDownload, onSend }: QuotationPDFPreviewProps) => {
  const bgColor = useColorModeValue('white', 'gray.800');

  const quotationNumber = `QUO-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const quotationDate = format(new Date(), 'MMMM dd, yyyy');
  const validUntil = format(new Date(Date.now() + data.validDays * 24 * 60 * 60 * 1000), 'MMMM dd, yyyy');

  return (
    <Box>
      {/* Action Buttons */}
      <HStack justify="flex-end" mb={6} spacing={4}>
        <Button 
          leftIcon={<DownloadIcon />} 
          colorScheme="blue" 
          onClick={onDownload}
          size="lg"
          shadow="md"
        >
          Download PDF
        </Button>
        <Button 
          leftIcon={<EmailIcon />} 
          colorScheme="green" 
          onClick={onSend}
          size="lg"
          shadow="md"
        >
          Send to Customer
        </Button>
      </HStack>

      {/* PDF Preview Container - World Class Design */}
      <Container
        maxW="1000px"
        bg={bgColor}
        borderRadius="2xl"
        overflow="hidden"
        boxShadow="2xl"
        id="quotation-pdf"
        p={0}
      >
        {/* Premium Header with Gradient */}
        <Box
          bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)"
          p={8}
          position="relative"
          _before={{
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
          }}
        >
          <VStack spacing={3} align="stretch" position="relative" zIndex={1}>
            <Flex justify="space-between" align="flex-start">
              <Box>
                <Heading size="2xl" color="white" fontWeight="800" letterSpacing="tight">
                  Easy2Work Media
                </Heading>
                <Text color="whiteAlpha.900" fontSize="lg" fontWeight="500" mt={1}>
                  Your Premier Advertising Partner
                </Text>
              </Box>
              <Badge
                colorScheme="yellow"
                fontSize="md"
                px={4}
                py={2}
                borderRadius="full"
                fontWeight="bold"
                textTransform="uppercase"
                letterSpacing="wide"
              >
                Quotation
              </Badge>
            </Flex>
            
            <Divider borderColor="whiteAlpha.400" my={2} />
            
            <Grid templateColumns="repeat(3, 1fr)" gap={4} fontSize="sm" color="whiteAlpha.900">
              <VStack align="start" spacing={0}>
                <Text fontWeight="semibold" color="white">📞 Contact</Text>
                <Text>+91 98765 43210</Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontWeight="semibold" color="white">📧 Email</Text>
                <Text>quotes@easy2work.com</Text>
              </VStack>
              <VStack align="start" spacing={0}>
                <Text fontWeight="semibold" color="white">📍 Location</Text>
                <Text>Chennai, Tamil Nadu</Text>
              </VStack>
            </Grid>
          </VStack>
        </Box>

        {/* Main Content */}
        <Box p={8}>
          {/* Quotation Details Cards */}
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={6} mb={8}>
            {/* Customer Information Card */}
            <Box
              bg="blue.50"
              borderRadius="xl"
              p={6}
              borderLeft="4px solid"
              borderLeftColor="blue.500"
            >
              <Heading size="sm" color="blue.700" mb={3} textTransform="uppercase" letterSpacing="wide">
                Bill To
              </Heading>
              <VStack align="start" spacing={2}>
                <Text fontWeight="bold" fontSize="xl" color="gray.800">
                  {data.customerName}
                </Text>
                {data.customerCompany && (
                  <Text fontWeight="semibold" color="blue.600" fontSize="md">
                    {data.customerCompany}
                  </Text>
                )}
                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.600">📧</Text>
                  <Text fontSize="sm" color="gray.700">{data.customerEmail}</Text>
                </HStack>
                <HStack spacing={2}>
                  <Text fontSize="sm" color="gray.600">📞</Text>
                  <Text fontSize="sm" color="gray.700">{data.customerPhone}</Text>
                </HStack>
              </VStack>
            </Box>

            {/* Quotation Meta Card */}
            <Box
              bg="purple.50"
              borderRadius="xl"
              p={6}
              borderLeft="4px solid"
              borderLeftColor="purple.500"
            >
              <Heading size="sm" color="purple.700" mb={3} textTransform="uppercase" letterSpacing="wide">
                Quotation Details
              </Heading>
              <Grid templateColumns="auto 1fr" gap={3} fontSize="sm">
                <Text fontWeight="semibold" color="gray.600">Quote #:</Text>
                <Text fontWeight="bold" color="purple.600">{quotationNumber}</Text>
                
                <Text fontWeight="semibold" color="gray.600">Date:</Text>
                <Text color="gray.800">{quotationDate}</Text>
                
                <Text fontWeight="semibold" color="gray.600">Valid Until:</Text>
                <Badge colorScheme="orange" fontSize="sm" px={2} py={1}>
                  {validUntil}
                </Badge>
                
                <Text fontWeight="semibold" color="gray.600">GST:</Text>
                <Text color="gray.800">33AAAAA0000A1Z5</Text>
              </Grid>
            </Box>
          </Grid>

          {/* Items Table - Modern Design */}
          <Box mb={8}>
            <Heading size="md" mb={4} color="gray.800">
              Advertisement Services
            </Heading>
            <Box
              borderRadius="xl"
              overflow="hidden"
              border="1px solid"
              borderColor="gray.200"
              boxShadow="sm"
            >
              <Table variant="simple" size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th py={4} color="gray.700" fontSize="xs" textTransform="uppercase" letterSpacing="wide">#</Th>
                    <Th py={4} color="gray.700" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Description</Th>
                    <Th py={4} color="gray.700" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Details</Th>
                    <Th isNumeric py={4} color="gray.700" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Duration</Th>
                    <Th isNumeric py={4} color="gray.700" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Qty</Th>
                    <Th isNumeric py={4} color="gray.700" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Rate</Th>
                    <Th isNumeric py={4} color="gray.700" fontSize="xs" textTransform="uppercase" letterSpacing="wide">Amount</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.items.map((item, index) => (
                    <Tr key={item.id} _hover={{ bg: 'gray.50' }} transition="all 0.2s">
                      <Td>
                        <Flex
                          align="center"
                          justify="center"
                          w={8}
                          h={8}
                          borderRadius="full"
                          bg="blue.100"
                          color="blue.700"
                          fontWeight="bold"
                          fontSize="sm"
                        >
                          {index + 1}
                        </Flex>
                      </Td>
                      <Td py={4}>
                        <VStack align="start" spacing={1}>
                          <Badge colorScheme="purple" fontSize="xs" px={2} py={1}>
                            {getMediumDisplayName(item.medium as any)}
                          </Badge>
                          <Text fontWeight="semibold" fontSize="sm" color="gray.800">
                            {item.specifications?.optionName}
                          </Text>
                        </VStack>
                      </Td>
                      <Td fontSize="sm" color="gray.600">
                        <VStack align="start" spacing={1}>
                          {item.location && (
                            <Text>{item.location}</Text>
                          )}
                          {item.specifications?.newspaper && (
                            <Text>{item.specifications.newspaper}</Text>
                          )}
                          {item.specifications?.dimensions && (
                            <Badge colorScheme="teal" fontSize="xs">
                              {item.specifications.dimensions.displayText || 
                               `${item.specifications.dimensions.width}${item.specifications.dimensions.unit} × ${item.specifications.dimensions.height}${item.specifications.dimensions.unit}`}
                            </Badge>
                          )}
                          {item.specifications?.size && (
                            <Badge colorScheme="orange" fontSize="xs">
                              {item.specifications.size}
                            </Badge>
                          )}
                          {item.specifications?.category && (
                            <Text fontSize="xs" color="gray.500">
                              {item.specifications.category}
                            </Text>
                          )}
                          {item.specifications?.lines && (
                            <Text fontSize="xs" color="blue.600">
                              {item.specifications.lines} lines
                            </Text>
                          )}
                        </VStack>
                      </Td>
                      <Td isNumeric color="gray.700">{item.duration}</Td>
                      <Td isNumeric color="gray.700">{item.quantity}</Td>
                      <Td isNumeric fontWeight="medium" color="gray.800">
                        ₹{item.unitPrice.toLocaleString()}
                      </Td>
                      <Td isNumeric py={4}>
                        <Text fontWeight="bold" color="blue.600" fontSize="md">
                          ₹{item.totalPrice.toLocaleString()}
                        </Text>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Box>

          {/* Summary Section - Premium Design */}
          <Grid templateColumns={{ base: '1fr', md: '1.5fr 1fr' }} gap={6} mb={8}>
            {/* Notes */}
            {data.notes && (
              <Box
                bg="gray.50"
                borderRadius="xl"
                p={6}
                borderLeft="4px solid"
                borderLeftColor="gray.400"
              >
                <Heading size="sm" mb={3} color="gray.700">
                  Notes & Special Terms
                </Heading>
                <Text fontSize="sm" color="gray.600" whiteSpace="pre-wrap">
                  {data.notes}
                </Text>
              </Box>
            )}

            {/* Price Summary - Gradient Card */}
            <Box
              bgGradient="linear(135deg, #667eea 0%, #764ba2 100%)"
              borderRadius="xl"
              p={6}
              color="white"
              boxShadow="lg"
            >
              <VStack spacing={3} align="stretch">
                <Flex justify="space-between" fontSize="md">
                  <Text color="whiteAlpha.900">Subtotal</Text>
                  <Text fontWeight="semibold">₹{data.calculations.subtotal.toLocaleString()}</Text>
                </Flex>

                {data.discount > 0 && (
                  <Flex justify="space-between" fontSize="md">
                    <Text color="whiteAlpha.900">Discount ({data.discount}%)</Text>
                    <Text fontWeight="semibold" color="yellow.200">
                      - ₹{data.calculations.discountAmount.toLocaleString()}
                    </Text>
                  </Flex>
                )}

                <Flex justify="space-between" fontSize="md">
                  <Text color="whiteAlpha.900">GST (18%)</Text>
                  <Text fontWeight="semibold">₹{data.calculations.tax.toLocaleString()}</Text>
                </Flex>

                <Divider borderColor="whiteAlpha.400" />

                <Flex justify="space-between" align="center">
                  <VStack align="start" spacing={0}>
                    <Text fontSize="xs" color="whiteAlpha.800" textTransform="uppercase" letterSpacing="wide">
                      Total Amount
                    </Text>
                    <Text fontSize="3xl" fontWeight="900" lineHeight="1.2">
                      ₹{data.calculations.total.toLocaleString()}
                    </Text>
                  </VStack>
                  <Badge
                    colorScheme="yellow"
                    fontSize="xs"
                    px={3}
                    py={1}
                    borderRadius="full"
                  >
                    INR
                  </Badge>
                </Flex>

                <Text fontSize="xs" color="whiteAlpha.900" fontStyle="italic" mt={2}>
                  {numberToWords(data.calculations.total)} Rupees Only
                </Text>
              </VStack>
            </Box>
          </Grid>

          {/* Terms & Conditions - Professional */}
          <Box
            bg="orange.50"
            borderRadius="xl"
            p={6}
            mb={8}
            borderTop="3px solid"
            borderTopColor="orange.400"
          >
            <Heading size="sm" mb={4} color="orange.800">
              Terms & Conditions
            </Heading>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4} fontSize="sm" color="gray.700">
              <HStack align="start" spacing={3}>
                <Text color="orange.500" fontWeight="bold">✓</Text>
                <Text>50% advance payment required to confirm booking</Text>
              </HStack>
              <HStack align="start" spacing={3}>
                <Text color="orange.500" fontWeight="bold">✓</Text>
                <Text>Balance 50% before campaign start date</Text>
              </HStack>
              <HStack align="start" spacing={3}>
                <Text color="orange.500" fontWeight="bold">✓</Text>
                <Text>Prices subject to availability and confirmation</Text>
              </HStack>
              <HStack align="start" spacing={3}>
                <Text color="orange.500" fontWeight="bold">✓</Text>
                <Text>Design & printing charges additional</Text>
              </HStack>
              <HStack align="start" spacing={3}>
                <Text color="orange.500" fontWeight="bold">✓</Text>
                <Text>Government permissions obtained separately</Text>
              </HStack>
              <HStack align="start" spacing={3}>
                <Text color="orange.500" fontWeight="bold">✓</Text>
                <Text>Property damage charges apply if applicable</Text>
              </HStack>
            </Grid>
          </Box>

          {/* Signature Section */}
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={8} mb={6}>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={8}>
                Customer Signature
              </Text>
              <Divider borderColor="gray.300" />
              <Text fontSize="xs" color="gray.500" mt={2}>
                Date: _______________
              </Text>
            </Box>
            <Box>
              <Text fontSize="sm" color="gray.600" mb={8}>
                Authorized Signatory
              </Text>
              <Divider borderColor="gray.300" />
              <Text fontSize="xs" color="gray.500" mt={2}>
                Easy2Work Media Solutions
              </Text>
            </Box>
          </Grid>

          {/* Footer - Professional */}
          <Box
            textAlign="center"
            pt={6}
            borderTop="2px solid"
            borderTopColor="gray.200"
          >
            <Text fontSize="xs" color="gray.500" fontWeight="medium">
              Thank you for choosing Easy2Work Media Solutions
            </Text>
            <Text fontSize="xs" color="gray.400" mt={1}>
              For queries, contact us at quotes@easy2work.com | +91 98765 43210
            </Text>
            <HStack justify="center" spacing={4} mt={3} fontSize="xs" color="gray.400">
              <Text>🌐 www.easy2work.com</Text>
              <Text>|</Text>
              <Text>Chennai's #1 Media Partner</Text>
            </HStack>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

// Helper function to convert number to words (simplified)
function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  
  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return '';
    if (n < 10) return ones[n] || '';
    if (n < 20) return teens[n - 10] || '';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
  };
  
  const crores = Math.floor(num / 10000000);
  const lakhs = Math.floor((num % 10000000) / 100000);
  const thousands = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;
  
  let result = '';
  if (crores > 0) result += convertLessThanThousand(crores) + ' Crore ';
  if (lakhs > 0) result += convertLessThanThousand(lakhs) + ' Lakh ';
  if (thousands > 0) result += convertLessThanThousand(thousands) + ' Thousand ';
  if (remainder > 0) result += convertLessThanThousand(remainder);
  
  return result.trim();
}
