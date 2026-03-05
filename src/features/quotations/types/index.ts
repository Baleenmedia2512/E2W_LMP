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

export interface Location {
  id: string;
  name: string;
  zone: ChennaiZone;
  premium?: boolean;
  landmark?: string;
}

export interface MediumOption {
  id: string;
  name: string;
  description: string;
  locations?: Location[];
  channels?: string[];
  routes?: string[];
  papers?: string[];
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
  specifications?: Record<string, any>;
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
