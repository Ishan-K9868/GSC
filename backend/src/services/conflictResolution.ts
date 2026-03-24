/**
 * Conflict Resolution Service
 * PRD: 5.1.5 Offline Mode - Conflict Resolution
 * 
 * If the same GPS area gets 3+ offline reports, they are merged intelligently on sync.
 * This prevents duplicate reports for the same community need.
 */

import { getFirestore } from '../config/firebase';
import { NeedReport, UrgencyLevel, UrgencyLevelType, IntakeSource } from '../models/NeedReport';

// Distance threshold in meters (within 100m considered "same area")
const PROXIMITY_THRESHOLD_METERS = 100;

// Time threshold in minutes (within 30 minutes considered "same incident")
const TIME_THRESHOLD_MINUTES = 30;

interface ReportCluster {
  reports: NeedReport[];
  centerLat: number;
  centerLng: number;
  earliestTime: Date;
  latestTime: Date;
  totalPeopleAffected: number;
}

/**
 * Check for conflicting reports in the same GPS area
 */
export async function detectConflicts(
  newReports: NeedReport[]
): Promise<ReportCluster[]> {
  const db = getFirestore();
  const clusters: ReportCluster[] = [];

  // Group reports by proximity and time
  for (const report of newReports) {
    const existingCluster = clusters.find(cluster => {
      const distance = calculateDistance(
        report.location.latitude,
        report.location.longitude,
        cluster.centerLat,
        cluster.centerLng
      );
      
      const reportTime = new Date(report.createdAt);
      const timeDiff = Math.abs(reportTime.getTime() - cluster.earliestTime.getTime());
      const timeDiffMinutes = timeDiff / (1000 * 60);

      return distance <= PROXIMITY_THRESHOLD_METERS && 
             timeDiffMinutes <= TIME_THRESHOLD_MINUTES &&
             report.category === cluster.reports[0].category;
    });

    if (existingCluster) {
      existingCluster.reports.push(report);
      existingCluster.totalPeopleAffected += report.estimatedPeopleAffected || 0;
      
      // Update time range
      const reportTime = new Date(report.createdAt);
      if (reportTime < existingCluster.earliestTime) {
        existingCluster.earliestTime = reportTime;
      }
      if (reportTime > existingCluster.latestTime) {
        existingCluster.latestTime = reportTime;
      }
    } else {
      // Create new cluster
      const reportTime = new Date(report.createdAt);
      clusters.push({
        reports: [report],
        centerLat: report.location.latitude,
        centerLng: report.location.longitude,
        earliestTime: reportTime,
        latestTime: reportTime,
        totalPeopleAffected: report.estimatedPeopleAffected || 0,
      });
    }
  }

  // Return only clusters with 3+ reports
  return clusters.filter(c => c.reports.length >= 3);
}

/**
 * Merge conflicting reports into a single consolidated report
 */
