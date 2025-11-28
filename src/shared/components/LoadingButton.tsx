'use client';

import { Button, ButtonProps } from '@chakra-ui/react';
import { ReactNode } from 'react';

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

export default function LoadingButton({
  isLoading = false,
  loadingText,
  children,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      isLoading={isLoading}
      loadingText={loadingText}
      spinner={<></>}
      _loading={{
        opacity: 0.6,
        cursor: 'not-allowed',
      }}
      {...props}
    >
      {children}
    </Button>
  );
}




