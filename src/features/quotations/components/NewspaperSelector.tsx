'use client';

import {
  Box,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Badge,
  Divider,
  HStack,
  VStack,
  Heading,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { FaNewspaper, FaLanguage, FaBullseye } from 'react-icons/fa6';
import { CHENNAI_NEWSPAPERS, NEWSPAPER_CATEGORIES } from '../constants/mediums';

interface NewspaperSelectorProps {
  selectedNewspaper?: string;
  selectedLanguage?: 'english' | 'tamil';
  selectedCategory?: string;
  onNewspaperChange: (newspaper: string) => void;
  onLanguageChange?: (language: 'english' | 'tamil') => void;
  onCategoryChange?: (category: string) => void;
  showLanguageFilter?: boolean;
  showCategoryFilter?: boolean;
}

export const NewspaperSelector = ({
  selectedNewspaper,
  selectedLanguage = 'tamil',
  selectedCategory,
  onNewspaperChange,
  onLanguageChange,
  onCategoryChange,
  showLanguageFilter = true,
  showCategoryFilter = true,
}: NewspaperSelectorProps) => {
  const newspapers = selectedLanguage === 'english' 
    ? CHENNAI_NEWSPAPERS.english 
    : CHENNAI_NEWSPAPERS.tamil;

  return (
    <Stack spacing={4}>
      <Heading size="sm" display="flex" alignItems="center" gap={2}>
        <Icon as={FaNewspaper} color="blue.500" />
        Newspaper Selection
      </Heading>

      {/* Language Selection */}
      {showLanguageFilter && onLanguageChange && (
        <FormControl>
          <FormLabel display="flex" alignItems="center" gap={2}>
            <Icon as={FaLanguage} color="blue.500" />
            Language
          </FormLabel>
          <SimpleGrid columns={{ base: 2, md: 2 }} spacing={3}>
            <Card
              variant="outline"
              cursor="pointer"
              onClick={() => onLanguageChange('tamil')}
              borderWidth={selectedLanguage === 'tamil' ? '2px' : '1px'}
              borderColor={selectedLanguage === 'tamil' ? 'blue.500' : 'gray.200'}
              bg={selectedLanguage === 'tamil' ? 'blue.50' : 'white'}
              transition="all 0.2s"
              _hover={{ borderColor: 'blue.300' }}
            >
              <CardBody textAlign="center" py={3}>
                <Text fontWeight="semibold">Tamil Newspapers</Text>
                <Badge colorScheme="blue" mt={1}>
                  {CHENNAI_NEWSPAPERS.tamil.length} Papers
                </Badge>
              </CardBody>
            </Card>

            <Card
              variant="outline"
              cursor="pointer"
              onClick={() => onLanguageChange('english')}
              borderWidth={selectedLanguage === 'english' ? '2px' : '1px'}
              borderColor={selectedLanguage === 'english' ? 'blue.500' : 'gray.200'}
              bg={selectedLanguage === 'english' ? 'blue.50' : 'white'}
              transition="all 0.2s"
              _hover={{ borderColor: 'blue.300' }}
            >
              <CardBody textAlign="center" py={3}>
                <Text fontWeight="semibold">English Newspapers</Text>
                <Badge colorScheme="green" mt={1}>
                  {CHENNAI_NEWSPAPERS.english.length} Papers
                </Badge>
              </CardBody>
            </Card>
          </SimpleGrid>
        </FormControl>
      )}

      <Divider />

      {/* Newspaper Selection */}
      <FormControl isRequired>
        <FormLabel>Select Newspaper</FormLabel>
        <Select
          placeholder="Choose a newspaper"
          value={selectedNewspaper}
          onChange={(e) => onNewspaperChange(e.target.value)}
          size="lg"
        >
          {newspapers.map((paper) => (
            <option key={paper.name} value={paper.name}>
              {paper.name} - {paper.circulation} Circulation
            </option>
          ))}
        </Select>
      </FormControl>

      {/* Popular Chennai Newspapers Grid */}
      <Box>
        <Text fontSize="sm" color="gray.600" mb={3}>
          Quick Select Popular Papers:
        </Text>
        <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} spacing={2}>
          {newspapers.slice(0, 8).map((paper) => (
            <Tooltip key={paper.name} label={`${paper.type} - ${paper.circulation} Circulation`}>
              <Card
                variant="outline"
                cursor="pointer"
                size="sm"
                onClick={() => onNewspaperChange(paper.name)}
                borderColor={selectedNewspaper === paper.name ? 'blue.500' : 'gray.200'}
                bg={selectedNewspaper === paper.name ? 'blue.50' : 'white'}
                _hover={{ borderColor: 'blue.300' }}
                transition="all 0.2s"
              >
                <CardBody p={3}>
                  <VStack spacing={1} align="start">
                    <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
                      {paper.name}
                    </Text>
                    <Badge
                      size="sm"
                      colorScheme={
                        paper.circulation === 'Very High' ? 'green' :
                        paper.circulation === 'High' ? 'blue' : 'gray'
                      }
                    >
                      {paper.circulation}
                    </Badge>
                  </VStack>
                </CardBody>
              </Card>
            </Tooltip>
          ))}
        </SimpleGrid>
      </Box>

      {/* Category Selection */}
      {showCategoryFilter && onCategoryChange && (
        <>
          <Divider />
          <FormControl>
            <FormLabel display="flex" alignItems="center" gap={2}>
              <Icon as={FaBullseye} color="orange.500" />
              Advertisement Category (Optional)
            </FormLabel>
            <Select
              placeholder="Select category for targeted placement"
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
            >
              {Object.entries(NEWSPAPER_CATEGORIES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
            <Text fontSize="xs" color="gray.500" mt={2}>
              Choose a specific section to target your audience better (e.g., Sports, Business, Jobs)
            </Text>
          </FormControl>
        </>
      )}

      {/* Info Box */}
      {selectedNewspaper && (
        <Card bg="blue.50" variant="outline" borderColor="blue.200">
          <CardBody>
            <HStack spacing={3}>
              <Icon as={FaNewspaper} boxSize={6} color="blue.500" />
              <VStack align="start" spacing={0}>
                <Text fontWeight="semibold" color="blue.800">
                  {selectedNewspaper}
                </Text>
                <Text fontSize="sm" color="blue.600">
                  {newspapers.find(p => p.name === selectedNewspaper)?.circulation} circulation in Chennai
                  {selectedCategory && ` • ${NEWSPAPER_CATEGORIES[selectedCategory as keyof typeof NEWSPAPER_CATEGORIES]}`}
                </Text>
              </VStack>
            </HStack>
          </CardBody>
        </Card>
      )}
    </Stack>
  );
};
