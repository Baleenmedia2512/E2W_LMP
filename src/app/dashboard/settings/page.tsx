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
import { useState, useRef } from 'react';

const validateWorkingHours = (startTime: string, endTime: string): string | null => {
  if (!startTime || !endTime) return null;
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  const startInMinutes = startHour * 60 + startMin;
  const endInMinutes = endHour * 60 + endMin;
  
  if (endInMinutes <= startInMinutes) {
    return 'End time must be after start time';
  }
  return null;
};

export default function SettingsPage() {
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);
  
  const [loading, setLoading] = useState(false);
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
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

      <VStack spacing={6} align="stretch">
        {/* Company Settings */}
        <Card>
          <CardHeader>
            <Heading size="md">Company Information</Heading>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Company Name</FormLabel>
                <Input
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
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
                <FormLabel>Default Lead Source</FormLabel>
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
                  <FormLabel>Start Time</FormLabel>
                  <Input
                    type="time"
                    name="workingHoursStart"
                    value={formData.workingHoursStart}
                    onChange={handleChange}
                  />
                </FormControl>

                <FormControl isInvalid={!!timeError}>
                  <FormLabel>End Time</FormLabel>
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
                <FormLabel>Timezone</FormLabel>
                <Select
                  name="timezone"
                  value={formData.timezone}
                  onChange={handleChange}
                >
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Asia/Kolkata">India Standard Time (IST)</option>
                  <option value="Europe/London">Greenwich Mean Time (GMT)</option>
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
    </Box>
  );
}





