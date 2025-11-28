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
} from '@chakra-ui/react';
import { useState } from 'react';
import { mockSettings } from '@/shared/lib/mock-data';

export default function SettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: mockSettings.companyName,
    emailNotifications: mockSettings.emailNotifications,
    smsNotifications: mockSettings.smsNotifications,
    autoAssignLeads: mockSettings.autoAssignLeads,
    defaultLeadSource: mockSettings.defaultLeadSource,
    workingHoursStart: mockSettings.workingHours.start,
    workingHoursEnd: mockSettings.workingHours.end,
    timezone: mockSettings.timezone,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData({
      ...formData,
      [name]: checked,
    });
  };

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      toast({
        title: 'Settings saved',
        description: 'Your settings have been updated successfully',
        status: 'success',
        duration: 3000,
      });
      setLoading(false);
    }, 1000);
  };

  const handleReset = () => {
    setFormData({
      companyName: mockSettings.companyName,
      emailNotifications: mockSettings.emailNotifications,
      smsNotifications: mockSettings.smsNotifications,
      autoAssignLeads: mockSettings.autoAssignLeads,
      defaultLeadSource: mockSettings.defaultLeadSource,
      workingHoursStart: mockSettings.workingHours.start,
      workingHoursEnd: mockSettings.workingHours.end,
      timezone: mockSettings.timezone,
    });
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

                <FormControl>
                  <FormLabel>End Time</FormLabel>
                  <Input
                    type="time"
                    name="workingHoursEnd"
                    value={formData.workingHoursEnd}
                    onChange={handleChange}
                  />
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
                loadingText="Saving..."
              >
                Save Settings
              </Button>
            </HStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}





