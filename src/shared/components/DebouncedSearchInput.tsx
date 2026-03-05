'use client';

import { useRef, memo } from 'react';
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
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle input change - NO state updates, pure DOM event handling
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer to trigger search
    debounceTimerRef.current = setTimeout(() => {
      onSearch(value);
    }, debounceMs);
  };

  return (
    <InputGroup maxW={maxW}>
      <InputLeftElement pointerEvents="none">
        <HiSearch />
      </InputLeftElement>
      <Input
        placeholder={placeholder}
        onChange={handleChange}
        size={size}
        autoComplete="off"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
        // Performance optimizations - disable all browser features that might slow input
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        data-ms-editor="false"
      />
    </InputGroup>
  );
}

// Memoize component - won't re-render unless props actually change
export default memo(DebouncedSearchInput);
