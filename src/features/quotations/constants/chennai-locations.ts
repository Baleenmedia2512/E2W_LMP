import { Location, ChennaiZone } from '../types';

// Chennai Zones with key locations for outdoor advertising
export const CHENNAI_ZONES: ChennaiZone[] = ['North', 'South', 'Central', 'West', 'East', 'OMR', 'GST Road'];

// Premium Hoarding Locations in Chennai
export const HOARDING_LOCATIONS: Location[] = [
  // Central Chennai
  { id: 'h1', name: 'T. Nagar - Pondy Bazaar', zone: 'Central', premium: true, landmark: 'Main Shopping Hub' },
  { id: 'h2', name: 'Anna Salai - LIC Building', zone: 'Central', premium: true, landmark: 'Corporate Area' },
  { id: 'h3', name: 'Mount Road - Spencer Plaza', zone: 'Central', premium: true, landmark: 'Shopping Mall' },
  { id: 'h4', name: 'Nungambakkam High Road', zone: 'Central', premium: true, landmark: 'Upscale Area' },
  
  // South Chennai
  { id: 'h5', name: 'Velachery Main Road', zone: 'South', premium: true, landmark: 'IT Hub' },
  { id: 'h6', name: 'Adyar Signal', zone: 'South', premium: true, landmark: 'High Traffic Junction' },
  { id: 'h7', name: 'Guindy - Grand Mall', zone: 'South', premium: false, landmark: 'Shopping Complex' },
  { id: 'h8', name: 'Porur - NIIT Junction', zone: 'South', premium: false, landmark: 'IT Corridor' },
  
  // North Chennai
  { id: 'h9', name: 'Anna Nagar Roundabout', zone: 'North', premium: true, landmark: 'Residential Hub' },
  { id: 'h10', name: 'Aminjikarai - 100 Feet Road', zone: 'North', premium: false, landmark: 'Main Road' },
  { id: 'h11', name: 'Kilpauk - Sterling Road', zone: 'North', premium: false, landmark: 'Medical Hub' },
  
  // West Chennai
  { id: 'h12', name: 'Vadapalani Junction', zone: 'West', premium: true, landmark: 'Cinema Hub' },
  { id: 'h13', name: 'Kodambakkam High Road', zone: 'West', premium: false, landmark: 'Film Industry Area' },
  { id: 'h14', name: 'Ashok Nagar - 100 Feet Road', zone: 'West', premium: false, landmark: 'Residential Area' },
  
  // East Chennai
  { id: 'h15', name: 'Mylapore - Luz Circle', zone: 'East', premium: true, landmark: 'Cultural Hub' },
  { id: 'h16', name: 'Triplicane High Road', zone: 'East', premium: false, landmark: 'Temple Area' },
  
  // OMR Corridor
  { id: 'h17', name: 'OMR - Sholinganallur Junction', zone: 'OMR', premium: true, landmark: 'IT Hub' },
  { id: 'h18', name: 'OMR - Thoraipakkam Signal', zone: 'OMR', premium: true, landmark: 'Tech Park Area' },
  { id: 'h19', name: 'OMR - Karapakkam', zone: 'OMR', premium: false, landmark: 'Residential IT Area' },
  { id: 'h20', name: 'OMR - Navalur Junction', zone: 'OMR', premium: false, landmark: 'IT Corridor' },
  
  // GST Road
  { id: 'h21', name: 'GST Road - Chromepet', zone: 'GST Road', premium: false, landmark: 'Industrial Area' },
  { id: 'h22', name: 'GST Road - Tambaram', zone: 'GST Road', premium: false, landmark: 'Railway Hub' },
];

// Bus Shelter Premium Locations
export const BUS_SHELTER_LOCATIONS: Location[] = [
  { id: 'bs1', name: 'T. Nagar Bus Stand', zone: 'Central', premium: true },
  { id: 'bs2', name: 'Koyambedu Bus Terminus', zone: 'West', premium: true },
  { id: 'bs3', name: 'Anna Nagar 2nd Avenue', zone: 'North', premium: true },
  { id: 'bs4', name: 'Adyar Depot', zone: 'South', premium: true },
  { id: 'bs5', name: 'Velachery Bus Stand', zone: 'South', premium: true },
  { id: 'bs6', name: 'OMR Sholinganallur', zone: 'OMR', premium: true },
  { id: 'bs7', name: 'Marina Beach Stop', zone: 'East', premium: true },
  { id: 'bs8', name: 'Vadapalani Bus Stop', zone: 'West', premium: false },
  { id: 'bs9', name: 'Guindy Station', zone: 'South', premium: false },
  { id: 'bs10', name: 'Tambaram Station', zone: 'GST Road', premium: false },
];

