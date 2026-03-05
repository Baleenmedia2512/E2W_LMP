'use client';

import {
  Box,
  FormControl,
  FormLabel,
  Select,
  SimpleGrid,
  Tag,
  Text,
} from '@chakra-ui/react';
import { AdvertisementMedium, Location } from '../types';
import { getLocationsByZone, CHENNAI_ZONES } from '../constants/chennai-locations';
import { useState } from 'react';

interface LocationSelectorProps {
  medium: AdvertisementMedium;
  value?: string;
  onChange: (locationId: string, locationName: string) => void;
  label?: string;
}

export const LocationSelector = ({ medium, value, onChange, label = 'Select Location' }: LocationSelectorProps) => {
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);

  // Determine location type based on medium
  const getLocationType = (): 'hoarding' | 'bus_shelter' | 'auto' | 'van' | null => {
    switch (medium) {
      case 'hoarding':
        return 'hoarding';
      case 'bus_shelter':
        return 'bus_shelter';
      case 'auto':
        return 'auto';
      case 'van_branding':
        return 'van';
      default:
        return null;
    }
  };

  const locationType = getLocationType();

  const handleZoneChange = (zone: string) => {
    setSelectedZone(zone);
    if (locationType && zone) {
      const zoneLocations = getLocationsByZone(zone as any, locationType);
      setLocations(zoneLocations);
    } else {
      setLocations([]);
    }
  };

  const handleLocationChange = (locationId: string) => {
    const location = locations.find(loc => loc.id === locationId);
    if (location) {
      onChange(locationId, location.name);
    }
  };

  // Don't show selector for mediums that don't need location
  if (!locationType) {
    return null;
  }

  return (
    <Box>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl>
          <FormLabel>Zone</FormLabel>
          <Select
            placeholder="Select Chennai Zone"
            value={selectedZone}
            onChange={(e) => handleZoneChange(e.target.value)}
          >
            {CHENNAI_ZONES.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </Select>
        </FormControl>

        <FormControl isDisabled={!selectedZone}>
          <FormLabel>{label}</FormLabel>
          <Select
            placeholder={selectedZone ? 'Select Location' : 'Select zone first'}
            value={value}
            onChange={(e) => handleLocationChange(e.target.value)}
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
                {location.premium && ' ⭐'}
                {location.landmark && ` - ${location.landmark}`}
              </option>
            ))}
          </Select>
        </FormControl>
      </SimpleGrid>

      {selectedZone && locations.length > 0 && (
        <Box mt={2}>
          <Text fontSize="xs" color="gray.600" mb={1}>
            Available locations in {selectedZone}:
          </Text>
          <Box display="flex" flexWrap="wrap" gap={2}>
            {locations.map((loc) => (
              <Tag
                key={loc.id}
                size="sm"
                colorScheme={loc.premium ? 'orange' : 'gray'}
                cursor="pointer"
                onClick={() => handleLocationChange(loc.id)}
                variant={value === loc.id ? 'solid' : 'subtle'}
              >
                {loc.name}
              </Tag>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};
