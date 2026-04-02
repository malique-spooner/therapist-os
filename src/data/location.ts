import { checkInHistory } from '@/data/checkins';
import { financeData } from '@/data/finance';
import { healthData } from '@/data/health';
import { musicData } from '@/data/music';
import { nutritionData } from '@/data/nutrition';
import { relationshipInteractions } from '@/data/relationships';
import { APP_TODAY, differenceInDays, getDateRange, parseIsoDate } from '@/lib/date';

export type SavedPlaceCategory =
  | 'home'
  | 'work'
  | 'gym'
  | 'green_space'
  | 'cafe'
  | 'social'
  | 'errands'
  | 'transit'
  | 'misc';

export interface LocationPathPoint {
  lat: number;
  lng: number;
  t: number;
  label?: string;
}

export interface LocationVisit {
  placeId: string;
  label: string;
  category: SavedPlaceCategory;
  arrivalTimestamp: number;
  departureTimestamp: number;
  dwellMinutes: number;
  moodAssociation?: 'positive' | 'neutral' | 'draining';
}

export interface SavedPlace {
  id: string;
  label: string;
  category: SavedPlaceCategory;
  lat: number;
  lng: number;
  visitCount: number;
  avgDwellMinutes: number;
}

export interface LocationDay {
  date: string;
  totalTimeOutMinutes: number;
  placesVisitedCount: number;
  placeTransitions: number;
  longestStationaryMinutes: number;
  routineStabilityScore: number;
  noveltyScore: number;
  pathPoints: LocationPathPoint[];
  visits: LocationVisit[];
}

