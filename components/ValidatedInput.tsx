'use client';

import { FormControl, FormLabel, FormErrorMessage, Input, InputProps } from '@chakra-ui/react';
import { ChangeEvent } from 'react';

interface ValidatedInputProps extends Omit<InputProps, 'onChange'> {
  label: string;
  name: string;
  error?: string;
  isRequired?: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function ValidatedInput({
  label,
  name,
  error,
  isRequired = false,
  onChange,
  onBlur,
  ...inputProps
}: ValidatedInputProps) {
  return (
    <FormControl isInvalid={!!error} isRequired={isRequired}>
      <FormLabel htmlFor={name}>{label}</FormLabel>
      <Input
        id={name}
        name={name}
        onChange={onChange}
        onBlur={onBlur}
        {...inputProps}
      />
      {error && <FormErrorMessage>{error}</FormErrorMessage>}
    </FormControl>
  );
}
