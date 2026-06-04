'use client';

import React, { useRef, useState, useEffect, useCallback, KeyboardEvent, ClipboardEvent } from 'react';
import { HStack, PinInput, PinInputField } from '@chakra-ui/react';

interface OtpInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  onClear?: () => void;
  isDisabled?: boolean;
  hasError?: boolean;
}

export function OtpInput({
  length = 6,
  onComplete,
  onClear,
  isDisabled = false,
  hasError = false,
}: OtpInputProps) {
  const [otp, setOtp] = useState<string>('');
  const hasSubmitted = useRef(false);

  // Reset submission flag when hasError changes to true (retry scenario)
  useEffect(() => {
    if (hasError) {
      hasSubmitted.current = false;
    }
  }, [hasError]);

  useEffect(() => {
    // Only submit once when OTP is complete
    if (otp.length === length && !hasSubmitted.current) {
      hasSubmitted.current = true;
      onComplete(otp);
    }
    
    // Reset submission flag when OTP is cleared
    if (otp.length === 0) {
      hasSubmitted.current = false;
    }
  }, [otp, length, onComplete]);

  const handleChange = useCallback((value: string) => {
    setOtp(value);
    
    // Call onClear when OTP is cleared
    if (value === '' && onClear) {
      onClear();
    }
  }, [onClear]);

  return (
    <HStack spacing={{ base: 2, md: 3 }} justify="center">
      <PinInput
        value={otp}
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