// MTC Bus Routes (Popular routes for bus advertising)
export const MTC_BUS_ROUTES = [
  { id: 'r1', route: '1, 1B, 1C', name: 'Broadway - Koyambedu', coverage: 'Central to West' },
  { id: 'r2', route: '5, 5C, 5D', name: 'T. Nagar - Koyambedu', coverage: 'Central to West' },
  { id: 'r3', route: '12, 12B', name: 'Broadway - Adyar', coverage: 'Central to South' },
  { id: 'r4', route: '21, 21G', name: 'Broadway - Anna Nagar', coverage: 'Central to North' },
  { id: 'r5', route: '27, 27E', name: 'Broadway - Velachery', coverage: 'Central to South' },
  { id: 'r6', route: '47, 47A', name: 'T. Nagar - Porur', coverage: 'Central to West' },
  { id: 'r7', route: '52, 52A', name: 'Broadway - OMR', coverage: 'Central to OMR' },
  { id: 'r8', route: '70, 70A', name: 'Koyambedu - Velachery', coverage: 'West to South' },
  { id: 'r9', route: '100, 100A', name: 'CMBT - Tambaram', coverage: 'North to GST Road' },
  { id: 'r10', route: '558', name: 'Broadway - Sholinganallur', coverage: 'Central to OMR' },
];

// Auto Rickshaw Zones
export const AUTO_ZONES: Location[] = [
  { id: 'az1', name: 'North Chennai Zone', zone: 'North', landmark: 'Anna Nagar, Kilpauk, Aminjikarai' },
  { id: 'az2', name: 'South Chennai Zone', zone: 'South', landmark: 'Velachery, Adyar, Guindy' },
  { id: 'az3', name: 'Central Chennai Zone', zone: 'Central', landmark: 'T. Nagar, Nungambakkam, Mount Road' },
  { id: 'az4', name: 'West Chennai Zone', zone: 'West', landmark: 'Vadapalani, Kodambakkam, Ashok Nagar' },
  { id: 'az5', name: 'East Chennai Zone', zone: 'East', landmark: 'Mylapore, Triplicane, Marina' },
  { id: 'az6', name: 'OMR Corridor Zone', zone: 'OMR', landmark: 'Sholinganallur, Thoraipakkam, Perungudi' },
  { id: 'az7', name: 'GST Road Zone', zone: 'GST Road', landmark: 'Chromepet, Tambaram, Pallavaram' },
];

// Van Branding Routes (Mobile advertising coverage areas)
export const VAN_ROUTES: Location[] = [
  { id: 'v1', name: 'Premium City Circuit', zone: 'Central', landmark: 'T. Nagar, Anna Salai, Marina' },
  { id: 'v2', name: 'IT Corridor Route', zone: 'OMR', landmark: 'Full OMR Coverage' },
  { id: 'v3', name: 'Residential Areas Route', zone: 'North', landmark: 'Anna Nagar, Ambattur, Avadi' },
  { id: 'v4', name: 'South Chennai Circuit', zone: 'South', landmark: 'Velachery, Adyar, Guindy, Porur' },
  { id: 'v5', name: 'Shopping District Route', zone: 'Central', landmark: 'T. Nagar, Ranganathan Street, Pondy Bazaar' },
  { id: 'v6', name: 'GST Road Industrial', zone: 'GST Road', landmark: 'Chromepet to Tambaram' },
];

export const getLocationsByZone = (zone: ChennaiZone, type: 'hoarding' | 'bus_shelter' | 'auto' | 'van') => {
  switch (type) {
    case 'hoarding':
      return HOARDING_LOCATIONS.filter(loc => loc.zone === zone);
    case 'bus_shelter':
      return BUS_SHELTER_LOCATIONS.filter(loc => loc.zone === zone);
    case 'auto':
      return AUTO_ZONES.filter(loc => loc.zone === zone);
    case 'van':
      return VAN_ROUTES.filter(loc => loc.zone === zone);
    default:
      return [];
  }
};
