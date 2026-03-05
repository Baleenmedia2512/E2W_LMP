'use client';

import { useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Stack,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { QuotationForm } from '@/features/quotations/components/QuotationForm';
import { QuotationPDFPreview } from '@/features/quotations/components/QuotationPDFPreview';

export default function NewQuotationPage() {
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [previewData, setPreviewData] = useState<any>(null);

  const handleSave = (data: any) => {
    // In real app, this would save to database via API
    console.log('Saving quotation:', data);
    
    toast({
      title: 'Quotation Saved',
      description: 'The quotation has been saved successfully.',
      status: 'success',
      duration: 3000,
    });

    // Redirect to quotations list
    setTimeout(() => {
      router.push('/dashboard/quotations');
    }, 1500);
  };

  const handlePreview = (data: any) => {
    setPreviewData(data);
    onOpen();
  };

  const handleDownload = () => {
    toast({
      title: 'Download Started',
      description: 'PDF is being generated...',
      status: 'info',
      duration: 3000,
    });
    
    // In real app, this would generate and download PDF
    // You can use libraries like jsPDF or react-pdf
  };

  const handleSend = () => {
    toast({
      title: 'Email Sent',
      description: `Quotation sent to ${previewData?.customerEmail}`,
      status: 'success',
      duration: 3000,
    });
    onClose();
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={6}>
        <Box>
          <Heading size="lg">Create New Quotation</Heading>
        </Box>

        <QuotationForm onSave={handleSave} onPreview={handlePreview} />
      </Stack>

      {/* PDF Preview Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
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
    </Container>
  );
}
