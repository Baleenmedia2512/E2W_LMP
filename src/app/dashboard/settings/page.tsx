'use client';

import {
  Box,
  Heading,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Card,
  CardBody,
  CardHeader,
  useToast,
  Switch,
  Select,
  SimpleGrid,
  Divider,
  Text,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  FormErrorMessage,
} from '@chakra-ui/react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/shared/lib/auth/auth-context';

const validateWorkingHours = (startTime: string, endTime: string): string | null => {
  if (!startTime || !endTime) return null;
  const startParts = startTime.split(':').map(Number);
  const endParts = endTime.split(':').map(Number);
  
  const startHour = startParts[0] || 0;
  const startMin = startParts[1] || 0;
  const endHour = endParts[0] || 0;
  const endMin = endParts[1] || 0;
  
  const startInMinutes = startHour * 60 + startMin;
  const endInMinutes = endHour * 60 + endMin;
  
  if (endInMinutes <= startInMinutes) {
    return 'End time must be after start time';
  }
  return null;
};

export default function SettingsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [timeError, setTimeError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    companyName: 'E2W LMP',
    emailNotifications: true,
    smsNotifications: true,
    autoAssignLeads: false,
    defaultLeadSource: 'Website',
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    timezone: 'Asia/Kolkata',
  });

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      setLoadingSettings(true);
      try {
        // First try to load from localStorage
        const savedSettings = localStorage.getItem('userSettings');
        if (savedSettings) {
          setFormData(JSON.parse(savedSettings));
        }

        // Then try to fetch from API to get latest from database
        if (user?.id) {
          const response = await fetch('/api/settings', {
            headers: {
              'x-user-id': user.id,
            },
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.settings) {
              setFormData(data.settings);
              localStorage.setItem('userSettings', JSON.stringify(data.settings));
            }
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettings();
  }, [user?.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });

    // Validate working hours if either time field changed
    if (name === 'workingHoursStart' || name === 'workingHoursEnd') {
      const newStart = name === 'workingHoursStart' ? value : formData.workingHoursStart;
      const newEnd = name === 'workingHoursEnd' ? value : formData.workingHoursEnd;
      setTimeError(validateWorkingHours(newStart, newEnd));
    }
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  const handleSave = async () => {
    // Validate working hours before saving
    const error = validateWorkingHours(formData.workingHoursStart, formData.workingHoursEnd);
    if (error) {
      setTimeError(error);
      toast({
        title: 'Validation Error',
        description: error,
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setLoading(true);
    try {
      // Save to localStorage for immediate availability
      localStorage.setItem('userSettings', JSON.stringify(formData));

      // Try to save to database
      if (user?.id) {
        const response = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user.id,
          },
          body: JSON.stringify(formData),
        });

        if (!response.ok) {
          throw new Error('Failed to save settings to database');
        }

        toast({
          title: 'Settings saved',
          description: 'Your settings have been updated successfully',
          status: 'success',
          duration: 3000,
        });
      } else {
        toast({
          title: 'Settings saved locally',
          description: 'Settings saved to your device. Please login to sync with database.',
          status: 'warning',
          duration: 3000,
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Settings saved locally',
        description: 'Settings saved to your device. Database sync pending.',
        status: 'warning',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    onOpen();
  };

  const confirmReset = () => {
    const defaultSettings = {
      companyName: 'E2W LMP',
      emailNotifications: true,
      smsNotifications: true,
      autoAssignLeads: false,
      defaultLeadSource: 'Website',
      workingHoursStart: '09:00',
      workingHoursEnd: '18:00',
      timezone: 'Asia/Kolkata',
    };
    setFormData(defaultSettings);
    localStorage.setItem('userSettings', JSON.stringify(defaultSettings));
    setTimeError(null);
    onClose();
    toast({
      title: 'Settings reset',
      description: 'Settings have been reset to default values',
      status: 'info',
      duration: 3000,
    });
  };

  return (
    <Box>
      <Heading size="lg" mb={6}>
        Settings
      </Heading>

      {loadingSettings ? (
        <Card>
          <CardBody>
            <Text textAlign="center" py={8}>Loading settings...</Text>
          </CardBody>
        </Card>
      ) : (
        <VStack spacing={6} align="stretch">
        {/* Company Settings */}
        <Card>
          <CardHeader>
            <Heading size="md">Company Information</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>
                  Company Name
                  <Text fontSize="sm" color="gray.600" fontWeight="normal">
                    Your organization name displayed in the application
                  </Text>
                </FormLabel>
                <Input
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  placeholder="Enter company name"
                />
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <Heading size="md">Notification Preferences</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="email-notifications" mb="0" flex="1">
                  Email Notifications
                  <Text fontSize="sm" color="gray.600">
                    Receive email updates for new leads and follow-ups
                  </Text>
                </FormLabel>
                <Switch
                  id="email-notifications"
                  isChecked={formData.emailNotifications}
                  onChange={(e) => handleSwitchChange('emailNotifications', e.target.checked)}
                />
              </FormControl>

              <Divider />

              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="sms-notifications" mb="0" flex="1">
                  SMS Notifications
                  <Text fontSize="sm" color="gray.600">
                    Get SMS alerts for urgent leads and reminders
                  </Text>
                </FormLabel>
                <Switch
                  id="sms-notifications"
                  isChecked={formData.smsNotifications}
                  onChange={(e) => handleSwitchChange('smsNotifications', e.target.checked)}
                />
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* Lead Management Settings */}
        <Card>
          <CardHeader>
            <Heading size="md">Lead Management</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <FormControl display="flex" alignItems="center">
                <FormLabel htmlFor="auto-assign" mb="0" flex="1">
                  Auto-Assign Leads
                  <Text fontSize="sm" color="gray.600">
                    Automatically distribute new leads among agents
                  </Text>
                </FormLabel>
                <Switch
                  id="auto-assign"
                  isChecked={formData.autoAssignLeads}
                  onChange={(e) => handleSwitchChange('autoAssignLeads', e.target.checked)}
                />
              </FormControl>

              <FormControl>
                <FormLabel>
                  Default Lead Source
                  <Text fontSize="sm" color="gray.600" fontWeight="normal">
                    Default source when creating new leads manually
                  </Text>
                </FormLabel>
                <Select
                  name="defaultLeadSource"
                  value={formData.defaultLeadSource}
                  onChange={handleChange}
                >
                  <option value="Website">Website</option>
                  <option value="Meta">Meta</option>
                  <option value="Referral">Referral</option>
                  <option value="Direct">Direct</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Cold Call">Cold Call</option>
                </Select>
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* Working Hours */}
        <Card>
          <CardHeader>
            <Heading size="md">Working Hours</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                <FormControl>
                  <FormLabel>
                    Start Time
                    <Text fontSize="sm" color="gray.600" fontWeight="normal">
                      When your workday begins
                    </Text>
                  </FormLabel>
                  <Input
                    type="time"
                    name="workingHoursStart"
                    value={formData.workingHoursStart}
                    onChange={handleChange}
                  />
                </FormControl>

                <FormControl isInvalid={!!timeError}>
                  <FormLabel>
                    End Time
                    <Text fontSize="sm" color="gray.600" fontWeight="normal">
                      When your workday ends
                    </Text>
                  </FormLabel>
                  <Input
                    type="time"
                    name="workingHoursEnd"
                    value={formData.workingHoursEnd}
                    onChange={handleChange}
                  />
                  {timeError && <FormErrorMessage>{timeError}</FormErrorMessage>}
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel>
                  Timezone
                  <Text fontSize="sm" color="gray.600" fontWeight="normal">
                    Set your local timezone for accurate scheduling
                  </Text>
                </FormLabel>
                <Select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                >
                  <option value="America/New_York">Eastern Time (ET) - New York</option>
                  <option value="America/Chicago">Central Time (CT) - Chicago</option>
                  <option value="America/Denver">Mountain Time (MT) - Denver</option>
                  <option value="America/Los_Angeles">Pacific Time (PT) - Los Angeles</option>
                  <option value="Europe/London">Greenwich Mean Time (GMT) - London</option>
                  <option value="Europe/Paris">Central European Time (CET) - Paris</option>
                  <option value="Asia/Dubai">Gulf Standard Time (GST) - Dubai</option>
                  <option value="Asia/Kolkata">India Standard Time (IST) - India</option>
                  <option value="Asia/Singapore">Singapore Standard Time (SST)</option>
                  <option value="Australia/Sydney">Australian Eastern Time (AET) - Sydney</option>
                  <option value="Pacific/Auckland">New Zealand Standard Time (NZST)</option>
                </Select>
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardBody>
            <HStack spacing={4} justify="flex-end">
              <Button
                variant="outline"
                onClick={handleReset}
              >
                Reset to Defaults
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleSave}
                isLoading={loading}
                isDisabled={!!timeError}
                loadingText="Saving..."
              >
                Save Settings
              </Button>
            </HStack>
          </CardBody>
        </Card>

        {/* Reset Confirmation Dialog */}
        <AlertDialog
          isOpen={isOpen}
          leastDestructiveRef={cancelRef}
          onClose={onClose}
        >
          <AlertDialogOverlay>
            <AlertDialogContent>
              <AlertDialogHeader fontSize="lg" fontWeight="bold">
                Reset Settings
              </AlertDialogHeader>
              <AlertDialogBody>
                Are you sure you want to reset all settings to their default values? This action cannot be undone.
              </AlertDialogBody>
              <AlertDialogFooter>
                <Button ref={cancelRef} onClick={onClose}>
                  Cancel
                </Button>
                <Button colorScheme="red" onClick={confirmReset} ml={3}>
                  Reset
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogOverlay>
        </AlertDialog>
      </VStack>
      )}
    </Box>
  );
}





