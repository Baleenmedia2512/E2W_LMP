'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseUnsavedChangesOptions {
  onBeforeUnload?: () => boolean;
  message?: string;
}

export function useUnsavedChanges(
  hasUnsavedChanges: boolean,
  options: UseUnsavedChangesOptions = {}
) {
  const {
    message = 'You have unsaved changes. Are you sure you want to leave?',
  } = options;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges, message]);

  return { hasUnsavedChanges };
}

interface FormState<T> {
  initialValues: T;
  currentValues: T;
  isDirty: boolean;
  hasChanges: boolean;
}

export function useFormDirtyState<T extends Record<string, any>>(
  initialValues: T
): FormState<T> & {
  updateValues: (values: Partial<T>) => void;
  reset: () => void;
  markAsPristine: () => void;
} {
  const [currentValues, setCurrentValues] = useState<T>(initialValues);
  const [savedValues, setSavedValues] = useState<T>(initialValues);

  const isDirty = JSON.stringify(currentValues) !== JSON.stringify(savedValues);
  const hasChanges = JSON.stringify(currentValues) !== JSON.stringify(initialValues);

  const updateValues = useCallback((values: Partial<T>) => {
    setCurrentValues((prev) => ({ ...prev, ...values }));
  }, []);

  const reset = useCallback(() => {
    setCurrentValues(initialValues);
    setSavedValues(initialValues);
  }, [initialValues]);

  const markAsPristine = useCallback(() => {
    setSavedValues(currentValues);
  }, [currentValues]);

  return {
    initialValues,
    currentValues,
    isDirty,
    hasChanges,
    updateValues,
    reset,
    markAsPristine,
  };
}
