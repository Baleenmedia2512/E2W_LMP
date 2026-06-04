'use client';

import React, { useState, useEffect } from 'react';
import { Text } from '@chakra-ui/react';

interface OtpTimerProps {
  initialSeconds: number;
  onComplete?: () => void;
}

export function OtpTimer({ initialSeconds, onComplete }: OtpTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      if (onComplete) {
        onComplete();
      }
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onComplete]);

  const formatTime = (secs: number): string => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <Text
      fontSize="sm"
      color={seconds <= 10 ? 'red.500' : 'gray.600'}
      fontWeight={seconds <= 10 ? 'semibold' : 'normal'}
      fontFamily="mono"
      transition="color 0.3s"
    >
      {formatTime(seconds)}
    </Text>
  );
}
