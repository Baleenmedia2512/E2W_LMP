'use client';

import {
  Box,
  Container,
  Heading,
  VStack,
  HStack,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Icon,
  Card,
  CardBody,
  Text,
  useToast,
  Spinner,
  Center,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { FiUserPlus, FiEdit, FiTrash2, FiShield, FiCheck, FiX } from 'react-icons/fi';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function ManageUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error: any) {
      toast({
        title: 'Error loading users',
        description: error.message,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SuperAgent':
        return 'purple';
      case 'Agent':
        return 'blue';
      case 'Finance':
        return 'green';
      case 'HR':
        return 'orange';
      case 'Procurement':
        return 'teal';
      default:
        return 'gray';
    }
  };

  if (isLoading) {
    return (
      <Center h="50vh">
        <VStack spacing={4}>
          <Spinner size="xl" color="brand.500" />
          <Text color="gray.600">Loading users...</Text>
        </VStack>
      </Center>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <HStack justify="space-between">
          <Box>
            <HStack spacing={3} mb={2}>
              <Icon as={FiShield} boxSize={8} color="brand.500" />
              <Heading size="lg">Manage Users</Heading>
            </HStack>
            <Text color="gray.600">View and manage all system users</Text>
          </Box>
          <Link href="/dashboard/super/users/add">
            <Button leftIcon={<FiUserPlus />} colorScheme="brand" size="lg">
              Add User
            </Button>
          </Link>
        </HStack>

        {/* Users Table */}
        <Card>
          <CardBody p={0}>
            {users.length === 0 ? (
              <Center py={12}>
                <VStack spacing={4}>
                  <Icon as={FiShield} boxSize={12} color="gray.400" />
                  <Text color="gray.500">No users found</Text>
                  <Link href="/dashboard/super/users/add">
                    <Button leftIcon={<FiUserPlus />} colorScheme="brand" variant="outline">
                      Add First User
                    </Button>
                  </Link>
                </VStack>
              </Center>
            ) : (
              <Table variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Role</Th>
                    <Th>Status</Th>
                    <Th>Created At</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {users.map((user) => (
                    <Tr key={user.id} _hover={{ bg: 'gray.50' }}>
                      <Td fontWeight="medium">{user.name}</Td>
                      <Td color="gray.600">{user.email}</Td>
                      <Td>
                        <Badge colorScheme={getRoleBadgeColor(user.role)} fontSize="sm" px={2} py={1}>
                          {user.role}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Icon
                            as={user.isActive ? FiCheck : FiX}
                            color={user.isActive ? 'green.500' : 'red.500'}
                          />
                          <Text fontSize="sm" color={user.isActive ? 'green.600' : 'red.600'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Text>
                        </HStack>
                      </Td>
                      <Td color="gray.600" fontSize="sm">
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Td>
                      <Td>
                        <HStack spacing={2}>
                          <Tooltip label="Edit User">
                            <IconButton
                              aria-label="Edit user"
                              icon={<FiEdit />}
                              size="sm"
                              variant="ghost"
                              colorScheme="blue"
                              onClick={() => router.push(`/dashboard/super/users/${user.id}`)}
                            />
                          </Tooltip>
                          <Tooltip label="Delete User">
                            <IconButton
                              aria-label="Delete user"
                              icon={<FiTrash2 />}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => {
                                toast({
                                  title: 'Delete functionality',
                                  description: 'Delete user feature coming soon',
                                  status: 'info',
                                  duration: 3000,
                                });
                              }}
                            />
                          </Tooltip>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </CardBody>
        </Card>

        {/* Stats */}
        <HStack spacing={6}>
          <Card flex={1}>
            <CardBody>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Total Users
              </Text>
              <Text fontSize="3xl" fontWeight="bold" color="brand.600">
                {users.length}
              </Text>
            </CardBody>
          </Card>
          <Card flex={1}>
            <CardBody>
              <Text fontSize="sm" color="gray.600" mb={1}>
                Active Users
              </Text>
              <Text fontSize="3xl" fontWeight="bold" color="green.600">
                {users.filter((u) => u.isActive).length}
              </Text>
            </CardBody>
          </Card>
          <Card flex={1}>
            <CardBody>
              <Text fontSize="sm" color="gray.600" mb={1}>
                SuperAgents
              </Text>
              <Text fontSize="3xl" fontWeight="bold" color="purple.600">
                {users.filter((u) => u.role === 'SuperAgent').length}
              </Text>
            </CardBody>
          </Card>
        </HStack>
      </VStack>
    </Container>
  );
}
