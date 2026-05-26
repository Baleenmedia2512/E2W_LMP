'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardBody,
  Container,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Tab,
  Table,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Badge,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Input,
  InputGroup,
  InputLeftElement,
  Stack,
  useToast,
} from '@chakra-ui/react';
import { AddIcon, SearchIcon, DownloadIcon, EmailIcon, ViewIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { FiMoreVertical } from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

// Demo data - In real app, this would come from API
const demoQuotations = [
  {
    id: '1',
    quotationNumber: 'QUO-20260305-ABC123',
    customerName: 'Rajesh Kumar',
    customerCompany: 'Tech Innovations Pvt Ltd',
    total: 125000,
    status: 'sent',
    createdAt: new Date('2026-03-01'),
    validUntil: new Date('2026-03-31'),
    itemCount: 3,
  },
  {
    id: '2',
    quotationNumber: 'QUO-20260304-XYZ789',
    customerName: 'Priya Sharma',
    customerCompany: 'Fashion Hub',
    total: 85000,
    status: 'draft',
    createdAt: new Date('2026-03-04'),
    validUntil: new Date('2026-04-04'),
    itemCount: 2,
  },
  {
    id: '3',
    quotationNumber: 'QUO-20260303-DEF456',
    customerName: 'Arun Venkat',
    customerCompany: 'Real Estate Builders',
    total: 350000,
    status: 'accepted',
    createdAt: new Date('2026-03-03'),
    validUntil: new Date('2026-04-02'),
    itemCount: 5,
  },
  {
    id: '4',
    quotationNumber: 'QUO-20260302-GHI321',
    customerName: 'Meena Lakshmi',
    customerCompany: '',
    total: 45000,
    status: 'rejected',
    createdAt: new Date('2026-03-02'),
    validUntil: new Date('2026-04-01'),
    itemCount: 1,
  },
];

const statusColors = {
  draft: 'gray',
  sent: 'blue',
  accepted: 'green',
  rejected: 'red',
  expired: 'orange',
};

export default function QuotationsPage() {
  const router = useRouter();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [quotations] = useState(demoQuotations);

  const handleNewQuotation = () => {
    router.push('/dashboard/quotations/new');
  };

  const handleView = (id: string) => {
    router.push(`/dashboard/quotations/${id}`);
  };

  const handleEdit = (id: string) => {
    router.push(`/dashboard/quotations/${id}/edit`);
  };

  const handleDownload = (quotationNumber: string) => {
    toast({
      title: 'Download Started',
      description: `Downloading ${quotationNumber}.pdf`,
      status: 'info',
      duration: 3000,
    });
  };

  const handleSend = (quotationNumber: string, email: string) => {
    toast({
      title: 'Email Sent',
      description: `Quotation sent to ${email}`,
      status: 'success',
      duration: 3000,
    });
  };

  const handleDelete = (id: string) => {
    toast({
      title: 'Quotation Deleted',
      status: 'success',
      duration: 2000,
    });
  };

  const filteredQuotations = quotations.filter(
    (q) =>
      q.quotationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.customerCompany?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getQuotationsByStatus = (status: string) => {
    if (status === 'all') return filteredQuotations;
    return filteredQuotations.filter((q) => q.status === status);
  };

  const QuotationTable = ({ quotations }: { quotations: typeof demoQuotations }) => (
    <Box overflowX="auto" sx={{ WebkitOverflowScrolling: 'touch' }}>
      <Table variant="simple" size={{ base: 'sm', md: 'md' }} minW="700px">
        <Thead>
          <Tr>
            <Th>Quotation #</Th>
            <Th>Customer</Th>
            <Th>Company</Th>
            <Th>Items</Th>
            <Th isNumeric>Total Amount</Th>
            <Th>Status</Th>
            <Th>Created</Th>
            <Th>Valid Until</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {quotations.length === 0 ? (
            <Tr>
              <Td colSpan={9} textAlign="center" py={10}>
                <Text color="gray.500">No quotations found</Text>
              </Td>
            </Tr>
          ) : (
            quotations.map((quotation) => (
              <Tr key={quotation.id}>
                <Td>
                  <Text fontFamily="mono" fontSize="sm" fontWeight="semibold">
                    {quotation.quotationNumber}
                  </Text>
                </Td>
                <Td>{quotation.customerName}</Td>
                <Td>{quotation.customerCompany || '-'}</Td>
                <Td>
                  <Badge>{quotation.itemCount} items</Badge>
                </Td>
                <Td isNumeric fontWeight="semibold">
                  ₹{quotation.total.toLocaleString()}
                </Td>
                <Td>
                  <Badge colorScheme={statusColors[quotation.status as keyof typeof statusColors]}>
                    {quotation.status.toUpperCase()}
                  </Badge>
                </Td>
                <Td fontSize="sm">{format(quotation.createdAt, 'MMM dd, yyyy')}</Td>
                <Td fontSize="sm">{format(quotation.validUntil, 'MMM dd, yyyy')}</Td>
                <Td>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      icon={<FiMoreVertical />}
                      variant="ghost"
                      size="sm"
                    />
                    <MenuList>
                      <MenuItem icon={<ViewIcon />} onClick={() => handleView(quotation.id)}>
                        View
                      </MenuItem>
                      <MenuItem icon={<EditIcon />} onClick={() => handleEdit(quotation.id)}>
                        Edit
                      </MenuItem>
                      <MenuItem
                        icon={<DownloadIcon />}
                        onClick={() => handleDownload(quotation.quotationNumber)}
                      >
                        Download PDF
                      </MenuItem>
                      <MenuItem
                        icon={<EmailIcon />}
                        onClick={() => handleSend(quotation.quotationNumber, 'customer@example.com')}
                      >
                        Send Email
                      </MenuItem>
                      <MenuItem
                        icon={<DeleteIcon />}
                        color="red.500"
                        onClick={() => handleDelete(quotation.id)}
                      >
                        Delete
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Td>
              </Tr>
            ))
          )}
        </Tbody>
      </Table>
    </Box>
  );

  return (
    <Container maxW="container.xl" py={{ base: 4, md: 8 }} px={{ base: 3, md: 4 }}>
      <Stack spacing={{ base: 4, md: 6 }}>
        {/* Header */}
        <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap={3}>
          <Box flex="1" minW={0}>
            <Heading size={{ base: 'md', md: 'lg' }}>Quotations</Heading>
            <Text color="gray.600" mt={1} fontSize={{ base: 'sm', md: 'md' }}>
              Manage advertisement quotations for leads and customers
            </Text>
          </Box>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={handleNewQuotation}
            size={{ base: 'sm', md: 'md' }}
            flexShrink={0}
          >
            New Quotation
          </Button>
        </Flex>

        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 3, md: 4 }}>
          <Card>
            <CardBody p={{ base: 3, md: 4 }}>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                Total Quotations
              </Text>
              <Heading size={{ base: 'lg', md: 'xl' }} color="blue.600">
                {quotations.length}
              </Heading>
            </CardBody>
          </Card>
          <Card>
            <CardBody p={{ base: 3, md: 4 }}>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                Sent
              </Text>
              <Heading size={{ base: 'lg', md: 'xl' }} color="blue.600">
                {quotations.filter((q) => q.status === 'sent').length}
              </Heading>
            </CardBody>
          </Card>
          <Card>
            <CardBody p={{ base: 3, md: 4 }}>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                Accepted
              </Text>
              <Heading size={{ base: 'lg', md: 'xl' }} color="green.600">
                {quotations.filter((q) => q.status === 'accepted').length}
              </Heading>
            </CardBody>
          </Card>
          <Card>
            <CardBody p={{ base: 3, md: 4 }}>
              <Text fontSize={{ base: 'xs', md: 'sm' }} color="gray.600" mb={1}>
                Total Value
              </Text>
              <Heading size={{ base: 'md', md: 'lg' }} color="purple.600">
                ₹{quotations.reduce((sum, q) => sum + q.total, 0).toLocaleString()}
              </Heading>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Search */}
        <Card>
          <CardBody>
            <InputGroup>
              <InputLeftElement pointerEvents="none">
                <SearchIcon color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Search by quotation number, customer name, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </InputGroup>
          </CardBody>
        </Card>

        {/* Quotations List with Tabs */}
        <Card>
          <CardBody p={{ base: 2, md: 4 }}>
            <Tabs colorScheme="blue">
              <TabList overflowX="auto" overflowY="hidden" sx={{ scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                <Tab>All ({filteredQuotations.length})</Tab>
                <Tab>Draft ({getQuotationsByStatus('draft').length})</Tab>
                <Tab>Sent ({getQuotationsByStatus('sent').length})</Tab>
                <Tab>Accepted ({getQuotationsByStatus('accepted').length})</Tab>
                <Tab>Rejected ({getQuotationsByStatus('rejected').length})</Tab>
              </TabList>

              <TabPanels>
                <TabPanel px={0}>
                  <QuotationTable quotations={getQuotationsByStatus('all')} />
                </TabPanel>
                <TabPanel px={0}>
                  <QuotationTable quotations={getQuotationsByStatus('draft')} />
                </TabPanel>
                <TabPanel px={0}>
                  <QuotationTable quotations={getQuotationsByStatus('sent')} />
                </TabPanel>
                <TabPanel px={0}>
                  <QuotationTable quotations={getQuotationsByStatus('accepted')} />
                </TabPanel>
                <TabPanel px={0}>
                  <QuotationTable quotations={getQuotationsByStatus('rejected')} />
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </Stack>
    </Container>
  );
}
