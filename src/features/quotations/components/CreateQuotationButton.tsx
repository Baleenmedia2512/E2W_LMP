'use client';

import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import { useState } from 'react';
import { QuotationForm } from './QuotationForm';
import { QuotationPDFPreview } from './QuotationPDFPreview';

interface CreateQuotationButtonProps {
  leadId?: string;
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
  buttonText?: string;
  buttonSize?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline' | 'ghost';
  colorScheme?: string;
}

export const CreateQuotationButton = ({
  leadId,
  leadName = '',
  leadEmail = '',
  leadPhone = '',
  buttonText = 'Create Quotation',
  buttonSize = 'md',
  variant = 'solid',
  colorScheme = 'blue',
}: CreateQuotationButtonProps) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isPreviewOpen,
    onOpen: onPreviewOpen,
    onClose: onPreviewClose,
  } = useDisclosure();
  const toast = useToast();
  const [previewData, setPreviewData] = useState<any>(null);

  const handleSave = (data: any) => {
    // In real app, save via API
    console.log('Saving quotation for lead:', leadId, data);

    toast({
      title: 'Quotation Created',
      description: 'The quotation has been created and linked to this lead.',
      status: 'success',
      duration: 3000,
    });

    onClose();
    onPreviewClose();
  };

  const handlePreview = (data: any) => {
    setPreviewData(data);
    onPreviewOpen();
  };

  const handleDownload = () => {
    toast({
      title: 'Download Started',
      description: 'PDF is being generated...',
      status: 'info',
      duration: 3000,
    });
  };

  const handleSend = () => {
    toast({
      title: 'Email Sent',
      description: `Quotation sent to ${previewData?.customerEmail}`,
      status: 'success',
      duration: 3000,
    });
    
    // Also save after sending
    handleSave(previewData);
  };

  return (
    <>
      <Button
        leftIcon={<AddIcon />}
        colorScheme={colorScheme}
        size={buttonSize}
        variant={variant}
        onClick={onOpen}
      >
        {buttonText}
      </Button>

      {/* Quotation Form Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent maxH="90vh" overflowY="auto">
          <ModalHeader>Create Quotation{leadName && ` for ${leadName}`}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <QuotationForm
              leadId={leadId}
              leadName={leadName}
              leadEmail={leadEmail}
              leadPhone={leadPhone}
              onSave={handleSave}
              onPreview={handlePreview}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* PDF Preview Modal */}
      <Modal isOpen={isPreviewOpen} onClose={onPreviewClose} size="6xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Quotation Preview</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {previewData && (
              <QuotationPDFPreview
                data={previewData}
                onDownload={handleDownload}
                onSend={handleSend}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};
