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
  useBreakpointValue,
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
  
  // Responsive font sizes
  const numberFontSize = useBreakpointValue({ base: '3xl', sm: '3xl', md: '4xl' });
  const totalFontSize = useBreakpointValue({ base: 'xl', sm: 'xl', md: '2xl' });
  const labelFontSize = useBreakpointValue({ base: 'xs', sm: 'sm' });
  const iconSize = useBreakpointValue({ base: 5, sm: 5, md: 6 });
  const cardPadding = useBreakpointValue({ base: 4, sm: 4, md: 5 });

  return (
    <Box
      as="button"
      onClick={() => onClick(type)}
      w="full"
      textAlign="left"
      transition="all 0.3s ease"
      _hover={{
        transform: { base: 'scale(1.02)', md: 'translateY(-4px)' },
        boxShadow: { base: 'lg', md: '0 10px 25px rgba(0, 0, 0, 0.15)' },
      }}
      _active={{
        transform: { base: 'scale(0.98)', md: 'translateY(-2px)' },
      }}
      cursor="pointer"
    >
      <Card
        boxShadow={isActive ? 'xl' : 'md'}
        borderTop={{ base: '3px solid', md: '4px solid' }}
        borderColor={borderColor}
        bg={isActive ? `${borderColor}10` : 'white'}
        transition="all 0.3s ease"
        _hover={{
          boxShadow: '2xl',
          borderTopWidth: { base: '4px', md: '6px' },
        }}
        height="full"
        minH={{ base: '120px', sm: '140px' }}
      >
        <CardBody p={cardPadding}>
          <Stat>
            <StatLabel mb={{ base: 1, md: 2 }}>
              <HStack spacing={2} align="center" flexWrap="wrap">
                {icon && (
                  <Icon
                    as={icon}
                    boxSize={iconSize}
                    color={borderColor}
                    flexShrink={0}
                  />
                )}
                <Text
                  fontSize={labelFontSize}
                  fontWeight="600"
                  color="gray.600"
                  textTransform="uppercase"
                  letterSpacing="wide"
                  lineHeight="short"
                  flex="1"
                >
                  {label}
                </Text>
              </HStack>
            </StatLabel>

            <HStack align="baseline" spacing={{ base: 1, md: 2 }} mt={{ base: 2, md: 3 }} flexWrap="wrap">
              <StatNumber
                fontSize={numberFontSize}
                fontWeight="bold"
                color={borderColor}
                lineHeight="1"
              >
                {value}
              </StatNumber>
              {total !== undefined && (
                <Text fontSize={totalFontSize} color="gray.400" fontWeight="medium">
                  / {total}
                </Text>
              )}
            </HStack>

            {helpText && (
              <StatHelpText mt={{ base: 1, md: 2 }} fontSize={{ base: 'xs', md: 'sm' }} color="gray.500" lineHeight="short">
                {helpText}
              </StatHelpText>
            )}
          </Stat>
        </CardBody>
      </Card>
    </Box>
  );
}




