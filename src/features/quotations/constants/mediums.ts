import { AdvertisementMedium, MediumOption } from '../types';
import { HOARDING_LOCATIONS, BUS_SHELTER_LOCATIONS, MTC_BUS_ROUTES, AUTO_ZONES, VAN_ROUTES } from './chennai-locations';

// Radio Channels in Chennai
export const RADIO_CHANNELS = [
  'Radio Mirchi 98.3 FM',
  'Suryan FM 93.5',
  'Big FM 92.7',
  'Radio City 91.1 FM',
  'Hello FM 106.4',
  'AIR FM Rainbow 101.4',
];

// TV Channels in Chennai/Tamil Nadu
export const TV_CHANNELS = [
  'Sun TV',
  'Vijay TV',
  'Zee Tamil',
  'Star Vijay',
  'Colors Tamil',
  'KTV',
  'Jaya TV',
  'Puthiya Thalaimurai',
  'News 7 Tamil',
  'Polimer TV',
];

// Newspapers in Chennai
export const NEWSPAPERS = [
  'The Hindu',
  'Dinamalar',
  'Dinakaran',
  'Daily Thanthi',
  'The Times of India',
  'Deccan Chronicle',
  'Dinamani',
  'The New Indian Express',
  'Tamil Murasu',
  'Malai Malar',
];

