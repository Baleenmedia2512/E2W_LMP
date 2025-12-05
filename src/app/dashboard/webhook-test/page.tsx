'use client';

import {
  Box,
  Heading,
  Button,
  VStack,
  Card,
  CardBody,
  CardHeader,
  useToast,
  Text,
  Code,
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner,
  Badge,
  HStack,
} from '@chakra-ui/react';
import { useState } from 'react';
import { HiPlay, HiRefresh } from 'react-icons/hi';

export default function WebhookTestPage() {
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [statusCheck, setStatusCheck] = useState<any>(null);
  const toast = useToast();

  const checkWebhookStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/webhooks/meta-leads/test');
      const data = await response.json();
      setStatusCheck(data);
      
      if (data.summary?.overall === 'HEALTHY') {
        toast({
          title: '✅ Webhook is healthy',
          description: 'All checks passed successfully',
          status: 'success',
          duration: 3000,
        });
      } else {
        toast({
          title: '⚠️ Webhook has issues',
          description: 'Check the details below',
          status: 'warning',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error checking webhook',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const simulateMetaWebhook = async () => {
    setLoading(true);
    setTestResult(null);

    try {
      // Simulate Meta webhook payload
      const testPayload = {
        object: 'page',
        entry: [
          {
            id: '1552034478376801',
            time: Math.floor(Date.now() / 1000),
            changes: [
              {
                field: 'leadgen',
                value: {
                  leadgen_id: `test_lead_${Date.now()}`,
                  form_id: '123456789',
                  page_id: '1552034478376801',
                  ad_id: '987654321',
                  adgroup_id: '456789123',
                  campaign_id: '789123456',
                  created_time: Math.floor(Date.now() / 1000).toString(),
                },
              },
            ],
          },
        ],
      };

      console.log('📤 Sending test webhook:', testPayload);

      const response = await fetch('/api/webhooks/meta-leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      const result = await response.json();
      setTestResult({
        status: response.status,
        statusText: response.statusText,
        body: result,
        payload: testPayload,
      });

      if (response.ok) {
        toast({
          title: '✅ Webhook test successful',
          description: 'Check the console and database for the test lead',
          status: 'success',
          duration: 5000,
        });
      } else {
        toast({
          title: '❌ Webhook test failed',
          description: `Status: ${response.status}`,
          status: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toast({
        title: 'Error testing webhook',
        description: error instanceof Error ? error.message : 'Unknown error',
        status: 'error',
        duration: 5000,
      });
      setTestResult({
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={{ base: 4, md: 8 }}>
      <VStack spacing={6} align="stretch">
        <Heading size="lg">🧪 Webhook Test Center</Heading>

        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Testing Meta Webhook Integration</AlertTitle>
            <AlertDescription>
              This page helps you test the Meta webhook endpoint without needing actual form submissions.
            </AlertDescription>
          </Box>
        </Alert>

        {/* Webhook Status Check */}
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="md">1. Check Webhook Status</Heading>
              <Button
                leftIcon={<HiRefresh />}
                onClick={checkWebhookStatus}
                isLoading={loading}
                colorScheme="blue"
                size="sm"
              >
                Check Status
              </Button>
            </HStack>
          </CardHeader>
          <CardBody>
            {statusCheck ? (
              <VStack align="stretch" spacing={4}>
                <HStack>
                  <Text fontWeight="bold">Overall Status:</Text>
                  <Badge colorScheme={statusCheck.summary?.overall === 'HEALTHY' ? 'green' : 'red'}>
                    {statusCheck.summary?.overall}
                  </Badge>
                </HStack>

                <Box>
                  <Text fontWeight="bold" mb={2}>Environment Variables:</Text>
                  <Code p={3} borderRadius="md" display="block" whiteSpace="pre-wrap">
                    {JSON.stringify(statusCheck.checks?.environmentVariables, null, 2)}
                  </Code>
                </Box>

                {statusCheck.checks?.metaApiConnection && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>Meta API Connection:</Text>
                    <Code p={3} borderRadius="md" display="block" whiteSpace="pre-wrap">
                      {JSON.stringify(statusCheck.checks.metaApiConnection, null, 2)}
                    </Code>
                  </Box>
                )}

                {statusCheck.recommendations && statusCheck.recommendations.length > 0 && (
                  <Box>
                    <Text fontWeight="bold" mb={2}>Recommendations:</Text>
                    <VStack align="stretch" spacing={2}>
                      {statusCheck.recommendations.map((rec: string, idx: number) => (
                        <Text key={idx} fontSize="sm" color={rec.includes('✅') ? 'green.600' : 'orange.600'}>
                          {rec}
                        </Text>
                      ))}
                    </VStack>
                  </Box>
                )}
              </VStack>
            ) : (
              <Text color="gray.500">Click "Check Status" to verify webhook configuration</Text>
            )}
          </CardBody>
        </Card>

        <Divider />

        {/* Simulate Webhook */}
        <Card>
          <CardHeader>
            <HStack justify="space-between">
              <Heading size="md">2. Simulate Meta Webhook</Heading>
              <Button
                leftIcon={<HiPlay />}
                onClick={simulateMetaWebhook}
                isLoading={loading}
                colorScheme="green"
                size="sm"
              >
                Send Test Webhook
              </Button>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Text fontSize="sm" color="gray.600">
                This will send a simulated Meta webhook payload to your endpoint. The system will attempt to fetch
                full lead data from Meta API using the test lead ID.
              </Text>

              {testResult && (
                <>
                  <Divider />
                  <Box>
                    <Text fontWeight="bold" mb={2}>Response Status:</Text>
                    <Badge colorScheme={testResult.status === 200 ? 'green' : 'red'} fontSize="md" p={2}>
                      {testResult.status} {testResult.statusText}
                    </Badge>
                  </Box>

                  <Box>
                    <Text fontWeight="bold" mb={2}>Response Body:</Text>
                    <Code p={3} borderRadius="md" display="block" whiteSpace="pre-wrap" maxH="300px" overflowY="auto">
                      {JSON.stringify(testResult.body, null, 2)}
                    </Code>
                  </Box>

                  <Box>
                    <Text fontWeight="bold" mb={2}>Test Payload Sent:</Text>
                    <Code p={3} borderRadius="md" display="block" whiteSpace="pre-wrap" maxH="300px" overflowY="auto">
                      {JSON.stringify(testResult.payload, null, 2)}
                    </Code>
                  </Box>

                  {testResult.error && (
                    <Alert status="error">
                      <AlertIcon />
                      <AlertDescription>{testResult.error}</AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <Heading size="md">📋 Testing Instructions</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={3}>
              <Text>
                <strong>Step 1:</strong> Check webhook status to ensure environment variables are configured
              </Text>
              <Text>
                <strong>Step 2:</strong> Send a test webhook to simulate Meta sending lead data
              </Text>
              <Text>
                <strong>Step 3:</strong> Check the browser console (F12) for detailed logs
              </Text>
              <Text>
                <strong>Step 4:</strong> Go to Leads page to see if the test lead was created
              </Text>
              <Text fontSize="sm" color="gray.600" mt={4}>
                <strong>Note:</strong> The test webhook will create a real lead in the database. You can delete it
                afterwards from the Leads page. The system will try to fetch full data from Meta API, but since the
                test lead ID doesn't exist in Meta, it will fail at that step (which is expected).
              </Text>
            </VStack>
          </CardBody>
        </Card>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <Heading size="md">🔗 Quick Links</Heading>
          </CardHeader>
          <CardBody>
            <VStack align="stretch" spacing={2}>
              <Button
                as="a"
                href="/dashboard/leads"
                variant="link"
                colorScheme="blue"
                justifyContent="flex-start"
              >
                → View All Leads
              </Button>
              <Button
                as="a"
                href="/api/webhooks/meta-leads/test"
                target="_blank"
                variant="link"
                colorScheme="blue"
                justifyContent="flex-start"
              >
                → View Full Webhook Diagnostics (opens in new tab)
              </Button>
              <Button
                as="a"
                href="https://developers.facebook.com/apps"
                target="_blank"
                variant="link"
                colorScheme="blue"
                justifyContent="flex-start"
              >
                → Meta App Dashboard (configure webhook subscription)
              </Button>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}
