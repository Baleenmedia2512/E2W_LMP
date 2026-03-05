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
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const quotationNumber = `QUO-${format(new Date(), 'yyyyMMdd')}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  const quotationDate = format(new Date(), 'MMMM dd, yyyy');
  const validUntil = format(new Date(Date.now() + data.validDays * 24 * 60 * 60 * 1000), 'MMMM dd, yyyy');

  return (
    <Box>
      {/* Action Buttons */}
      <HStack justify="flex-end" mb={4} spacing={4}>
        <Button leftIcon={<DownloadIcon />} colorScheme="blue" onClick={onDownload}>
          Download PDF
        </Button>
        <Button leftIcon={<EmailIcon />} colorScheme="green" onClick={onSend}>
          Send to Customer
        </Button>
      </HStack>

      {/* PDF Preview Container */}
      <Box
        bg={bgColor}
        border="1px"
        borderColor={borderColor}
        borderRadius="lg"
        p={8}
        maxW="900px"
        mx="auto"
        boxShadow="xl"
        id="quotation-pdf"
      >
        {/* Header */}
        <VStack align="stretch" spacing={6}>
          {/* Company Header */}
          <Box textAlign="center" borderBottom="3px solid" borderColor="blue.500" pb={4}>
            <Heading size="xl" color="blue.600" mb={2}>
              Easy2Work Media Solutions
            </Heading>
            <Text fontSize="sm" color="gray.600">
              #123, Anna Salai, Chennai - 600002 | Phone: +91 98765 43210 | Email: quotes@easy2work.com
            </Text>
            <Text fontSize="sm" color="gray.600">
              GSTIN: 33AAAAA0000A1Z5 | PAN: AAAAA0000A
            </Text>
          </Box>

          {/* Quotation Info */}
          <Grid templateColumns="repeat(2, 1fr)" gap={6}>
            <GridItem>
              <VStack align="start" spacing={1}>
                <Heading size="sm" color="gray.600">
                  QUOTATION TO:
                </Heading>
                <Text fontWeight="bold" fontSize="lg">
                  {data.customerName}
                </Text>
                {data.customerCompany && (
                  <Text fontWeight="semibold" color="gray.700">
                    {data.customerCompany}
                  </Text>
                )}
                <Text fontSize="sm">{data.customerEmail}</Text>
                <Text fontSize="sm">{data.customerPhone}</Text>
              </VStack>
            </GridItem>

            <GridItem textAlign="right">
              <VStack align="end" spacing={2}>
                <Badge colorScheme="blue" fontSize="lg" px={3} py={1}>
                  QUOTATION
                </Badge>
                <HStack>
                  <Text fontWeight="semibold">Quotation #:</Text>
                  <Text>{quotationNumber}</Text>
                </HStack>
                <HStack>
                  <Text fontWeight="semibold">Date:</Text>
                  <Text>{quotationDate}</Text>
                </HStack>
                <HStack>
                  <Text fontWeight="semibold">Valid Until:</Text>
                  <Text color="orange.600" fontWeight="semibold">
                    {validUntil}
                  </Text>
                </HStack>
              </VStack>
            </GridItem>
          </Grid>

          <Divider />

          {/* Items Table */}
          <Box>
            <Heading size="md" mb={4}>
              Advertisement Services
            </Heading>
            <Table variant="simple" size="sm">
              <Thead bg="gray.100">
                <Tr>
                  <Th>S.No</Th>
                  <Th>Description</Th>
                  <Th>Location</Th>
                  <Th isNumeric>Duration</Th>
                  <Th isNumeric>Qty</Th>
                  <Th isNumeric>Rate</Th>
                  <Th isNumeric>Amount</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.items.map((item, index) => (
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
                    <Td fontSize="sm">{item.location || '-'}</Td>
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

          {/* Summary */}
          <Box>
            <Stack spacing={2} align="flex-end">
              <Grid templateColumns="200px 150px" gap={2} fontSize="sm">
                <GridItem textAlign="right">
                  <Text>Subtotal:</Text>
                </GridItem>
                <GridItem textAlign="right">
                  <Text fontWeight="semibold">
                    ₹{data.calculations.subtotal.toLocaleString()}
                  </Text>
                </GridItem>

                {data.discount > 0 && (
                  <>
                    <GridItem textAlign="right" color="green.600">
                      <Text>Discount ({data.discount}%):</Text>
                    </GridItem>
                    <GridItem textAlign="right" color="green.600">
                      <Text fontWeight="semibold">
                        - ₹{data.calculations.discountAmount.toLocaleString()}
                      </Text>
                    </GridItem>
                  </>
                )}

                <GridItem textAlign="right">
                  <Text>GST (18%):</Text>
                </GridItem>
                <GridItem textAlign="right">
                  <Text fontWeight="semibold">₹{data.calculations.tax.toLocaleString()}</Text>
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
                      ₹{data.calculations.total.toLocaleString()}
                    </Text>
                  </GridItem>
                </Grid>
              </Box>

              <Text fontSize="xs" fontStyle="italic" color="gray.600">
                Amount in words: {numberToWords(data.calculations.total)} Rupees Only
              </Text>
            </Stack>
          </Box>

          {/* Notes */}
          {data.notes && (
            <Box>
              <Heading size="sm" mb={2}>
                Notes / Terms & Conditions:
              </Heading>
              <Box bg="gray.50" p={3} borderRadius="md">
                <Text fontSize="sm" whiteSpace="pre-wrap">
                  {data.notes}
                </Text>
              </Box>
            </Box>
          )}

          {/* Default Terms */}
          <Box fontSize="xs" color="gray.600">
            <Heading size="xs" mb={2}>
              Standard Terms & Conditions:
            </Heading>
            <VStack align="start" spacing={1} pl={4}>
              <Text>• 50% advance payment required to confirm booking</Text>
              <Text>• Remaining 50% before campaign start date</Text>
              <Text>• Prices are subject to availability and confirmation</Text>
              <Text>• Design and printing charges additional as applicable</Text>
              <Text>• Government permissions and approvals to be obtained separately</Text>
              <Text>• Any damage to property during installation will be charged additionally</Text>
            </VStack>
          </Box>

          {/* Footer */}
          <Box textAlign="center" pt={4} borderTop="1px" borderColor={borderColor}>
            <Text fontSize="xs" color="gray.500">
              This is a computer-generated quotation. For any queries, please contact us.
            </Text>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Easy2Work Media Solutions - Your Partner in Outdoor Advertising
            </Text>
          </Box>
        </VStack>
      </Box>
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
