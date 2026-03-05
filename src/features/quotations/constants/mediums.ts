import { AdvertisementMedium, MediumOption, AdDimensions } from '../types';
import { HOARDING_LOCATIONS, BUS_SHELTER_LOCATIONS, MTC_BUS_ROUTES, AUTO_ZONES, VAN_ROUTES } from './chennai-locations';

// Standard Newspaper Ad Dimensions (in cm)
export const NEWSPAPER_AD_DIMENSIONS = {
  fullPage: { width: 25, height: 38, unit: 'cm', displayText: '25cm × 38cm (Full Page)' } as AdDimensions,
  halfPageVertical: { width: 25, height: 19, unit: 'cm', displayText: '25cm × 19cm (Half Page Horizontal)' } as AdDimensions,
  halfPageHorizontal: { width: 12.5, height: 38, unit: 'cm', displayText: '12.5cm × 38cm (Half Page Vertical)' } as AdDimensions,
  quarterPage: { width: 12.5, height: 19, unit: 'cm', displayText: '12.5cm × 19cm (Quarter Page)' } as AdDimensions,
  eighthPage: { width: 12.5, height: 9.5, unit: 'cm', displayText: '12.5cm × 9.5cm (1/8 Page)' } as AdDimensions,
  stripHorizontal: { width: 25, height: 5, unit: 'cm', displayText: '25cm × 5cm (Horizontal Strip)' } as AdDimensions,
  stripVertical: { width: 5, height: 38, unit: 'cm', displayText: '5cm × 38cm (Vertical Strip)' } as AdDimensions,
  earPanel: { width: 5, height: 8, unit: 'cm', displayText: '5cm × 8cm (Ear Panel)' } as AdDimensions,
  classifiedDisplay: { width: 8, height: 12, unit: 'cm', displayText: '8cm × 12cm (Classified Display)' } as AdDimensions,
};

// Calculate area in sq cm
export const calculateAdArea = (dimensions: AdDimensions): number => {
  return dimensions.width * dimensions.height;
};

// Format dimensions for display
export const formatDimensions = (dimensions: AdDimensions): string => {
  return dimensions.displayText || `${dimensions.width}${dimensions.unit} × ${dimensions.height}${dimensions.unit}`;
};

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

// Newspapers in Chennai - Comprehensive List
export const CHENNAI_NEWSPAPERS = {
  english: [
    { name: 'The Hindu', circulation: 'High', type: 'Daily' },
    { name: 'The Times of India', circulation: 'High', type: 'Daily' },
    { name: 'The New Indian Express', circulation: 'Medium', type: 'Daily' },
    { name: 'Deccan Chronicle', circulation: 'Medium', type: 'Daily' },
    { name: 'The Hindu Business Line', circulation: 'Medium', type: 'Business Daily' },
  ],
  tamil: [
    { name: 'Dinamalar', circulation: 'Very High', type: 'Daily' },
    { name: 'Dinakaran', circulation: 'Very High', type: 'Daily' },
    { name: 'Daily Thanthi', circulation: 'Very High', type: 'Daily' },
    { name: 'Dinamani', circulation: 'High', type: 'Daily' },
    { name: 'Tamil Murasu', circulation: 'Medium', type: 'Daily' },
    { name: 'Malai Malar', circulation: 'High', type: 'Daily' },
    { name: 'Dinathanthi', circulation: 'Very High', type: 'Daily' },
    { name: 'Maalai Malar', circulation: 'Medium', type: 'Evening Daily' },
  ],
};

// Legacy export for backward compatibility
export const NEWSPAPERS = [
  ...CHENNAI_NEWSPAPERS.english.map(n => n.name),
  ...CHENNAI_NEWSPAPERS.tamil.map(n => n.name),
];

// Newspaper Ad Categories
export const NEWSPAPER_CATEGORIES = {
  frontPage: 'Front Page',
  sports: 'Sports Section',
  political: 'Political/News Section',
  business: 'Business Section',
  entertainment: 'Entertainment Section',
  classified: 'Classified Section',
  matrimonial: 'Matrimonial Section',
  jobVacancy: 'Job Vacancy/Recruitment',
  realEstate: 'Real Estate Section',
  education: 'Education Section',
  general: 'General/Inside Pages',
};

