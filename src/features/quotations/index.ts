// Export all quotation types
export type {
  AdvertisementMedium,
  ChennaiZone,
  NewspaperAdType,
  NewspaperCategory,
  Location,
  MediumOption,
  QuotationItem,
  Quotation,
  QuotationFormData,
} from './types';

// Export constants
export {
  CHENNAI_ZONES,
  HOARDING_LOCATIONS,
  BUS_SHELTER_LOCATIONS,
  MTC_BUS_ROUTES,
  AUTO_ZONES,
  VAN_ROUTES,
  getLocationsByZone,
} from './constants/chennai-locations';

export {
  RADIO_CHANNELS,
  TV_CHANNELS,
  NEWSPAPERS,
  CHENNAI_NEWSPAPERS,
  NEWSPAPER_CATEGORIES,
  NEWSPAPER_AD_DIMENSIONS,
  ADVERTISEMENT_MEDIUMS,
  getMediumOptions,
  getMediumDisplayName,
  calculateAdArea,
  formatDimensions,
} from './constants/mediums';

// Export components
export {
  MediumSelector,
  LocationSelector,
  NewspaperSelector,
  QuotationForm,
  QuotationPDFPreview,
  CreateQuotationButton,
} from './components';

// Export hooks
export { useQuotationCalculator } from './hooks/useQuotationCalculator';
