import axios from 'axios';
import wardData from '../data/ward_vulnerability_index.json';

export interface UrgencyBreakdown {
  base: number;
  weatherMult: number;
  vulnerabilityMult: number;
  timeMult: number;
  finalScore: number;
  weatherReason: string;
  vulnerabilityReason: string;
  timeReason: string;
}

type WardFeature = {
  properties: {
    ward_id?: string;
    ward_name?: string;
    district?: string;
    bpl_pct?: number;
    elderly_pct?: number;
    hospital_dist_km?: number;
    school_dist_km?: number;
  };
  geometry?: {
    coordinates?: number[][][];
  };
};

function computeVulnerabilityIndex(feature: WardFeature): number {
  const {
    bpl_pct = 0,
    elderly_pct = 0,
    hospital_dist_km = 0,
    school_dist_km = 0,
  } = feature.properties;

  const normalizedBpl = Math.min(bpl_pct / 100, 1);
  const normalizedElderly = Math.min(elderly_pct / 100, 1);
  const normalizedHospital = Math.min(hospital_dist_km / 20, 1);
  const normalizedSchool = Math.min(school_dist_km / 10, 1);

  return (
    normalizedBpl * 0.35 +
    normalizedElderly * 0.25 +
    normalizedHospital * 0.25 +
    normalizedSchool * 0.15
  );
}

function pointInPolygon(lat: number, lon: number, coordinates: number[][]): boolean {
  let inside = false;

  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const xi = coordinates[i][0];
    const yi = coordinates[i][1];
    const xj = coordinates[j][0];
    const yj = coordinates[j][1];

    const intersect =
      yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-9) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

export function getVulnerabilityMultiplier(
  lat: number,
  lon: number
): { mult: number; reason: string } {
  const features = ((wardData as { features?: WardFeature[] }).features || []) as WardFeature[];

  for (const feature of features) {
    const coords = feature.geometry?.coordinates?.[0];
    if (!coords || coords.length < 3) continue;

    if (pointInPolygon(lat, lon, coords)) {
      const score = computeVulnerabilityIndex(feature);
      const wardName = feature.properties.ward_name || 'this area';

      if (score > 0.7) {
        return {
          mult: 1.5,
          reason: `High-vulnerability zone (${wardName}, index: ${score.toFixed(2)})`,
        };
      }

      if (score > 0.4) {
        return {
          mult: 1.2,
          reason: `Medium-vulnerability zone (${wardName}, index: ${score.toFixed(2)})`,
        };
      }

      return {
        mult: 1.0,
        reason: `Standard zone (${wardName}, index: ${score.toFixed(2)})`,
      };
    }
  }

  return {
    mult: 1.0,
    reason: 'Zone not found in index — no multiplier applied',
  };
}

export async function getWeatherMultiplier(
  lat: number,
  lon: number,
  category: string
): Promise<{ mult: number; reason: string }> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,precipitation,weathercode&timezone=auto`;
    const response = await axios.get(url, { timeout: 3000 });
    const current = response.data?.current || {};

    const temp = Number(current.temperature_2m || 0);
    const precipitation = Number(current.precipitation || 0);
    const weatherCode = Number(current.weathercode || 0);

    const isFlooding =
      (weatherCode >= 51 && weatherCode <= 67) ||
      (weatherCode >= 80 && weatherCode <= 82) ||
      (weatherCode >= 95 && weatherCode <= 99) ||
      precipitation > 10;

    const isHeatwave = temp > 40;

    if (isFlooding && ['shelter', 'water_sanitation'].includes(category)) {
      return {
        mult: 1.5,
        reason: `Active flooding/heavy rain (${precipitation}mm, code ${weatherCode})`,
      };
    }

    if (isFlooding && ['food_nutrition', 'health'].includes(category)) {
      return {
        mult: 1.3,
        reason: 'Flooding increases food/health risk',
      };
    }

    if (isHeatwave && ['food_nutrition', 'shelter', 'health'].includes(category)) {
      return {
        mult: 1.4,
        reason: `Heatwave conditions (${temp}°C)`,
      };
    }

    return {
      mult: 1.0,
      reason: `Normal weather (${temp}°C)`,
    };
  } catch {
    return {
      mult: 1.0,
      reason: 'Weather API unavailable — no multiplier applied',
    };
  }
}

export function getTimeMultiplier(category: string): { mult: number; reason: string } {
  const hour = new Date().getHours();
  const isNight = hour >= 22 || hour < 6;

  if (isNight && ['health', 'shelter', 'emergency'].includes(category)) {
    return {
      mult: 1.3,
      reason: `Night-time severity (${hour}:00 hrs) — services unavailable`,
    };
  }

  return {
    mult: 1.0,
    reason: `Daytime (${hour}:00 hrs)`,
  };
}

export function urgencyEnumToBase(urgencyEnum: string): number {
  const map: Record<string, number> = {
    critical: 9,
    high: 7,
    medium: 5,
    low: 3,
  };

  return map[urgencyEnum] ?? 5;
}

export async function computeFullUrgencyScore(
  baseUrgencyEnum: string,
  category: string,
  lat: number,
  lon: number
): Promise<UrgencyBreakdown> {
  const base = urgencyEnumToBase(baseUrgencyEnum);

  const [weatherResult, vulnResult] = await Promise.all([
    getWeatherMultiplier(lat, lon, category),
    Promise.resolve(getVulnerabilityMultiplier(lat, lon)),
  ]);

  const timeResult = getTimeMultiplier(category);
  const finalScore = base * weatherResult.mult * vulnResult.mult * timeResult.mult;

  return {
    base,
    weatherMult: weatherResult.mult,
    vulnerabilityMult: vulnResult.mult,
    timeMult: timeResult.mult,
    finalScore: Math.min(Number(finalScore.toFixed(2)), 99),
    weatherReason: weatherResult.reason,
    vulnerabilityReason: vulnResult.reason,
    timeReason: timeResult.reason,
  };
}