// Advertisement Medium Options with Pricing
export const ADVERTISEMENT_MEDIUMS: Record<AdvertisementMedium, MediumOption[]> = {
  bus: [
    {
      id: 'bus_full_wrap',
      name: 'Full Bus Wrap',
      description: 'Complete bus exterior wrapping - Maximum visibility',
      routes: MTC_BUS_ROUTES.map(r => `Route ${r.route} - ${r.name}`),
      specifications: {
        size: 'Full Bus (40ft × 10ft approx)',
        area: 400,
        position: 'Complete Exterior',
      },
      priceRange: { min: 25000, max: 45000, unit: 'per bus per month' },
    },
    {
      id: 'bus_back_panel',
      name: 'Back Panel Advertisement',
      description: 'Rear panel of the bus - High visibility for following traffic',
      routes: MTC_BUS_ROUTES.map(r => `Route ${r.route} - ${r.name}`),
      specifications: {
        size: '8ft × 6ft',
        area: 48,
        position: 'Back Panel',
      },
      priceRange: { min: 8000, max: 15000, unit: 'per bus per month' },
    },
    {
      id: 'bus_side_panel',
      name: 'Side Panel Advertisement',
      description: 'Both side panels of the bus',
      routes: MTC_BUS_ROUTES.map(r => `Route ${r.route} - ${r.name}`),
      specifications: {
        size: '20ft × 6ft (both sides)',
        area: 120,
        position: 'Side Panels',
      },
      priceRange: { min: 12000, max: 20000, unit: 'per bus per month' },
    },
    {
      id: 'bus_interior',
      name: 'Interior Advertisement',
      description: 'Inside bus panels - Captive audience',
      routes: MTC_BUS_ROUTES.map(r => `Route ${r.route} - ${r.name}`),
      specifications: {
        size: '12 inch × 18 inch per panel',
        position: 'Interior Panels',
      },
      priceRange: { min: 5000, max: 10000, unit: 'per bus per month' },
    },
  ],

  auto: [
    {
      id: 'auto_full_wrap',
      name: 'Auto Full Wrap',
      description: 'Complete auto rickshaw wrapping',
      locations: AUTO_ZONES,
      specifications: {
        size: 'Full Auto (10ft × 5ft approx)',
        area: 50,
        position: 'Complete Exterior',
      },
      priceRange: { min: 3000, max: 6000, unit: 'per auto per month' },
    },
    {
      id: 'auto_back_panel',
      name: 'Auto Back Panel',
      description: 'Rear panel advertisement on auto',
      locations: AUTO_ZONES,
      specifications: {
        size: '3ft × 2ft',
        area: 6,
        position: 'Back Panel',
      },
      priceRange: { min: 1500, max: 3000, unit: 'per auto per month' },
    },
    {
      id: 'auto_hood',
      name: 'Auto Hood Advertisement',
      description: 'Top hood panel - Visible from distance',
      locations: AUTO_ZONES,
      specifications: {
        size: '4ft × 3ft',
        area: 12,
        position: 'Hood Top',
      },
      priceRange: { min: 2000, max: 4000, unit: 'per auto per month' },
    },
    {
      id: 'auto_combo',
      name: 'Auto Combo Pack',
      description: 'Hood + Back Panel combination',
      locations: AUTO_ZONES,
      specifications: {
        size: 'Hood + Back (7ft × 5ft total)',
        area: 18,
        position: 'Hood + Back Panel',
      },
      priceRange: { min: 3000, max: 5500, unit: 'per auto per month' },
    },
  ],

  radio: [
    {
      id: 'radio_prime_time',
      name: 'Prime Time Slot (7-11 AM, 5-9 PM)',
      description: 'Peak listening hours - Maximum reach',
      channels: RADIO_CHANNELS,
      specifications: {
        duration: '10 seconds',
        size: '10-sec spot',
      },
      priceRange: { min: 2000, max: 5000, unit: 'per 10-second spot' },
    },
    {
      id: 'radio_regular',
      name: 'Regular Time Slot (11 AM - 5 PM)',
      description: 'Daytime slots - Good reach',
      channels: RADIO_CHANNELS,
      specifications: {
        duration: '10 seconds',
        size: '10-sec spot',
      },
      priceRange: { min: 1000, max: 2500, unit: 'per 10-second spot' },
    },
    {
      id: 'radio_sponsorship',
      name: 'Program Sponsorship',
      description: 'Sponsor a popular radio program',
      channels: RADIO_CHANNELS,
      specifications: {
        duration: '1 week',
        size: 'Multiple mentions/week',
      },
      priceRange: { min: 25000, max: 100000, unit: 'per week' },
    },
    {
      id: 'radio_rj_mention',
      name: 'RJ Live Mention',
      description: 'Radio Jockey mentions your brand live',
      channels: RADIO_CHANNELS,
      specifications: {
        duration: '30-60 seconds',
        size: 'Live mention',
      },
      priceRange: { min: 5000, max: 15000, unit: 'per mention' },
    },
  ],

  tv: [
    {
      id: 'tv_prime_time',
      name: 'Prime Time Slot (7-11 PM)',
      description: 'Peak viewing hours - Maximum TRP',
      channels: TV_CHANNELS,
      specifications: {
        duration: '10 seconds',
        size: '10-sec commercial',
      },
      priceRange: { min: 15000, max: 100000, unit: 'per 10-second spot' },
    },
    {
      id: 'tv_afternoon',
      name: 'Afternoon Slot (12-4 PM)',
      description: 'Daytime serials - Good reach for homemakers',
      channels: TV_CHANNELS,
      specifications: {
        duration: '10 seconds',
        size: '10-sec commercial',
      },
      priceRange: { min: 5000, max: 25000, unit: 'per 10-second spot' },
    },
    {
      id: 'tv_morning',
      name: 'Morning Slot (6-10 AM)',
      description: 'Morning shows and news',
      channels: TV_CHANNELS,
      specifications: {
        duration: '10 seconds',
        size: '10-sec commercial',
      },
      priceRange: { min: 3000, max: 15000, unit: 'per 10-second spot' },
    },
    {
      id: 'tv_sponsorship',
      name: 'Program Sponsorship',
      description: 'Sponsor popular TV shows/serials',
      channels: TV_CHANNELS,
      specifications: {
        duration: '1 week',
        size: 'Multiple spots/week',
      },
      priceRange: { min: 200000, max: 2000000, unit: 'per week' },
    },
    {
      id: 'tv_ticker',
      name: 'Scrolling Ticker Advertisement',
      description: 'Bottom screen scrolling text',
      channels: TV_CHANNELS,
      specifications: {
        duration: '1 hour',
        size: 'Scrolling text',
      },
      priceRange: { min: 2000, max: 10000, unit: 'per hour' },
    },
  ],

  newspaper: [
    // Front Page Ads
    {
      id: 'news_front_page_full',
      name: 'Front Page - Full Page',
      description: 'Entire front page advertisement - Maximum impact and visibility',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.fullPage,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.fullPage),
        color: 'Color',
        position: 'Front Page',
      },
      priceRange: { min: 500000, max: 2000000, unit: 'per day' },
    },
    {
      id: 'news_front_page_half',
      name: 'Front Page - Half Page',
      description: 'Half page on front page - Premium positioning',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.halfPageVertical,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.halfPageVertical),
        color: 'Color',
        position: 'Front Page',
      },
      priceRange: { min: 250000, max: 1000000, unit: 'per day' },
    },
    {
      id: 'news_front_page_strip',
      name: 'Front Page - Strip/Ear Panel',
      description: 'Premium strip/ear panel on front page (horizontal/vertical)',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.stripHorizontal,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.stripHorizontal),
        color: 'Color',
        position: 'Front Page Strip',
      },
      priceRange: { min: 50000, max: 200000, unit: 'per day' },
    },
    {
      id: 'news_front_page_solus',
      name: 'Front Page - Solus (Quarter Page)',
      description: 'Exclusive quarter page on front page',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.quarterPage,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.quarterPage),
        color: 'Color',
        position: 'Front Page',
      },
      priceRange: { min: 100000, max: 400000, unit: 'per day' },
    },
    
    // Display Ads (Inside Pages)
    {
      id: 'news_display_full_general',
      name: 'Display Ad - Full Page (General Section)',
      description: 'Full page display ad in general/inside pages',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.fullPage,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.fullPage),
        color: 'Both',
        position: 'Inside Pages',
      },
      priceRange: { min: 100000, max: 500000, unit: 'per day' },
    },
    {
      id: 'news_display_half_general',
      name: 'Display Ad - Half Page (General Section)',
      description: 'Half page display ad in general/inside pages',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.halfPageVertical,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.halfPageVertical),
        color: 'Both',
        position: 'Inside Pages',
      },
      priceRange: { min: 50000, max: 250000, unit: 'per day' },
    },
    {
      id: 'news_display_quarter_general',
      name: 'Display Ad - Quarter Page (General Section)',
      description: 'Quarter page display ad in general/inside pages',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.quarterPage,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.quarterPage),
        color: 'Both',
        position: 'Inside Pages',
      },
      priceRange: { min: 25000, max: 125000, unit: 'per day' },
    },
    {
      id: 'news_display_eighth',
      name: 'Display Ad - 1/8th Page',
      description: 'Small display ad (1/8th page)',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.eighthPage,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.eighthPage),
        color: 'Both',
        position: 'Inside Pages',
      },
      priceRange: { min: 12000, max: 60000, unit: 'per day' },
    },
    
    // Category-Specific Display Ads
    {
      id: 'news_display_sports',
      name: 'Display Ad - Sports Section',
      description: 'Display advertisement in sports section - Targets sports enthusiasts',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.quarterPage,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.quarterPage),
        color: 'Both',
        position: 'Sports Section',
      },
      priceRange: { min: 30000, max: 150000, unit: 'per day' },
    },
    {
      id: 'news_display_political',
      name: 'Display Ad - Political/News Section',
      description: 'Display ad in political/main news section - High readership',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.quarterPage,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.quarterPage),
        color: 'Both',
        position: 'Political/News Section',
      },
      priceRange: { min: 35000, max: 175000, unit: 'per day' },
    },
    {
      id: 'news_display_business',
      name: 'Display Ad - Business Section',
      description: 'Display ad in business section - Targets business professionals',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.quarterPage,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.quarterPage),
        color: 'Both',
        position: 'Business Section',
      },
      priceRange: { min: 40000, max: 200000, unit: 'per day' },
    },
    {
      id: 'news_display_entertainment',
      name: 'Display Ad - Entertainment Section',
      description: 'Display ad in entertainment section - Young audience',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.quarterPage,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.quarterPage),
        color: 'Both',
        position: 'Entertainment Section',
      },
      priceRange: { min: 25000, max: 120000, unit: 'per day' },
    },
    
    // Line Ads / Classified Text
    {
      id: 'news_line_ad_job',
      name: 'Line Ad - Job Vacancy/Recruitment',
      description: 'Text-based classified line ad for job postings',
      papers: NEWSPAPERS,
      specifications: {
        lines: 1,
        color: 'B&W',
        position: 'Classified Section',
      },
      priceRange: { min: 500, max: 5000, unit: 'per line per day' },
    },
    {
      id: 'news_line_ad_matrimonial',
      name: 'Line Ad - Matrimonial',
      description: 'Text-based matrimonial classified ad',
      papers: NEWSPAPERS,
      specifications: {
        lines: 1,
        color: 'B&W',
        position: 'Matrimonial Section',
      },
      priceRange: { min: 300, max: 3000, unit: 'per line per day' },
    },
    {
      id: 'news_line_ad_real_estate',
      name: 'Line Ad - Real Estate',
      description: 'Text-based classified for property/real estate',
      papers: NEWSPAPERS,
      specifications: {
        lines: 1,
        color: 'B&W',
        position: 'Real Estate Section',
      },
      priceRange: { min: 400, max: 4000, unit: 'per line per day' },
    },
    {
      id: 'news_line_ad_general',
      name: 'Line Ad - General Classified',
      description: 'General text-based classified advertisement',
      papers: NEWSPAPERS,
      specifications: {
        lines: 1,
        color: 'B&W',
        position: 'Classified Section',
      },
      priceRange: { min: 200, max: 2000, unit: 'per line per day' },
    },
    {
      id: 'news_line_ad_obituary',
      name: 'Line Ad - Obituary/Remembrance',
      description: 'Obituary and remembrance notices',
      papers: NEWSPAPERS,
      specifications: {
        lines: 1,
        color: 'B&W',
        position: 'Obituary Section',
      },
      priceRange: { min: 500, max: 5000, unit: 'per notice' },
    },
    
    // Classified Display (With Borders/Images)
    {
      id: 'news_classified_display_job',
      name: 'Classified Display - Job Vacancy',
      description: 'Enhanced classified with borders/logo for job postings',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.classifiedDisplay,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.classifiedDisplay),
        color: 'Both',
        position: 'Classified Section',
      },
      priceRange: { min: 2000, max: 20000, unit: 'per day' },
    },
    {
      id: 'news_classified_display_matrimonial',
      name: 'Classified Display - Matrimonial',
      description: 'Enhanced matrimonial ad with photo and borders',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.classifiedDisplay,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.classifiedDisplay),
        color: 'Both',
        position: 'Matrimonial Section',
      },
      priceRange: { min: 1500, max: 15000, unit: 'per day' },
    },
    {
      id: 'news_classified_display_real_estate',
      name: 'Classified Display - Real Estate',
      description: 'Enhanced property ad with images and borders',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.classifiedDisplay,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.classifiedDisplay),
        color: 'Both',
        position: 'Real Estate Section',
      },
      priceRange: { min: 2500, max: 25000, unit: 'per day' },
    },
    {
      id: 'news_classified_display_education',
      name: 'Classified Display - Education/Admission',
      description: 'Educational institution ads with enhanced formatting',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.classifiedDisplay,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.classifiedDisplay),
        color: 'Both',
        position: 'Education Section',
      },
      priceRange: { min: 3000, max: 30000, unit: 'per day' },
    },
    {
      id: 'news_classified_display_general',
      name: 'Classified Display - General',
      description: 'General enhanced classified with borders/images',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.classifiedDisplay,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.classifiedDisplay),
        color: 'Both',
        position: 'Classified Section',
      },
      priceRange: { min: 1500, max: 15000, unit: 'per day' },
    },
    
    // Special Positions
    {
      id: 'news_back_page_full',
      name: 'Back Page - Full Page',
      description: 'Full back page advertisement - High visibility',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.fullPage,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.fullPage),
        color: 'Color',
        position: 'Back Page',
      },
      priceRange: { min: 200000, max: 800000, unit: 'per day' },
    },
    {
      id: 'news_back_page_half',
      name: 'Back Page - Half Page',
      description: 'Half back page advertisement',
      papers: NEWSPAPERS,
      specifications: {
        dimensions: NEWSPAPER_AD_DIMENSIONS.halfPageVertical,
        area: calculateAdArea(NEWSPAPER_AD_DIMENSIONS.halfPageVertical),
        color: 'Color',
        position: 'Back Page',
      },
      priceRange: { min: 100000, max: 400000, unit: 'per day' },
    },
    {
      id: 'news_jacket',
      name: 'Newspaper Jacket/Wrap',
      description: 'Wrap-around cover sheet - Complete newspaper wrapping - Maximum impact',
      papers: NEWSPAPERS,
      specifications: {
        size: 'Full Wrap (4 pages)',
        color: 'Color',
        position: 'Wrap Around',
      },
      priceRange: { min: 300000, max: 1500000, unit: 'per day' },
    },
    {
      id: 'news_insert',
      name: 'Newspaper Insert/Supplement',
      description: 'Separate insert/leaflet inside newspaper',
      papers: NEWSPAPERS,
      specifications: {
        size: 'A4 / A5 leaflet',
        color: 'Color',
        position: 'Inside Insert',
      },
      priceRange: { min: 50000, max: 300000, unit: 'per day (printing extra)' },
    },
    {
      id: 'news_bookmark',
      name: 'Bookmark Advertisement',
      description: 'Bookmark style ad insert',
      papers: NEWSPAPERS,
      specifications: {
        size: '5cm × 20cm',
        color: 'Color',
        position: 'Bookmark Insert',
      },
      priceRange: { min: 20000, max: 100000, unit: 'per day' },
    },
  ],

  van_branding: [
    {
      id: 'van_full_brand',
      name: 'Full Van Branding',
      description: 'Complete van wrapping with LED display option',
      locations: VAN_ROUTES,
      specifications: {
        size: 'Full Van (14ft × 6ft approx)',
        area: 84,
        position: 'Complete Exterior',
      },
      priceRange: { min: 15000, max: 35000, unit: 'per van per month' },
    },
    {
      id: 'van_with_audio',
      name: 'Van with Audio Announcement',
      description: 'Branded van with audio announcement system',
      locations: VAN_ROUTES,
      specifications: {
        size: 'Full Van + Audio System',
        area: 84,
        position: 'Exterior + Audio',
      },
      priceRange: { min: 20000, max: 40000, unit: 'per van per month' },
    },
    {
      id: 'van_led_display',
      name: 'LED Display Van',
      description: 'Van with digital LED screen - Dynamic content',
      locations: VAN_ROUTES,
      specifications: {
        size: 'Van + LED Screen (6ft × 4ft)',
        area: 24,
        position: 'Side LED Display',
      },
      priceRange: { min: 30000, max: 60000, unit: 'per van per month' },
    },
  ],

  bus_shelter: [
    {
      id: 'shelter_standard',
      name: 'Standard Bus Shelter Panel',
      description: 'Single panel at bus shelter - 6ft x 4ft',
      locations: BUS_SHELTER_LOCATIONS,
      specifications: {
        size: '6ft × 4ft',
        area: 24,
        position: 'Standard Panel',
      },
      priceRange: { min: 8000, max: 25000, unit: 'per shelter per month' },
    },
    {
      id: 'shelter_premium',
      name: 'Premium Location Bus Shelter',
      description: 'High-traffic premium location shelters',
      locations: BUS_SHELTER_LOCATIONS.filter(l => l.premium),
      specifications: {
        size: '6ft × 4ft',
        area: 24,
        position: 'Premium Location',
      },
      priceRange: { min: 20000, max: 50000, unit: 'per shelter per month' },
    },
    {
      id: 'shelter_backlit',
      name: 'Backlit Bus Shelter',
      description: 'Illuminated shelter panel - 24/7 visibility',
      locations: BUS_SHELTER_LOCATIONS,
      specifications: {
        size: '6ft × 4ft (Illuminated)',
        area: 24,
        position: 'Backlit Panel',
      },
      priceRange: { min: 15000, max: 40000, unit: 'per shelter per month' },
    },
  ],

  hoarding: [
    {
      id: 'hoarding_standard',
      name: 'Standard Hoarding (20x10 ft)',
      description: 'Standard size billboard - Non-lit',
      locations: HOARDING_LOCATIONS,
      specifications: {
        size: '20ft × 10ft',
        area: 200,
        position: 'Standard Billboard',
      },
      priceRange: { min: 15000, max: 50000, unit: 'per hoarding per month' },
    },
    {
      id: 'hoarding_large',
      name: 'Large Hoarding (40x20 ft)',
      description: 'Large format billboard - High visibility',
      locations: HOARDING_LOCATIONS,
      specifications: {
        size: '40ft × 20ft',
        area: 800,
        position: 'Large Billboard',
      },
      priceRange: { min: 30000, max: 100000, unit: 'per hoarding per month' },
    },
    {
      id: 'hoarding_backlit',
      name: 'Backlit Hoarding',
      description: 'Illuminated billboard - Day & night visibility',
      locations: HOARDING_LOCATIONS,
      specifications: {
        size: '20ft × 10ft (Illuminated)',
        area: 200,
        position: 'Backlit Billboard',
      },
      priceRange: { min: 40000, max: 150000, unit: 'per hoarding per month' },
    },
    {
      id: 'hoarding_digital',
      name: 'Digital LED Hoarding',
      description: 'Digital billboard with dynamic content',
      locations: HOARDING_LOCATIONS.filter(l => l.premium),
      specifications: {
        size: '20ft × 10ft (Digital LED)',
        area: 200,
        position: 'Digital Billboard',
      },
      priceRange: { min: 100000, max: 500000, unit: 'per hoarding per month' },
    },
    {
      id: 'hoarding_premium',
      name: 'Premium Location Hoarding',
      description: 'Prime locations - T.Nagar, Anna Salai, OMR',
      locations: HOARDING_LOCATIONS.filter(l => l.premium),
      specifications: {
        size: '20ft × 10ft',
        area: 200,
        position: 'Premium Location',
      },
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
