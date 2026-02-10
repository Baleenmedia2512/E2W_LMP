import { Box, IconButton, Text, HStack, Spinner, Tooltip } from '@chakra-ui/react';
import { FaPlay, FaPause, FaDownload, FaExclamationTriangle } from 'react-icons/fa';
import { useState, useRef, useEffect } from 'react';

interface CallRecordingPlayerProps {
  recordingUrl?: string | null;
  recordingStatus?: string | null;
  callDuration?: number | null;
}

/**
 * Audio player component for call recordings from Call Monitor app.
 * Shows play/pause controls and download option when recording is available.
 */
export default function CallRecordingPlayer({
  recordingUrl,
  recordingStatus = 'pending',
  callDuration,
}: CallRecordingPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (recordingUrl && !audioRef.current) {
      audioRef.current = new Audio(recordingUrl);
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
        setHasError(false);
      });

      audioRef.current.addEventListener('timeupdate', () => {
        setCurrentTime(audioRef.current?.currentTime || 0);
      });

      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false);
        setCurrentTime(0);
      });

      audioRef.current.addEventListener('loadstart', () => {
        setIsLoading(true);
      });

      audioRef.current.addEventListener('canplay', () => {
        setIsLoading(false);
        setHasError(false);
      });

      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio loading error:', e);
        setIsLoading(false);
        setHasError(true);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [recordingUrl]);

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
      setHasError(false);
    } catch (error) {
      console.error('Playback error:', error);
      setHasError(true);
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    if (!recordingUrl) return;
    
    // Open in new tab - let browser handle download
    window.open(recordingUrl, '_blank');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Show different states based on recording availability
  if (!recordingUrl || recordingStatus === 'no_recording') {
    return (
      <Text fontSize="sm" color="gray.500">
        No recording
      </Text>
    );
  }

  if (recordingStatus === 'pending') {
    return (
      <HStack spacing={2}>
        <Spinner size="xs" color="blue.500" />
        <Text fontSize="sm" color="gray.500">
          Recording pending...
        </Text>
      </HStack>
    );
  }

  // Show error state if file couldn't be loaded
  if (hasError) {
    return (
      <Tooltip 
        label="Recording file not found or inaccessible. The Supabase storage bucket may not be configured. Check FIX_RECORDING_PLAYBACK.md for setup instructions."
        placement="top"
        hasArrow
      >
        <HStack spacing={2} color="orange.500">
          <FaExclamationTriangle />
          <Text fontSize="xs">Recording unavailable</Text>
          <IconButton
            aria-label="Open recording URL"
            icon={<FaDownload />}
            size="xs"
            variant="ghost"
            colorScheme="orange"
            onClick={handleDownload}
          />
        </HStack>
      </Tooltip>
    );
  }

  // Recording is available
  return (
    <Box>
      <HStack spacing={3}>
        <IconButton
          aria-label={isPlaying ? 'Pause' : 'Play'}
          icon={isLoading ? <Spinner size="xs" /> : isPlaying ? <FaPause /> : <FaPlay />}
          size="sm"
          colorScheme="blue"
          variant="ghost"
          onClick={togglePlayPause}
          isDisabled={isLoading}
        />
        
        <Box flex="1" minW="120px">
          <HStack spacing={2}>
            <Text fontSize="xs" color="gray.600">
              {formatTime(currentTime)}
            </Text>
            <Box flex="1" h="2px" bg="gray.200" borderRadius="full" position="relative">
              <Box
                h="100%"
                bg="blue.500"
                borderRadius="full"
                w={`${duration > 0 ? (currentTime / duration) * 100 : 0}%`}
                transition="width 0.1s"
              />
            </Box>
            <Text fontSize="xs" color="gray.600">
              {formatTime(duration || callDuration || 0)}
            </Text>
          </HStack>
        </Box>

        <Tooltip label="Open recording in new tab" placement="top">
          <IconButton
            aria-label="Download recording"
            icon={<FaDownload />}
            size="sm"
            colorScheme="gray"
            variant="ghost"
            onClick={handleDownload}
          />
        </Tooltip>
      </HStack>
    </Box>
  );
}
