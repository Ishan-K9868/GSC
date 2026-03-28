import type { Location } from '../types';

export type DelhiLocationPreset = {
  id: string;
  label: string;
  district: string;
  hint: string;
  location: Location;
};

export const DELHI_LOCATION_PRESETS: DelhiLocationPreset[] = [
  {
    id: 'okhla',
    label: 'Okhla',
    district: 'South East Delhi',
    hint: 'Dense settlement and water/sanitation hotspot',
    location: {
      latitude: 28.5453,
      longitude: 77.2734,
      address: 'Okhla, South East Delhi, Delhi',
      district: 'South East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'sarita-vihar',
    label: 'Sarita Vihar',
    district: 'South East Delhi',
    hint: 'Residential cluster near relief and health routes',
    location: {
      latitude: 28.5337,
      longitude: 77.2912,
      address: 'Sarita Vihar, South East Delhi, Delhi',
      district: 'South East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'lajpat-nagar',
    label: 'Lajpat Nagar',
    district: 'South East Delhi',
    hint: 'High-traffic ward for education and food support',
    location: {
      latitude: 28.5677,
      longitude: 77.2434,
      address: 'Lajpat Nagar, South East Delhi, Delhi',
      district: 'South East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'seelampur',
    label: 'Seelampur',
    district: 'North East Delhi',
    hint: 'Crowded corridor with recurring health and shelter needs',
    location: {
      latitude: 28.6729,
      longitude: 77.2691,
      address: 'Seelampur, North East Delhi, Delhi',
      district: 'North East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'mustafabad',
    label: 'Mustafabad',
    district: 'North East Delhi',
    hint: 'Flood and sanitation pressure zone',
    location: {
      latitude: 28.6967,
      longitude: 77.2861,
      address: 'Mustafabad, North East Delhi, Delhi',
      district: 'North East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'rohini',
    label: 'Rohini',
    district: 'North West Delhi',
    hint: 'Large ward with education and environment cases',
    location: {
      latitude: 28.7494,
      longitude: 77.0565,
      address: 'Rohini, North West Delhi, Delhi',
      district: 'North West Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'dwarka',
    label: 'Dwarka',
    district: 'South West Delhi',
    hint: 'South-west operations zone shown on the live map',
    location: {
      latitude: 28.5921,
      longitude: 77.046,
      address: 'Dwarka, South West Delhi, Delhi',
      district: 'South West Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'mehrauli',
    label: 'Mehrauli',
    district: 'South Delhi',
    hint: 'Southern relief cluster for women/child and shelter support',
    location: {
      latitude: 28.5208,
      longitude: 77.1855,
      address: 'Mehrauli, South Delhi, Delhi',
      district: 'South Delhi',
      state: 'Delhi',
    },
  },
];

export function getDelhiLocationPreset(id: string): DelhiLocationPreset | undefined {
  return DELHI_LOCATION_PRESETS.find((preset) => preset.id === id);
}
