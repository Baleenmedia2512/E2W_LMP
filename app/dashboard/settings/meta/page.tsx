'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  useToast,
  Card,
  CardBody,
  Text,
  Badge,
  SimpleGrid,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Spinner,
  Center,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Code,
  Divider,
  HStack,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { FiCheckCircle, FiXCircle, FiRefreshCw, FiCopy, FiTrash2 } from 'react-icons/fi';

interface MetaConfig {
  id: string;
  pageId: string;
  pageName: string | null;
  verifyToken: string;
  isActive: boolean;
  lastVerified: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MetaEvent {
  id: string;
  leadgenId: string;
  formId: string | null;
  adId: string | null;
  campaignId: string | null;
  processed: boolean;
  error: string | null;
  createdAt: string;
  lead?: {
    id: string;
    name: string;
    phone: string;
    status: string;
  };
}

export default function MetaIntegrationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);

  const [formData, setFormData] = useState({
    pageId: '',
    pageName: '',
    pageAccessToken: '',
    verifyToken: '',
  });

  // Fetch Meta configurations
  const { data: configsResponse, mutate: mutateConfigs } = useSWR<{ data: MetaConfig[] }>(
    '/api/meta/config',
    fetcher
  );

  // Fetch recent webhook events
  const { data: eventsResponse, mutate: mutateEvents } = useSWR<{ data: { data: MetaEvent[] } }>(
    '/api/meta/events?pageSize=10',
    fetcher
  );

  const configs = configsResponse?.data || [];
  const activeConfig = configs.find((c) => c.isActive);
  const events = eventsResponse?.data?.data || [];

  if (status === 'loading') {
    return (
      <Center h="400px">
        <Spinner size="xl" color="brand.500" />
      </Center>
    );
  }

  if (!session || session.user.role !== 'SuperAgent') {
    return (
      <Box p={8}>
        <Alert status="error">
          <AlertIcon />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            Only SuperAgents can configure Meta integration.
          </AlertDescription>
        </Alert>
      </Box>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.pageId || !formData.pageAccessToken || !formData.verifyToken) {
        toast({
          title: 'Missing fields',
          description: 'Please fill in all required fields',
          status: 'error',
          duration: 3000,
        });
        return;
      }

      const response = await fetch('/api/meta/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save configuration');
      }

      toast({
        title: 'Configuration saved',
        description: result.message || 'Meta integration configured successfully',
        status: 'success',
        duration: 3000,
      });

      // Reset form
      setFormData({
        pageId: '',
        pageName: '',
        pageAccessToken: '',
        verifyToken: '',
      });

      mutateConfigs();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/meta/config?id=${configId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete configuration');
      }

      toast({
        title: 'Configuration deleted',
        status: 'success',
        duration: 3000,
      });

      mutateConfigs();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handleRetryFailed = async () => {
    setTestingWebhook(true);

    try {
      const response = await fetch('/api/meta/events', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to retry');
      }

      toast({
        title: 'Retry started',
        description: 'Failed events will be reprocessed',
        status: 'success',
        duration: 3000,
      });

      setTimeout(() => {
        mutateEvents();
      }, 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setTestingWebhook(false);
    }
  };

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'}/api/meta/webhook`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      status: 'success',
      duration: 2000,
    });
  };

  return (
    <Box>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Box>
          <Heading size="lg" mb={2}>
            Meta Lead Ads Integration
          </Heading>
          <Text color="gray.600">
            Configure Facebook Lead Ads webhook to automatically import leads into your CRM
          </Text>
        </Box>

        {/* Status Card */}
        {activeConfig && (
          <Card>
            <CardBody>
              <HStack justify="space-between" mb={4}>
                <Heading size="md">Status</Heading>
                <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                  <HStack spacing={2}>
                    <FiCheckCircle />
                    <Text>Connected</Text>
                  </HStack>
                </Badge>
              </HStack>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    Page ID
                  </Text>
                  <Text fontWeight="600">{activeConfig.pageId}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    Page Name
                  </Text>
                  <Text fontWeight="600">{activeConfig.pageName || 'N/A'}</Text>
                </Box>
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    Last Verified
                  </Text>
                  <Text fontWeight="600">
                    {activeConfig.lastVerified
                      ? new Date(activeConfig.lastVerified).toLocaleString()
                      : 'Never'}
                  </Text>
                </Box>
              </SimpleGrid>
            </CardBody>
          </Card>
        )}

        {/* Webhook URL */}
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>
              Webhook URL
            </Heading>
            <Text fontSize="sm" color="gray.600" mb={2}>
              Configure this URL in your Facebook App Webhooks settings
            </Text>
            <HStack>
              <Code flex="1" p={3} borderRadius="md">
                {webhookUrl}
              </Code>
              <IconButton
                aria-label="Copy webhook URL"
                icon={<FiCopy />}
                onClick={() => copyToClipboard(webhookUrl)}
              />
            </HStack>
            <Alert status="info" mt={4}>
              <AlertIcon />
              <Box>
                <AlertTitle fontSize="sm">Setup Instructions:</AlertTitle>
                <AlertDescription fontSize="sm">
                  1. Go to Facebook App Dashboard → Webhooks
                  <br />
                  2. Subscribe to 'leadgen' events
                  <br />
                  3. Use the Verify Token from configuration below
                  <br />
                  4. Required permissions: leads_retrieval, pages_manage_metadata
                </AlertDescription>
              </Box>
            </Alert>
          </CardBody>
        </Card>

        {/* Configuration Form */}
        <Card>
          <CardBody>
            <Heading size="md" mb={4}>
              Configuration
            </Heading>
            <form onSubmit={handleSubmit}>
              <VStack spacing={4} align="stretch">
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  <FormControl isRequired>
                    <FormLabel>Facebook Page ID</FormLabel>
                    <Input
                      name="pageId"
                      value={formData.pageId}
                      onChange={(e) =>
                        setFormData({ ...formData, pageId: e.target.value })
                      }
                      placeholder="123456789012345"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Page Name (Optional)</FormLabel>
                    <Input
                      name="pageName"
                      value={formData.pageName}
                      onChange={(e) =>
                        setFormData({ ...formData, pageName: e.target.value })
                      }
                      placeholder="My Business Page"
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl isRequired>
                  <FormLabel>Page Access Token</FormLabel>
                  <Input
                    name="pageAccessToken"
                    type="password"
                    value={formData.pageAccessToken}
                    onChange={(e) =>
                      setFormData({ ...formData, pageAccessToken: e.target.value })
                    }
                    placeholder="EAAG..."
                  />
                  <Text fontSize="xs" color="gray.600" mt={1}>
                    Get this from Facebook App Dashboard → Access Tokens
                  </Text>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Webhook Verify Token</FormLabel>
                  <Input
                    name="verifyToken"
                    value={formData.verifyToken}
                    onChange={(e) =>
                      setFormData({ ...formData, verifyToken: e.target.value })
                    }
                    placeholder="my-verify-token-123"
                  />
                  <Text fontSize="xs" color="gray.600" mt={1}>
                    Create a random string - you'll use this when setting up webhooks
                  </Text>
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={loading}
                  loadingText="Saving..."
                >
                  Save Configuration
                </Button>
              </VStack>
            </form>
          </CardBody>
        </Card>

        {/* Recent Webhook Events */}
        <Card>
          <CardBody>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">Recent Webhook Events</Heading>
              <HStack>
                <Button
                  size="sm"
                  leftIcon={<FiRefreshCw />}
                  onClick={() => mutateEvents()}
                >
                  Refresh
                </Button>
                <Button
                  size="sm"
                  colorScheme="orange"
                  leftIcon={<FiRefreshCw />}
                  onClick={handleRetryFailed}
                  isLoading={testingWebhook}
                >
                  Retry Failed
                </Button>
              </HStack>
            </HStack>

            {events.length === 0 ? (
              <Text color="gray.600">No webhook events received yet</Text>
            ) : (
              <Box overflowX="auto">
                <Table variant="simple" size="sm">
                  <Thead>
                    <Tr>
                      <Th>Leadgen ID</Th>
                      <Th>Form ID</Th>
                      <Th>Lead Name</Th>
                      <Th>Status</Th>
                      <Th>Received</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {events.map((event) => (
                      <Tr key={event.id}>
                        <Td>
                          <Code fontSize="xs">{event.leadgenId.slice(0, 15)}...</Code>
                        </Td>
                        <Td>
                          <Code fontSize="xs">{event.formId?.slice(0, 12) || 'N/A'}</Code>
                        </Td>
                        <Td>{event.lead?.name || 'Processing...'}</Td>
                        <Td>
                          {event.processed ? (
                            event.error ? (
                              <Badge colorScheme="red">Error</Badge>
                            ) : (
                              <Badge colorScheme="green">Success</Badge>
                            )
                          ) : (
                            <Badge colorScheme="yellow">Processing</Badge>
                          )}
                        </Td>
                        <Td fontSize="xs">
                          {new Date(event.createdAt).toLocaleString()}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}
          </CardBody>
        </Card>

        {/* Existing Configurations */}
        {configs.length > 0 && (
          <Card>
            <CardBody>
              <Heading size="md" mb={4}>
                Saved Configurations
              </Heading>
              <VStack spacing={3} align="stretch">
                {configs.map((config) => (
                  <Box
                    key={config.id}
                    p={4}
                    borderWidth="1px"
                    borderRadius="md"
                    bg={config.isActive ? 'blue.50' : 'gray.50'}
                  >
                    <HStack justify="space-between">
                      <Box>
                        <HStack>
                          <Text fontWeight="600">{config.pageName || config.pageId}</Text>
                          {config.isActive && (
                            <Badge colorScheme="green">Active</Badge>
                          )}
                        </HStack>
                        <Text fontSize="sm" color="gray.600">
                          Page ID: {config.pageId}
                        </Text>
                      </Box>
                      <IconButton
                        aria-label="Delete configuration"
                        icon={<FiTrash2 />}
                        size="sm"
                        colorScheme="red"
                        variant="ghost"
                        onClick={() => handleDelete(config.id)}
                      />
                    </HStack>
                  </Box>
                ))}
              </VStack>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
  );
}
