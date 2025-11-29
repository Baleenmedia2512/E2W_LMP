'use client';

import { 
  FormControl, 
  FormLabel, 
  FormErrorMessage, 
  FormHelperText,
  Input, 
  InputProps,
  Text,
  Box
} from '@chakra-ui/react';
import { ChangeEvent, FocusEvent, useState } from 'react';

interface ValidatedInputProps extends Omit<InputProps, 'onChange' | 'onBlur'> {
  label: string;
  name: string;
  error?: string;
  isRequired?: boolean;
  helperText?: string;
  showCharCount?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
}

export default function ValidatedInput({
  label,
  name,
  error,
  isRequired = false,
  helperText,
  showCharCount = false,
  onChange,
  onBlur,
  maxLength,
  value,
  ...inputProps
}: ValidatedInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const currentLength = typeof value === 'string' ? value.length : 0;

  const handleFocus = () => setIsFocused(true);
  
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) {
      onBlur(e);
    }
  };

  return (
    <FormControl isInvalid={!!error} isRequired={isRequired}>
      <FormLabel htmlFor={name}>
        {label}
        {isRequired && (
          <Text as="span" color="red.500" ml={1}>
            *
          </Text>
        )}
      </FormLabel>
      <Input
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        maxLength={maxLength}
        borderColor={error ? 'red.500' : isFocused ? 'blue.500' : 'gray.200'}
        _hover={{
          borderColor: error ? 'red.600' : 'gray.300',
        }}
        {...inputProps}
      />
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
      {!error && helperText && (
        <FormHelperText color="gray.500">{helperText}</FormHelperText>
      )}
      {!error && showCharCount && maxLength && (
        <FormHelperText 
          color={currentLength > maxLength * 0.9 ? 'orange.500' : 'gray.500'}
          fontSize="xs"
        >
          {currentLength} / {maxLength} characters
        </FormHelperText>
      )}
    </FormControl>
  );
}