export async function mergeConflictingReports(
  cluster: ReportCluster
): Promise<any> {
  const db = getFirestore();
  
  // Get highest urgency from all reports
  const urgencies = cluster.reports.map(r => r.urgency);
  const highestUrgency = getHighestUrgency(urgencies);

  // Combine descriptions
  const combinedDescription = generateMergedDescription(cluster);

  // Calculate average location
  const avgLat = cluster.reports.reduce((sum, r) => sum + r.location.latitude, 0) / cluster.reports.length;
  const avgLng = cluster.reports.reduce((sum, r) => sum + r.location.longitude, 0) / cluster.reports.length;

  // Get most detailed location info
  const locationWithAddress = cluster.reports.find(r => r.location.address);

  // Collect all photo URLs
  const allPhotoUrls = cluster.reports
    .flatMap(r => r.photoUrls || [])
    .filter((url, index, self) => self.indexOf(url) === index); // Remove duplicates

  // Collect all audio URLs
  const allAudioUrls = cluster.reports
    .flatMap(r => r.audioUrl ? [r.audioUrl] : [])
    .filter((url, index, self) => self.indexOf(url) === index);

  // Create merged report
  const mergedReport = {
    id: cluster.reports[0].id!, // Use first report's ID as primary
    description: combinedDescription,
    category: cluster.reports[0].category,
    urgency: highestUrgency,
    estimatedPeopleAffected: cluster.totalPeopleAffected,
    location: {
      latitude: avgLat,
      longitude: avgLng,
      address: locationWithAddress?.location.address || cluster.reports[0].location.address,
    },
    source: IntakeSource.CSV_IMPORT, // Use CSV_IMPORT as closest match for offline merged
    status: 'pending',
    language: cluster.reports[0].language,
    createdAt: cluster.earliestTime.toISOString(),
    updatedAt: new Date().toISOString(),
    reporterId: cluster.reports[0].reporterId,
    photoUrls: allPhotoUrls.length > 0 ? allPhotoUrls : undefined,
    audioUrl: allAudioUrls[0], // Use first audio
    mergedFromReports: cluster.reports.map(r => r.id!),
    mergedCount: cluster.reports.length,
    isOfflineSubmission: true,
  };

  // Save merged report
  const mergedDocRef = db.collection('needReports').doc(mergedReport.id!);
  await mergedDocRef.set(mergedReport as FirebaseFirestore.DocumentData);

  // Mark other reports as merged/duplicate
  for (let i = 1; i < cluster.reports.length; i++) {
    const report = cluster.reports[i];
    await db.collection('needReports').doc(report.id!).set({
      ...report,
      status: 'merged',
      mergedInto: mergedReport.id,
      updatedAt: new Date().toISOString(),
    } as FirebaseFirestore.DocumentData);
  }

  console.log(`✅ Merged ${cluster.reports.length} conflicting reports into ${mergedReport.id}`);
  
  return mergedReport;
}

/**
 * Generate a merged description from multiple reports
 */
function generateMergedDescription(cluster: ReportCluster): string {
  const reportCount = cluster.reports.length;
  const category = cluster.reports[0].category;
  
  let merged = `[${reportCount} FIELD REPORTS MERGED]\n\n`;
  merged += `Multiple field workers reported a ${category} need in this area:\n\n`;

  // Add each description with reporter context
  cluster.reports.forEach((report, index) => {
    const time = new Date(report.createdAt).toLocaleString();
    merged += `REPORT ${index + 1} (${time}):\n`;
    merged += `${report.description}\n`;
    if (report.estimatedPeopleAffected) {
      merged += `Est. affected: ${report.estimatedPeopleAffected} people\n`;
    }
    merged += `\n`;
  });

  merged += `\nCONSOLIDATED ESTIMATE: ${cluster.totalPeopleAffected} people affected`;

  return merged;
}

/**
 * Get the highest urgency level from a list
 */
function getHighestUrgency(urgencies: string[]): UrgencyLevelType {
  const urgencyRank: Record<string, number> = {
    [UrgencyLevel.CRITICAL]: 4,
    [UrgencyLevel.HIGH]: 3,
    [UrgencyLevel.MEDIUM]: 2,
    [UrgencyLevel.LOW]: 1,
  };

  let highest: UrgencyLevelType = UrgencyLevel.LOW;
  let highestRank = 0;

  for (const urgency of urgencies) {
    const rank = urgencyRank[urgency] || 0;
    if (rank > highestRank) {
      highestRank = rank;
      highest = urgency as UrgencyLevelType;
    }
  }

  return highest;
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Process offline reports on sync - detect and resolve conflicts
 */
export async function processOfflineReportsSync(
  reports: NeedReport[]
): Promise<{
  merged: NeedReport[];
  individual: NeedReport[];
}> {
  // Detect conflicts
  const clusters = await detectConflicts(reports);

  const mergedReports: NeedReport[] = [];
  const processedIds = new Set<string>();

  // Merge conflicting clusters
  for (const cluster of clusters) {
    const merged = await mergeConflictingReports(cluster);
    mergedReports.push(merged);
    
    // Mark all reports in cluster as processed
    cluster.reports.forEach(r => processedIds.add(r.id!));
  }

  // Individual reports (not part of any conflict)
  const individualReports = reports.filter(r => !processedIds.has(r.id!));

  console.log(`📊 Conflict resolution complete:`);
  console.log(`   - ${clusters.length} conflicts detected`);
  console.log(`   - ${mergedReports.length} merged reports created`);
  console.log(`   - ${individualReports.length} individual reports processed`);

  return {
    merged: mergedReports,
    individual: individualReports,
  };
}
