import {
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Box,
  Icon,
  HStack,
  Text,
} from '@chakra-ui/react';
import { IconType } from 'react-icons';

interface DSRCardProps {
  label: string;
  value: number | string;
  total?: number;
  helpText?: string;
  icon?: IconType;
  colorScheme: string;
  type: string;
  onClick: (type: string) => void;
  isActive?: boolean;
}

export default function DSRCard({
  label,
  value,
  total,
  helpText,
  icon,
  colorScheme,
  type,
  onClick,
  isActive = false,
}: DSRCardProps) {
  // Custom color palette
  const colors = {
    primary: '#9c5342',
    dark: '#0b1316',
    light: '#b4a097',
    medium: '#7a5f58',
    accent: '#8c9b96',
  };

  const getColorByScheme = (scheme: string) => {
    switch (scheme) {
      case 'primary':
        return colors.primary;
      case 'dark':
        return colors.dark;
      case 'light':
        return colors.light;
      case 'medium':
        return colors.medium;
      case 'accent':
        return colors.accent;
      default:
        return colors.primary;
    }
  };

  const borderColor = getColorByScheme(colorScheme);

  return (
    <Box
      as="button"
      onClick={() => onClick(type)}
      w="full"
      textAlign="left"
      transition="all 0.3s ease"
      _hover={{
        transform: 'translateY(-4px)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
      }}
      _active={{
        transform: 'translateY(-2px)',
      }}
      cursor="pointer"
    >
      <Card
        boxShadow={isActive ? 'xl' : 'md'}
        borderTop="4px solid"
        borderColor={borderColor}
        bg={isActive ? `${borderColor}10` : 'white'}
        transition="all 0.3s ease"
        _hover={{
          boxShadow: '2xl',
          borderTopWidth: '6px',
        }}
        height="full"
      >
        <CardBody>
          <Stat>
            <StatLabel mb={2}>
              <HStack spacing={2} align="center">
                {icon && (
                  <Icon
                    as={icon}
                    boxSize={5}
                    color={borderColor}
                  />
                )}
                <Text
                  fontSize="sm"
                  fontWeight="600"
                  color="gray.600"
                  textTransform="uppercase"
                  letterSpacing="wide"
                >
                  {label}
                </Text>
              </HStack>
            </StatLabel>

            <HStack align="baseline" spacing={2} mt={3}>
              <StatNumber
                fontSize="4xl"
                fontWeight="bold"
                color={borderColor}
                lineHeight="1"
              >
                {value}
              </StatNumber>
              {total !== undefined && (
                <Text fontSize="2xl" color="gray.400" fontWeight="medium">
                  / {total}
                </Text>
              )}
            </HStack>

            {helpText && (
              <StatHelpText mt={2} fontSize="sm" color="gray.500">
                {helpText}
              </StatHelpText>
            )}
          </Stat>
        </CardBody>
      </Card>
    </Box>
  );
}
