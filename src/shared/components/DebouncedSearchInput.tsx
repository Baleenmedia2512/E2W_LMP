'use client';

import { useState, useRef, memo, useCallback } from 'react';
import { InputGroup, InputLeftElement, Input } from '@chakra-ui/react';
import { HiSearch } from 'react-icons/hi';

interface DebouncedSearchInputProps {
  placeholder: string;
  onSearch: (value: string) => void;
  debounceMs?: number;
  size?: 'sm' | 'md' | 'lg';
  maxW?: any;
}

function DebouncedSearchInput({
  placeholder,
  onSearch,
  debounceMs = 300,
  size = 'md',
  maxW,
}: DebouncedSearchInputProps) {
  const [inputValue, setInputValue] = useState('');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle input change with immediate visual feedback
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Update input value immediately for instant visual feedback
    setInputValue(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If clearing search (empty value), trigger immediately for instant feedback
    if (value.trim() === '') {
      onSearch('');
      return;
    }

    // Set new timer to trigger search for non-empty values
    debounceTimerRef.current = setTimeout(() => {
      onSearch(value);
    }, debounceMs);
  }, [onSearch, debounceMs]);

  return (
    <InputGroup maxW={maxW}>
      <InputLeftElement pointerEvents="none">
        <HiSearch />
      </InputLeftElement>
      <Input
        placeholder={placeholder}
        value={inputValue}
        onChange={handleChange}
        size={size}
        autoComplete="off"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        type="text"
        data-1p-ignore
        data-lpignore="true"
      />
    </InputGroup>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(DebouncedSearchInput);
