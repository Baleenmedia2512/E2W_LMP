'use client';

import React, { useRef, useState, useEffect, useCallback, KeyboardEvent, ClipboardEvent } from 'react';
import { HStack, PinInput, PinInputField } from '@chakra-ui/react';

interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  onChange?: (otp: string) => void;
  onClear?: () => void;
  isDisabled?: boolean;
  hasError?: boolean;
  value?: string;
}

export function OtpInput({
  length = 6,
  onComplete,
  onChange,
  onClear,
  isDisabled = false,
  hasError = false,
  value = '',
}: OtpInputProps) {
  const hasSubmitted = useRef(false);
  const previousValueRef = useRef('');

  // Track submission based on value prop changes
  useEffect(() => {
    // Reset submission flag when value is cleared
    if (value === '') {
      hasSubmitted.current = false;
      previousValueRef.current = '';
    }
    
    // Only submit once when OTP is complete and value actually changed
    if (value.length === length && !hasSubmitted.current && value !== previousValueRef.current) {
      hasSubmitted.current = true;
      previousValueRef.current = value;
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleChange = useCallback((newValue: string) => {
    // Notify parent of changes
    if (onChange) {
      onChange(newValue);
    }
    
    // Call onClear when OTP is cleared
    if (newValue === '' && onClear) {
      onClear();
    }
  }, [onChange, onClear]);

  return (
    <HStack spacing={{ base: 2, md: 3 }} justify="center">
      <PinInput
        value={value}
        onChange={handleChange}
        otp
        size={{ base: 'lg', md: 'xl' }}
        isDisabled={isDisabled}
        placeholder=""
        manageFocus
      >
        {Array.from({ length }).map((_, index) => (
          <PinInputField
            key={index}
            borderColor={hasError ? 'red.500' : 'gray.300'}
            borderWidth="2px"
            _hover={{
              borderColor: hasError ? 'red.600' : 'purple.400',
            }}
            _focus={{
              borderColor: hasError ? 'red.600' : 'purple.500',
              boxShadow: hasError ? '0 0 0 1px var(--chakra-colors-red-500)' : '0 0 0 1px var(--chakra-colors-purple-500)',
            }}
            _disabled={{
              opacity: 0.6,
              cursor: 'not-allowed',
            }}
            bg="white"
            fontSize={{ base: '2xl', md: '3xl' }}
            fontWeight="bold"
            textAlign="center"
            borderRadius="lg"
            width={{ base: '45px', md: '60px' }}
            height={{ base: '50px', md: '65px' }}
            transition="all 0.2s"
          />
        ))}
      </PinInput>
    </HStack>
  );
}
