'use client';

import {
  Box,
  Heading,
  Text,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Switch,
  Divider,
  HStack,
  Card,
  CardBody,
  SimpleGrid,
} from '@chakra-ui/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FiSettings, FiGrid } from 'react-icons/fi';

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <Box>
      <Heading size="lg" mb={6}>
        Settings
      </Heading>

      {/* Quick Access Cards for SuperAgent */}
      {session?.user?.role === 'SuperAgent' && (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mb={6}>
          <Card
            cursor="pointer"
            _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
            transition="all 0.2s"
            onClick={() => router.push('/dashboard/settings/meta')}
          >
            <CardBody>
              <HStack spacing={3}>
                <Box p={3} bg="blue.100" borderRadius="lg">
                  <FiGrid size={24} color="#3182CE" />
                </Box>
                <Box>
                  <Text fontWeight="600" fontSize="lg">
                    Meta Integration
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Configure Facebook Lead Ads
                  </Text>
                </Box>
              </HStack>
            </CardBody>
          </Card>

          {/* Add more integration cards here */}
        </SimpleGrid>
      )}

      <Box bg="white" p={6} borderRadius="lg" boxShadow="sm" maxW="2xl">
        <VStack spacing={6} align="stretch">
          {/* Profile Settings */}
          <Box>
            <Heading size="md" mb={4}>
              Profile Settings
            </Heading>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input value={session?.user?.name || ''} isReadOnly />
              </FormControl>

              <FormControl>
                <FormLabel>Email</FormLabel>
                <Input value={session?.user?.email || ''} isReadOnly />
              </FormControl>

              <FormControl>
                <FormLabel>Role</FormLabel>
                <Input value={session?.user?.role || ''} isReadOnly />
              </FormControl>
            </VStack>
          </Box>

          <Divider />

          {/* Notification Settings */}
          <Box>
            <Heading size="md" mb={4}>
              Notifications
            </Heading>
            <VStack spacing={4} align="stretch">
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Email Notifications</FormLabel>
                <Switch colorScheme="brand" />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Push Notifications</FormLabel>
                <Switch colorScheme="brand" />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">SMS Notifications</FormLabel>
                <Switch colorScheme="brand" />
              </FormControl>
            </VStack>
          </Box>

          <Divider />

          {/* Preferences */}
          <Box>
            <Heading size="md" mb={4}>
              Preferences
            </Heading>
            <VStack spacing={4} align="stretch">
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Dark Mode</FormLabel>
                <Switch colorScheme="brand" />
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Auto-refresh Dashboard</FormLabel>
                <Switch colorScheme="brand" defaultChecked />
              </FormControl>
            </VStack>
          </Box>

          <Divider />

          <HStack justify="flex-end">
            <Button variant="outline">Cancel</Button>
            <Button colorScheme="brand">Save Changes</Button>
          </HStack>
        </VStack>
      </Box>

      <Box bg="blue.50" p={4} borderRadius="lg" mt={6} maxW="2xl">
        <Text fontSize="sm" color="blue.700">
          <strong>Note:</strong> Settings functionality is currently in development. Changes will
          be saved in future updates.
        </Text>
      </Box>
    </Box>
  );
}
