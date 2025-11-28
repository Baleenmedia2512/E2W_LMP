'use client';

import {
  IconButton,
  Tooltip,
  Box,
  HStack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { FiMic, FiMicOff } from 'react-icons/fi';
import { useSpeechRecognition } from '@/features/leads/hooks/useSpeechRecognition';
import { useEffect, useRef, useCallback } from 'react';

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  label?: string;
}

export default function VoiceInputButton({ onTranscript, label = 'Voice Input' }: VoiceInputButtonProps) {
  const toast = useToast();
  const onTranscriptRef = useRef(onTranscript);
  const lastTranscriptRef = useRef('');
  
  const {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Update the ref when onTranscript changes
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Only call onTranscript when transcript actually changes
  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current) {
      lastTranscriptRef.current = transcript;
      onTranscriptRef.current(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (error) {
      toast({
        title: 'Voice Recognition Error',
        description: error,
        status: 'error',
        duration: 3000,
      });
    }
  }, [error, toast]);

  const handleToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      lastTranscriptRef.current = '';
      resetTranscript();
      startListening();
    }
  }, [isListening, stopListening, resetTranscript, startListening]);

  if (!isSupported) {
    return (
      <Tooltip label="Voice input not supported in this browser">
        <IconButton
          icon={<FiMicOff />}
          aria-label="Voice input not supported"
          isDisabled
          size="sm"
          variant="ghost"
        />
      </Tooltip>
    );
  }

  return (
    <HStack spacing={2} align="center">
      <Tooltip label={isListening ? 'Stop recording' : label}>
        <IconButton
          icon={isListening ? <FiMic /> : <FiMic />}
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          onClick={handleToggle}
          colorScheme={isListening ? 'red' : 'blue'}
          variant={isListening ? 'solid' : 'outline'}
          size="sm"
        />
      </Tooltip>
      
      {isListening && (
        <Text fontSize="xs" color="red.500" fontWeight="medium">
          Recording...
        </Text>
      )}
    </HStack>
  );
}





