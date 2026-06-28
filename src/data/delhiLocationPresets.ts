import type { Location } from '../types';

export type DelhiLocationPreset = {
  id: string;
  label: string;
  district: string;
  hint: string;
  aliases?: string[];
  location: Location;
};

export const DELHI_LOCATION_PRESETS: DelhiLocationPreset[] = [
  {
    id: 'okhla',
    label: 'Okhla',
    district: 'South East Delhi',
    hint: 'Dense settlement and water/sanitation hotspot',
    aliases: ['Jamia Nagar', 'Batla House', 'Shaheen Bagh'],
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
    aliases: ['Jasola', 'Apollo area'],
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
    aliases: ['Amar Colony', 'Central Market Lajpat'],
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
    aliases: ['Jafrabad', 'Welcome'],
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
    aliases: ['Karawal Nagar edge', 'Shiv Vihar'],
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
    aliases: ['Rohini Sector 7', 'Rohini Sector 16'],
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
    aliases: ['Dwarka Sector 10', 'Dwarka Sector 21'],
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
    aliases: ['Qutub area', 'Kishangarh'],
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

export const DELHI_LOCATION_SEARCH_SUGGESTIONS: DelhiLocationPreset[] = [
  {
    id: 'nizamuddin-basti',
    label: 'Nizamuddin Basti',
    district: 'South East Delhi',
    hint: 'Dense settlement near health, food, and shelter response routes',
    aliases: ['Hazrat Nizamuddin', 'Nizamuddin West'],
    location: {
      latitude: 28.5919,
      longitude: 77.2453,
      address: 'Nizamuddin Basti, South East Delhi, Delhi',
      district: 'South East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'govindpuri',
    label: 'Govindpuri',
    district: 'South East Delhi',
    hint: 'High-density corridor for sanitation and food support reports',
    aliases: ['Kalkaji Extension', 'Tughlakabad Extension'],
    location: {
      latitude: 28.5355,
      longitude: 77.2648,
      address: 'Govindpuri, South East Delhi, Delhi',
      district: 'South East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'madanpur-khadar',
    label: 'Madanpur Khadar',
    district: 'South East Delhi',
    hint: 'Yamuna-side settlement with recurring flood and WASH pressure',
    aliases: ['Khadar', 'JJ Colony Madanpur Khadar'],
    location: {
      latitude: 28.5362,
      longitude: 77.3085,
      address: 'Madanpur Khadar, South East Delhi, Delhi',
      district: 'South East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'sangam-vihar',
    label: 'Sangam Vihar',
    district: 'South Delhi',
    hint: 'Large settlement cluster for water, health, and education needs',
    aliases: ['Deoli', 'Tigri'],
    location: {
      latitude: 28.4962,
      longitude: 77.2491,
      address: 'Sangam Vihar, South Delhi, Delhi',
      district: 'South Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'jahangirpuri',
    label: 'Jahangirpuri',
    district: 'North West Delhi',
    hint: 'North-west cluster for shelter, food, and health reports',
    aliases: ['Adarsh Nagar side', 'Bhalswa edge'],
    location: {
      latitude: 28.7258,
      longitude: 77.1621,
      address: 'Jahangirpuri, North West Delhi, Delhi',
      district: 'North West Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'bawana',
    label: 'Bawana',
    district: 'North West Delhi',
    hint: 'Industrial and resettlement belt for environment and food cases',
    aliases: ['Bawana JJ Colony', 'Narela Bawana'],
    location: {
      latitude: 28.7976,
      longitude: 77.0488,
      address: 'Bawana, North West Delhi, Delhi',
      district: 'North West Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'shahdara',
    label: 'Shahdara',
    district: 'East Delhi',
    hint: 'East Delhi operations point for health and waste reports',
    aliases: ['Mansarovar Park', 'Vishwas Nagar'],
    location: {
      latitude: 28.6735,
      longitude: 77.289,
      address: 'Shahdara, East Delhi, Delhi',
      district: 'East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'anand-vihar',
    label: 'Anand Vihar',
    district: 'East Delhi',
    hint: 'Transit hub with crowd, shelter, and emergency response context',
    aliases: ['Anand Vihar ISBT', 'Kaushambi border'],
    location: {
      latitude: 28.6469,
      longitude: 77.3152,
      address: 'Anand Vihar, East Delhi, Delhi',
      district: 'East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'yamuna-bank',
    label: 'Yamuna Bank',
    district: 'East Delhi',
    hint: 'River-adjacent point for flood and temporary shelter reports',
    aliases: ['Mayur Vihar Phase 1', 'Akshardham side'],
    location: {
      latitude: 28.6233,
      longitude: 77.2679,
      address: 'Yamuna Bank, East Delhi, Delhi',
      district: 'East Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'burari',
    label: 'Burari',
    district: 'North Delhi',
    hint: 'North Delhi residential belt for health and sanitation requests',
    aliases: ['Sant Nagar', 'Nathupura'],
    location: {
      latitude: 28.7532,
      longitude: 77.1949,
      address: 'Burari, North Delhi, Delhi',
      district: 'North Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'kashmere-gate',
    label: 'Kashmere Gate',
    district: 'Central Delhi',
    hint: 'Transit-heavy area for emergency and temporary shelter reports',
    aliases: ['ISBT Kashmere Gate', 'Old Delhi'],
    location: {
      latitude: 28.6676,
      longitude: 77.2273,
      address: 'Kashmere Gate, Central Delhi, Delhi',
      district: 'Central Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'aiims-delhi',
    label: 'AIIMS Delhi',
    district: 'South Delhi',
    hint: 'Health response landmark for urgent medical support reports',
    aliases: ['AIIMS', 'Ansari Nagar', 'Safdarjung'],
    location: {
      latitude: 28.5672,
      longitude: 77.21,
      address: 'AIIMS Delhi, South Delhi, Delhi',
      district: 'South Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'tilak-nagar',
    label: 'Tilak Nagar',
    district: 'West Delhi',
    hint: 'West Delhi ward for food, health, and education requests',
    aliases: ['Janakpuri side', 'Subhash Nagar'],
    location: {
      latitude: 28.6365,
      longitude: 77.0965,
      address: 'Tilak Nagar, West Delhi, Delhi',
      district: 'West Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'najafgarh',
    label: 'Najafgarh',
    district: 'South West Delhi',
    hint: 'Outer south-west area for shelter and health support reports',
    aliases: ['Nangli Sakrawati', 'Roshanpura'],
    location: {
      latitude: 28.6092,
      longitude: 76.9798,
      address: 'Najafgarh, South West Delhi, Delhi',
      district: 'South West Delhi',
      state: 'Delhi',
    },
  },
  {
    id: 'connaught-place',
    label: 'Connaught Place',
    district: 'New Delhi',
    hint: 'Central landmark for coordination and urgent routing',
    aliases: ['CP', 'Rajiv Chowk'],
    location: {
      latitude: 28.6315,
      longitude: 77.2167,
      address: 'Connaught Place, New Delhi, Delhi',
      district: 'New Delhi',
      state: 'Delhi',
    },
  },
];

const searchItems = [...DELHI_LOCATION_PRESETS, ...DELHI_LOCATION_SEARCH_SUGGESTIONS];

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function searchDelhiLocations(query: string, limit = 6): DelhiLocationPreset[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return DELHI_LOCATION_PRESETS.slice(0, limit);

  const queryParts = normalizedQuery.split(' ').filter(Boolean);

  return searchItems
    .map((item) => {
      const haystack = normalizeSearchText(
        [item.label, item.district, item.hint, item.location.address, ...(item.aliases || [])].filter(Boolean).join(' ')
      );
      const startsWithLabel = normalizeSearchText(item.label).startsWith(normalizedQuery);
      const includesAllParts = queryParts.every((part) => haystack.includes(part));
      const includesQuery = haystack.includes(normalizedQuery);
      const score = (startsWithLabel ? 30 : 0) + (includesQuery ? 18 : 0) + (includesAllParts ? 10 : 0);

      return { item, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
    .slice(0, limit)
    .map(({ item }) => item);
}
