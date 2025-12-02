'use client';

import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  Button,
  VStack,
  Text,
  IconButton,
  HStack,
} from '@chakra-ui/react';
import { HiArrowLeft } from 'react-icons/hi';
import { useRouter } from 'next/navigation';

interface NextActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
}

/**
 * NextActionModal - Clean modal for selecting next action after a call
 * 
 * Features:
 * - No footer, no back button
 * - Only 5 action buttons: Follow-up, Unqualified, Unreachable, Win 🎉, Lost
 * - Closes modal and navigates on action selection
 * - Back navigation does NOT reopen modal
 */
export default function NextActionModal({
  isOpen,
  onClose,
  leadId,
  leadName,
}: NextActionModalProps) {
  const router = useRouter();

  const handleAction = (action: 'followup' | 'unqualified' | 'unreachable' | 'win' | 'lost') => {
    // Close modal first
    onClose();

    // Navigate based on action
    switch (action) {
      case 'followup':
        router.push('/dashboard/followups');
        break;
      case 'unqualified':
        router.push('/dashboard/leads/unqualified');
        break;
      case 'unreachable':
        router.push('/dashboard/leads/unreachable');
        break;
      case 'win':
        // Could also navigate to a success page or stay on current page
        router.push('/dashboard/leads');
        break;
      case 'lost':
        // Could also navigate to a lost leads page
        router.push('/dashboard/leads');
        break;
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size={{ base: 'full', md: 'md' }} closeOnOverlayClick={false}>
      <ModalOverlay />
      <ModalContent mx={{ base: 0, md: 4 }} my={{ base: 0, md: 8 }}>
        <ModalHeader fontSize={{ base: 'lg', md: 'xl' }}>
          <HStack spacing={2}>
            <IconButton
              aria-label="Go back"
              icon={<HiArrowLeft />}
              size="sm"
              variant="ghost"
              onClick={handleBack}
            />
            <Text>Next Action</Text>
          </HStack>
        </ModalHeader>

        <ModalBody pb={6}>
          <VStack spacing={6} py={4}>
            <Text fontSize="lg" fontWeight="bold" textAlign="center" color="blue.700">
              Where do you want to move this lead?
            </Text>

            <VStack spacing={3} width="full">
              <Button
                width="full"
                size="lg"
                colorScheme="orange"
                onClick={() => handleAction('followup')}
              >
                Follow-up
              </Button>

              <Button
                width="full"
                size="lg"
                colorScheme="purple"
                onClick={() => handleAction('unqualified')}
              >
                Unqualified
              </Button>

              <Button
                width="full"
                size="lg"
                colorScheme="pink"
                onClick={() => handleAction('unreachable')}
              >
                Unreachable
              </Button>

              <Button
                width="full"
                size="lg"
                colorScheme="green"
                onClick={() => handleAction('win')}
              >
                Win 🎉
              </Button>

              <Button
                width="full"
                size="lg"
                colorScheme="red"
                onClick={() => handleAction('lost')}
              >
                Lost
              </Button>
            </VStack>
          </VStack>
        </ModalBody>

        {/* No ModalFooter - clean design */}
      </ModalContent>
    </Modal>
  );
}