// Advertisement Medium Options with Pricing
export const ADVERTISEMENT_MEDIUMS: Record<AdvertisementMedium, MediumOption[]> = {
  bus: [
    {
      id: 'bus_full_wrap',
      name: 'Full Bus Wrap',
      description: 'Complete bus exterior wrapping - Maximum visibility',
      routes: MTC_BUS_ROUTES.map(r => `Route ${r.route} - ${r.name}`),
      priceRange: { min: 25000, max: 45000, unit: 'per bus per month' },
    },
    {
      id: 'bus_back_panel',
      name: 'Back Panel Advertisement',
      description: 'Rear panel of the bus - High visibility for following traffic',
      routes: MTC_BUS_ROUTES.map(r => `Route ${r.route} - ${r.name}`),
      priceRange: { min: 8000, max: 15000, unit: 'per bus per month' },
    },
    {
      id: 'bus_side_panel',
      name: 'Side Panel Advertisement',
      description: 'Both side panels of the bus',
      routes: MTC_BUS_ROUTES.map(r => `Route ${r.route} - ${r.name}`),
      priceRange: { min: 12000, max: 20000, unit: 'per bus per month' },
    },
    {
      id: 'bus_interior',
      name: 'Interior Advertisement',
      description: 'Inside bus panels - Captive audience',
      routes: MTC_BUS_ROUTES.map(r => `Route ${r.route} - ${r.name}`),
      priceRange: { min: 5000, max: 10000, unit: 'per bus per month' },
    },
  ],

  auto: [
    {
      id: 'auto_full_wrap',
      name: 'Auto Full Wrap',
      description: 'Complete auto rickshaw wrapping',
      locations: AUTO_ZONES,
      priceRange: { min: 3000, max: 6000, unit: 'per auto per month' },
    },
    {
      id: 'auto_back_panel',
      name: 'Auto Back Panel',
      description: 'Rear panel advertisement on auto',
      locations: AUTO_ZONES,
      priceRange: { min: 1500, max: 3000, unit: 'per auto per month' },
    },
    {
      id: 'auto_hood',
      name: 'Auto Hood Advertisement',
      description: 'Top hood panel - Visible from distance',
      locations: AUTO_ZONES,
      priceRange: { min: 2000, max: 4000, unit: 'per auto per month' },
    },
    {
      id: 'auto_combo',
      name: 'Auto Combo Pack',
      description: 'Hood + Back Panel combination',
      locations: AUTO_ZONES,
      priceRange: { min: 3000, max: 5500, unit: 'per auto per month' },
    },
  ],

  radio: [
    {
      id: 'radio_prime_time',
      name: 'Prime Time Slot (7-11 AM, 5-9 PM)',
      description: 'Peak listening hours - Maximum reach',
      channels: RADIO_CHANNELS,
      priceRange: { min: 2000, max: 5000, unit: 'per 10-second spot' },
    },
    {
      id: 'radio_regular',
      name: 'Regular Time Slot (11 AM - 5 PM)',
      description: 'Daytime slots - Good reach',
      channels: RADIO_CHANNELS,
      priceRange: { min: 1000, max: 2500, unit: 'per 10-second spot' },
    },
    {
      id: 'radio_sponsorship',
      name: 'Program Sponsorship',
      description: 'Sponsor a popular radio program',
      channels: RADIO_CHANNELS,
      priceRange: { min: 25000, max: 100000, unit: 'per week' },
    },
    {
      id: 'radio_rj_mention',
      name: 'RJ Live Mention',
      description: 'Radio Jockey mentions your brand live',
      channels: RADIO_CHANNELS,
      priceRange: { min: 5000, max: 15000, unit: 'per mention' },
    },
  ],

  tv: [
    {
      id: 'tv_prime_time',
      name: 'Prime Time Slot (7-11 PM)',
      description: 'Peak viewing hours - Maximum TRP',
      channels: TV_CHANNELS,
      priceRange: { min: 15000, max: 100000, unit: 'per 10-second spot' },
    },
    {
      id: 'tv_afternoon',
      name: 'Afternoon Slot (12-4 PM)',
      description: 'Daytime serials - Good reach for homemakers',
      channels: TV_CHANNELS,
      priceRange: { min: 5000, max: 25000, unit: 'per 10-second spot' },
    },
    {
      id: 'tv_morning',
      name: 'Morning Slot (6-10 AM)',
      description: 'Morning shows and news',
      channels: TV_CHANNELS,
      priceRange: { min: 3000, max: 15000, unit: 'per 10-second spot' },
    },
    {
      id: 'tv_sponsorship',
      name: 'Program Sponsorship',
      description: 'Sponsor popular TV shows/serials',
      channels: TV_CHANNELS,
      priceRange: { min: 200000, max: 2000000, unit: 'per week' },
    },
    {
      id: 'tv_ticker',
      name: 'Scrolling Ticker Advertisement',
      description: 'Bottom screen scrolling text',
      channels: TV_CHANNELS,
      priceRange: { min: 2000, max: 10000, unit: 'per hour' },
    },
  ],

  newspaper: [
    {
      id: 'news_full_page',
      name: 'Full Page Advertisement',
      description: 'Full page color advertisement',
      papers: NEWSPAPERS,
      priceRange: { min: 100000, max: 500000, unit: 'per day' },
    },
    {
      id: 'news_half_page',
      name: 'Half Page Advertisement',
      description: 'Half page color advertisement',
      papers: NEWSPAPERS,
      priceRange: { min: 50000, max: 250000, unit: 'per day' },
    },
    {
      id: 'news_quarter_page',
      name: 'Quarter Page Advertisement',
      description: 'Quarter page advertisement',
      papers: NEWSPAPERS,
      priceRange: { min: 25000, max: 125000, unit: 'per day' },
    },
    {
      id: 'news_classified_display',
      name: 'Classified Display',
      description: 'Enhanced classified with borders/images',
      papers: NEWSPAPERS,
      priceRange: { min: 5000, max: 25000, unit: 'per day' },
    },
    {
      id: 'news_front_page_strip',
      name: 'Front Page Strip',
      description: 'Premium strip on front page - Ear panel',
      papers: NEWSPAPERS,
      priceRange: { min: 50000, max: 200000, unit: 'per day' },
    },
    {
      id: 'news_jacket',
      name: 'Newspaper Jacket',
      description: 'Wrap-around cover sheet - Maximum impact',
      papers: NEWSPAPERS,
      priceRange: { min: 150000, max: 600000, unit: 'per day' },
    },
  ],

  van_branding: [
    {
      id: 'van_full_brand',
      name: 'Full Van Branding',
      description: 'Complete van wrapping with LED display option',
      locations: VAN_ROUTES,
      priceRange: { min: 15000, max: 35000, unit: 'per van per month' },
    },
    {
      id: 'van_with_audio',
      name: 'Van with Audio Announcement',
      description: 'Branded van with audio announcement system',
      locations: VAN_ROUTES,
      priceRange: { min: 20000, max: 40000, unit: 'per van per month' },
    },
    {
      id: 'van_led_display',
      name: 'LED Display Van',
      description: 'Van with digital LED screen - Dynamic content',
      locations: VAN_ROUTES,
      priceRange: { min: 30000, max: 60000, unit: 'per van per month' },
    },
  ],

  bus_shelter: [
    {
      id: 'shelter_standard',
      name: 'Standard Bus Shelter Panel',
      description: 'Single panel at bus shelter - 6ft x 4ft',
      locations: BUS_SHELTER_LOCATIONS,
      priceRange: { min: 8000, max: 25000, unit: 'per shelter per month' },
    },
    {
      id: 'shelter_premium',
      name: 'Premium Location Bus Shelter',
      description: 'High-traffic premium location shelters',
      locations: BUS_SHELTER_LOCATIONS.filter(l => l.premium),
      priceRange: { min: 20000, max: 50000, unit: 'per shelter per month' },
    },
    {
      id: 'shelter_backlit',
      name: 'Backlit Bus Shelter',
      description: 'Illuminated shelter panel - 24/7 visibility',
      locations: BUS_SHELTER_LOCATIONS,
      priceRange: { min: 15000, max: 40000, unit: 'per shelter per month' },
    },
  ],

  hoarding: [
    {
      id: 'hoarding_standard',
      name: 'Standard Hoarding (20x10 ft)',
      description: 'Standard size billboard - Non-lit',
      locations: HOARDING_LOCATIONS,
      priceRange: { min: 15000, max: 50000, unit: 'per hoarding per month' },
    },
    {
      id: 'hoarding_large',
      name: 'Large Hoarding (40x20 ft)',
      description: 'Large format billboard - High visibility',
      locations: HOARDING_LOCATIONS,
      priceRange: { min: 30000, max: 100000, unit: 'per hoarding per month' },
    },
    {
      id: 'hoarding_backlit',
      name: 'Backlit Hoarding',
      description: 'Illuminated billboard - Day & night visibility',
      locations: HOARDING_LOCATIONS,
      priceRange: { min: 40000, max: 150000, unit: 'per hoarding per month' },
    },
    {
      id: 'hoarding_digital',
      name: 'Digital LED Hoarding',
      description: 'Digital billboard with dynamic content',
      locations: HOARDING_LOCATIONS.filter(l => l.premium),
      priceRange: { min: 100000, max: 500000, unit: 'per hoarding per month' },
    },
    {
      id: 'hoarding_premium',
      name: 'Premium Location Hoarding',
      description: 'Prime locations - T.Nagar, Anna Salai, OMR',
      locations: HOARDING_LOCATIONS.filter(l => l.premium),
      priceRange: { min: 60000, max: 200000, unit: 'per hoarding per month' },
    },
  ],
};

// Helper function to get medium options
export const getMediumOptions = (medium: AdvertisementMedium): MediumOption[] => {
  return ADVERTISEMENT_MEDIUMS[medium] || [];
};

// Helper function to get medium display name
export const getMediumDisplayName = (medium: AdvertisementMedium): string => {
  const names: Record<AdvertisementMedium, string> = {
    bus: 'Bus Advertisement',
    auto: 'Auto Rickshaw Advertisement',
    radio: 'Radio Advertisement',
    tv: 'TV Advertisement',
    newspaper: 'Newspaper Advertisement',
    van_branding: 'Van Branding',
    bus_shelter: 'Bus Shelter Advertisement',
    hoarding: 'Hoarding / Billboard',
  };
  return names[medium];
};
