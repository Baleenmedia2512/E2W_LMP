'use client';

import { Box, Image as ChakraImage, Skeleton, ImageProps as ChakraImageProps } from '@chakra-ui/react';
import { useState, useEffect } from 'react';

interface ResponsiveImageProps extends Omit<ChakraImageProps, 'src'> {
  src: string;
  alt: string;
  fallback?: string;
  lazy?: boolean;
  aspectRatio?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

/**
 * Responsive image component with lazy loading and performance optimizations
 * Implements US-25 requirement: Images scale properly with device size
 */
export default function ResponsiveImage({
  src,
  alt,
  fallback = '/images/placeholder.png',
  lazy = true,
  aspectRatio,
  objectFit = 'cover',
  ...props
}: ResponsiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState(lazy ? '' : src);

  useEffect(() => {
    if (lazy && typeof window !== 'undefined') {
      // Use IntersectionObserver for lazy loading
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setImageSrc(src);
              observer.disconnect();
            }
          });
        },
        {
          rootMargin: '50px', // Start loading 50px before image enters viewport
        }
      );

      const element = document.getElementById(`img-${src}`);
      if (element) {
        observer.observe(element);
      }

      return () => observer.disconnect();
    }
  }, [src, lazy]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <Box
      position="relative"
      width="100%"
      paddingBottom={aspectRatio ? `${(1 / aspectRatio) * 100}%` : undefined}
      overflow="hidden"
      id={`img-${src}`}
    >
      {!isLoaded && (
        <Skeleton
          position={aspectRatio ? 'absolute' : 'relative'}
          top={0}
          left={0}
          width="100%"
          height={aspectRatio ? '100%' : '200px'}
        />
      )}
      <ChakraImage
        src={hasError ? fallback : imageSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        objectFit={objectFit}
        position={aspectRatio ? 'absolute' : 'relative'}
        top={0}
        left={0}
        width="100%"
        height={aspectRatio ? '100%' : 'auto'}
        opacity={isLoaded ? 1 : 0}
        transition="opacity 0.3s ease-in-out"
        loading={lazy ? 'lazy' : 'eager'}
        {...props}
      />
    </Box>
  );
}
