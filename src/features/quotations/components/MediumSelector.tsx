'use client';

import {
  Box,
  SimpleGrid,
  Card,
  CardBody,
  Heading,
  Text,
  Icon,
  useRadioGroup,
  useRadio,
  UseRadioProps,
} from '@chakra-ui/react';
import { FaBus, FaTaxi, FaRadio, FaTv, FaNewspaper, FaTruck, FaBullhorn, FaRectangleAd } from 'react-icons/fa6';
import { AdvertisementMedium } from '../types';
import { getMediumDisplayName } from '../constants/mediums';

const mediumIcons: Record<AdvertisementMedium, any> = {
  bus: FaBus,
  auto: FaTaxi,
  radio: FaRadio,
  tv: FaTv,
  newspaper: FaNewspaper,
  van_branding: FaTruck,
  bus_shelter: FaBullhorn,
  hoarding: FaRectangleAd,
};

interface MediumCardProps extends UseRadioProps {
  medium: AdvertisementMedium;
}

const MediumCard = ({ medium, ...radioProps }: MediumCardProps) => {
  const { getInputProps, getRadioProps } = useRadio(radioProps);
  const input = getInputProps();
  const checkbox = getRadioProps();

  return (
    <Box as="label" cursor="pointer">
      <input {...input} />
      <Card
        {...checkbox}
        variant="outline"
        _checked={{
          bg: 'blue.50',
          borderColor: 'blue.500',
          borderWidth: '2px',
        }}
        _hover={{
          borderColor: 'blue.300',
        }}
        transition="all 0.2s"
      >
        <CardBody textAlign="center" py={6}>
          <Icon
            as={mediumIcons[medium]}
            boxSize={12}
            color="blue.500"
            mb={3}
          />
          <Text fontWeight="semibold" fontSize="sm">
            {getMediumDisplayName(medium)}
          </Text>
        </CardBody>
      </Card>
    </Box>
  );
};

interface MediumSelectorProps {
  value?: AdvertisementMedium;
  onChange: (value: AdvertisementMedium) => void;
}

export const MediumSelector = ({ value, onChange }: MediumSelectorProps) => {
  const mediums: AdvertisementMedium[] = [
    'bus',
    'auto',
    'radio',
    'tv',
    'newspaper',
    'van_branding',
    'bus_shelter',
    'hoarding',
  ];

  const { getRootProps, getRadioProps } = useRadioGroup({
    name: 'advertisementMedium',
    value,
    onChange: (val) => onChange(val as AdvertisementMedium),
  });

  const group = getRootProps();

  return (
    <Box>
      <Heading size="sm" mb={4}>
        Select Advertisement Medium
      </Heading>
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} {...group}>
        {mediums.map((medium) => {
          const radio = getRadioProps({ value: medium });
          return <MediumCard key={medium} medium={medium} {...radio} />;
        })}
      </SimpleGrid>
    </Box>
  );
};
