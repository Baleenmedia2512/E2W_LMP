import { Box, IconButton, Text, HStack, Spinner } from '@chakra-ui/react';
import { FaPlay, FaPause, FaDownload } from 'react-icons/fa';
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (recordingUrl && !audioRef.current) {
      audioRef.current = new Audio(recordingUrl);
      
      audioRef.current.addEventListener('loadedmetadata', () => {
        setDuration(audioRef.current?.duration || 0);
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
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [recordingUrl]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDownload = () => {
    if (!recordingUrl) return;
    
    const link = document.createElement('a');
    link.href = recordingUrl;
    link.download = `call-recording-${Date.now()}.m4a`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

        <IconButton
          aria-label="Download recording"
          icon={<FaDownload />}
          size="sm"
          colorScheme="gray"
          variant="ghost"
          onClick={handleDownload}
        />
      </HStack>
    </Box>
  );
}