function seed(n: number) {
  const x = Math.sin(n) * 10000;
  return x - Math.floor(x);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const basePlaces: Omit<SavedPlace, 'visitCount' | 'avgDwellMinutes'>[] = [
  { id: 'home', label: 'Home', category: 'home', lat: 51.5074, lng: -0.1278 },
  { id: 'work', label: 'Studio Office', category: 'work', lat: 51.5156, lng: -0.0919 },
  { id: 'gym', label: 'Movement Studio', category: 'gym', lat: 51.5033, lng: -0.1195 },
  { id: 'park', label: 'Riverside Green', category: 'green_space', lat: 51.5055, lng: -0.1049 },
  { id: 'cafe', label: 'Corner Cafe', category: 'cafe', lat: 51.5111, lng: -0.1013 },
  { id: 'social', label: 'Friends Quarter', category: 'social', lat: 51.5202, lng: -0.1029 },
  { id: 'errands', label: 'Market Run', category: 'errands', lat: 51.5142, lng: -0.1161 },
  { id: 'transit', label: 'Tube Junction', category: 'transit', lat: 51.5098, lng: -0.1180 },
];

function createVisit(
  date: string,
  placeId: string,
  startHour: number,
  durationMinutes: number,
  moodAssociation?: 'positive' | 'neutral' | 'draining'
): LocationVisit {
  const place = basePlaces.find((entry) => entry.id === placeId)!;
  const arrival = new Date(`${date}T00:00:00Z`).getTime() + startHour * 3600000;
  const departure = arrival + durationMinutes * 60000;
  return {
    placeId,
    label: place.label,
    category: place.category,
    arrivalTimestamp: arrival,
    departureTimestamp: departure,
    dwellMinutes: durationMinutes,
    moodAssociation,
  };
}

function buildDay(date: string, index: number): LocationDay {
  const health = healthData[index];
  const mood = checkInHistory[index];
  const nutrition = nutritionData[index];
  const finance = financeData[index];
  const music = musicData[index];
  const day = parseIsoDate(date).getUTCDay();
  const isWeekend = day === 0 || day === 6;
  const inPersonCount = relationshipInteractions.filter(
    (entry) => entry.date === date && (entry.type === 'in_person' || entry.type === 'activity_together')
  ).length;
  const r = seed(index * 53 + 7);
  const previousHomeOnly = index > 0 ? locationData[index - 1]?.placesVisitedCount === 1 : false;

  const lowActivation = mood.emotionalState <= 2 || health.steps < 6200;
  const overscheduled = finance.social > 18 && finance.transport > 8 && nutrition.alcohol.units > 1;
  const restorativeDay = mood.emotionalState >= 4 && health.sleepQuality >= 7 && (health.hadWorkout || inPersonCount > 0);

  const visits: LocationVisit[] = [createVisit(date, 'home', 0, 7 * 60, 'neutral')];

  if (!lowActivation) {
    if (!isWeekend) {
      visits.push(createVisit(date, 'transit', 8, 35, 'neutral'));
      visits.push(createVisit(date, 'work', 9, clamp(390 + Math.round((r - 0.5) * 120), 280, 540), mood.emotionalState >= 4 ? 'neutral' : 'draining'));
    } else if (r > 0.35) {
      visits.push(createVisit(date, 'cafe', 10, clamp(70 + Math.round(r * 60), 50, 130), 'positive'));
    }

    if (health.hadWorkout || health.steps > 9800) {
      visits.push(createVisit(date, 'gym', isWeekend ? 11 : 18, clamp(55 + Math.round(r * 30), 45, 90), 'positive'));
    } else if (r > 0.45) {
      visits.push(createVisit(date, 'park', isWeekend ? 13 : 17, clamp(40 + Math.round(r * 55), 30, 95), 'positive'));
    }

    if (inPersonCount > 0 || finance.social > 8 || (isWeekend && r > 0.4)) {
      visits.push(createVisit(date, 'social', 19, clamp(95 + Math.round(r * 95), 70, 190), 'positive'));
    } else if (r > 0.55) {
      visits.push(createVisit(date, 'errands', 18, clamp(40 + Math.round(r * 40), 30, 75), 'neutral'));
    }
  } else if (r > 0.72 && !previousHomeOnly) {
    visits.push(createVisit(date, 'park', 16, 35, 'positive'));
  }

  if (overscheduled) {
    visits.push(createVisit(date, 'transit', 21, 45, 'draining'));
  }

  visits.push(createVisit(date, 'home', 22, 2 * 60, restorativeDay ? 'positive' : 'neutral'));

  const mergedVisits = visits.sort((a, b) => a.arrivalTimestamp - b.arrivalTimestamp);
  const uniqueOutsidePlaces = new Set(mergedVisits.filter((visit) => visit.category !== 'home').map((visit) => visit.placeId));
  const totalTimeOutMinutes = mergedVisits
    .filter((visit) => visit.category !== 'home')
    .reduce((sum, visit) => sum + visit.dwellMinutes, 0);
  const placeTransitions = Math.max(0, mergedVisits.length - 1);
  const longestStationaryMinutes = Math.max(...mergedVisits.map((visit) => visit.dwellMinutes));
  const routineStabilityScore = clamp(
    Math.round(
      7
      + (!isWeekend ? 1 : -1)
      + (uniqueOutsidePlaces.has('work') ? 1 : 0)
      + (previousHomeOnly && uniqueOutsidePlaces.size > 1 ? -2 : 0)
      - (overscheduled ? 3 : 0)
      + (r - 0.5) * 4
    ),
    1,
    10
  );
  const noveltyScore = clamp(
    Math.round(
      2
      + uniqueOutsidePlaces.size
      + (uniqueOutsidePlaces.has('cafe') ? 1 : 0)
      + (uniqueOutsidePlaces.has('park') ? 1 : 0)
      + (music.newDiscoveries > 2 ? 1 : 0)
      - (uniqueOutsidePlaces.has('work') && uniqueOutsidePlaces.size === 1 ? 1 : 0)
      + (r - 0.5) * 3
    ),
    1,
    10
  );

  const pathPoints = mergedVisits.map((visit, visitIndex) => {
    const place = basePlaces.find((entry) => entry.id === visit.placeId)!;
    return {
      lat: place.lat + (seed(index * 67 + visitIndex) - 0.5) * 0.003,
      lng: place.lng + (seed(index * 71 + visitIndex) - 0.5) * 0.003,
      t: visit.arrivalTimestamp,
      label: visit.label,
    };
  });

  return {
    date,
    totalTimeOutMinutes,
    placesVisitedCount: uniqueOutsidePlaces.size + 1,
    placeTransitions,
    longestStationaryMinutes,
    routineStabilityScore,
    noveltyScore,
    pathPoints,
    visits: mergedVisits,
  };
}

const dates = getDateRange(90, APP_TODAY);

export const locationData: LocationDay[] = [];
for (let index = 0; index < dates.length; index++) {
  locationData.push(buildDay(dates[index], index));
}

export const savedPlaces: SavedPlace[] = basePlaces.map((place) => {
  const visits = locationData.flatMap((day) => day.visits.filter((visit) => visit.placeId === place.id));
  const avgDwellMinutes = visits.length ? Math.round(visits.reduce((sum, visit) => sum + visit.dwellMinutes, 0) / visits.length) : 0;
  return {
    ...place,
    visitCount: visits.length,
    avgDwellMinutes,
  };
});

export function getLocationForPeriod(days: number) {
  return locationData.filter((day) => differenceInDays(day.date, APP_TODAY) < days);
}
