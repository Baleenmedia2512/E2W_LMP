'use client';

import { 
  FormControl, 
  FormLabel, 
  FormErrorMessage, 
  FormHelperText,
  Textarea, 
  TextareaProps,
  Text
} from '@chakra-ui/react';
import { ChangeEvent, FocusEvent, useState } from 'react';

interface ValidatedTextareaProps extends Omit<TextareaProps, 'onChange' | 'onBlur'> {
  label: string;
  name: string;
  error?: string;
  isRequired?: boolean;
  helperText?: string;
  showCharCount?: boolean;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: FocusEvent<HTMLTextAreaElement>) => void;
}

export default function ValidatedTextarea({
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
  ...textareaProps
}: ValidatedTextareaProps) {
  const [isFocused, setIsFocused] = useState(false);
  const currentLength = typeof value === 'string' ? value.length : 0;

  const handleFocus = () => setIsFocused(true);
  
  const handleBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
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
      <Textarea
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
        {...textareaProps}
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
