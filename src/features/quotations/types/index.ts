// Quotation Types for Media Advertisement Agency

export type AdvertisementMedium =
  | 'bus'
  | 'auto'
  | 'radio'
  | 'tv'
  | 'newspaper'
  | 'van_branding'
  | 'bus_shelter'
  | 'hoarding';

export type ChennaiZone = 'North' | 'South' | 'Central' | 'West' | 'East' | 'OMR' | 'GST Road';

export type NewspaperAdType = 
  | 'front_page'
  | 'display_ad'
  | 'line_ad'
  | 'classified_display'
  | 'back_page'
  | 'special';

export type NewspaperCategory =
  | 'frontPage'
  | 'sports'
  | 'political'
  | 'business'
  | 'entertainment'
  | 'classified'
  | 'matrimonial'
  | 'jobVacancy'
  | 'realEstate'
  | 'education'
  | 'general';

export interface Location {
  id: string;
  name: string;
  zone: ChennaiZone;
  premium?: boolean;
  landmark?: string;
}

export interface AdDimensions {
  width: number;  // in cm
  height: number; // in cm
  unit: 'cm' | 'inches' | 'sqft';
  displayText?: string; // e.g., "25cm x 38cm (Full Page)"
}

export interface MediumSpecifications {
  dimensions?: AdDimensions;
  size?: string; // e.g., "20x10 ft", "Full Wrap", "10 seconds"
  duration?: string; // e.g., "10 seconds", "30 seconds"
  area?: number; // calculated area in sq cm or sq ft
  lines?: number; // for line ads
  color?: 'Color' | 'B&W' | 'Both';
  position?: string; // e.g., "Front Page", "Back Panel", "Backlit"
  [key: string]: any;
}

export interface MediumOption {
  id: string;
  name: string;
  description: string;
  locations?: Location[];
  channels?: string[];
  routes?: string[];
  papers?: string[];
  specifications?: MediumSpecifications;
  priceRange: {
    min: number;
    max: number;
    unit: string; // per day, per month, per slot, etc.
  };
}

export interface QuotationItem {
  id: string;
  medium: AdvertisementMedium;
  mediumOption: string; // Specific option ID
  location?: string;
  duration: number; // in days
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  specifications?: {
    optionName?: string;
    location?: string;
    newspaper?: string; // For newspaper ads
    adType?: NewspaperAdType; // For newspaper ads
    category?: NewspaperCategory; // For newspaper ads
    lines?: number; // For line ads
    dimensions?: AdDimensions; // Height x Width for display ads
    size?: string; // Overall size description
    color?: 'Color' | 'B&W' | 'Both';
    area?: number; // Calculated area
    [key: string]: any;
  };
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  customerId?: string;
  leadId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany?: string;
  items: QuotationItem[];
  subtotal: number;
  tax: number; // GST 18%
  discount: number;
  total: number;
  validUntil: Date;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface QuotationFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCompany?: string;
  leadId?: string;
  items: QuotationItem[];
  discount: number;
  notes?: string;
  validUntil: Date;
}
