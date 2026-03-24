/**
 * Auto-Dispatch Service
 * PRD: 5.1.6 Need Classification Engine - Auto-Action
 * 
 * Handles automatic dispatch and alerts based on urgency level.
 * - CRITICAL: Auto-dispatch within 60 seconds
 * - HIGH: Priority matching with nearby NGOs
 */

import { getFirestore } from '../config/firebase';
import { NeedReport, UrgencyLevel, NeedCategory, ReportStatus } from '../models/NeedReport';

export interface DispatchResult {
  success: boolean;
  dispatchedTo?: {
    ngoId?: string;
    ngoName?: string;
    volunteerId?: string;
    volunteerName?: string;
  };
  alertsSent?: number;
  message: string;
}

export async function triggerAutoDispatch(report: NeedReport): Promise<DispatchResult> {
  const db = getFirestore();
  
  console.log(`🚨 Auto-dispatch triggered for report ${report.id}`);
  console.log(`   Category: ${report.category}, Urgency: ${report.urgency}`);

  try {
    // Find nearby NGOs that handle this category
    const nearbyNgos = await findNearbyNgos(
      report.location.latitude,
      report.location.longitude,
      report.category,
      50 // 50km radius
    );

    if (nearbyNgos.length === 0) {
      console.warn(`⚠️ No NGOs found for category ${report.category}`);
      return {
        success: false,
        message: 'No matching NGOs found in the area',
      };
    }

    // Select best NGO (closest with capacity)
    const selectedNgo = nearbyNgos[0];

    // Update report with assignment
    await db.collection('needReports').doc(report.id!).update({
      status: ReportStatus.DISPATCHED,
      assignedNgoId: selectedNgo.id,
      updatedAt: new Date().toISOString(),
    });

    // Send notification to NGO
    await sendDispatchNotification(selectedNgo.id, report);

    // For CRITICAL cases, also alert emergency services
    if (report.urgency === UrgencyLevel.CRITICAL) {
      await alertEmergencyServices(report);
    }

    // For WOMEN_CHILD category, enable privacy mode
    if (report.category === NeedCategory.WOMEN_CHILD) {
      await enablePrivacyMode(report.id!);
    }

    return {
      success: true,
      dispatchedTo: {
        ngoId: selectedNgo.id,
        ngoName: selectedNgo.name,
      },
      alertsSent: report.urgency === UrgencyLevel.CRITICAL ? 2 : 1,
      message: `Dispatched to ${selectedNgo.name}`,
    };
  } catch (error) {
    console.error('Auto-dispatch error:', error);
    return {
      success: false,
      message: 'Dispatch failed due to system error',
    };
  }
}

// Find NGOs within radius that handle the category
async function findNearbyNgos(
  lat: number,
  lng: number,
  category: string,
  radiusKm: number
): Promise<Array<{ id: string; name: string; distance: number }>> {
  const db = getFirestore();
  
  // In production, use geohashing or a geospatial database
  // For now, query all NGOs with the category and calculate distance
  const ngosSnapshot = await db.collection('ngos')
    .where('categories', 'array-contains', category)
    .where('isActive', '==', true)
    .limit(10)
    .get();

  const ngos = ngosSnapshot.docs.map(doc => {
    const data = doc.data();
    const distance = calculateDistance(
      lat, lng,
      data.location?.latitude || 0,
      data.location?.longitude || 0
    );
    return {
      id: doc.id,
      name: data.name || 'Unknown NGO',
      distance,
    };
  });

  // Filter by radius and sort by distance
  return ngos
    .filter(ngo => ngo.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
}

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Send dispatch notification to NGO
async function sendDispatchNotification(ngoId: string, report: NeedReport): Promise<void> {
  const db = getFirestore();
  
  // Create notification record
  await db.collection('notifications').add({
    recipientType: 'ngo',
    recipientId: ngoId,
    type: 'dispatch',
    title: `New ${report.category} report - ${report.urgency.toUpperCase()}`,
    body: report.description.substring(0, 100),
    reportId: report.id,
    urgency: report.urgency,
    createdAt: new Date().toISOString(),
    read: false,
  });

  // In production, also send FCM push notification
  console.log(`📱 Notification sent to NGO ${ngoId}`);
}

// Alert emergency services for CRITICAL cases
async function alertEmergencyServices(report: NeedReport): Promise<void> {
  const db = getFirestore();
  
  // Create emergency alert record
  await db.collection('emergencyAlerts').add({
    reportId: report.id,
    category: report.category,
    location: report.location,
    description: report.description,
    createdAt: new Date().toISOString(),
    status: 'pending',
  });

  // In production, integrate with government emergency APIs
  console.log(`🚨 Emergency services alerted for report ${report.id}`);
}

// Enable privacy mode for sensitive reports
async function enablePrivacyMode(reportId: string): Promise<void> {
  const db = getFirestore();
  
  await db.collection('needReports').doc(reportId).update({
    isPrivate: true,
    // Remove from public map
    showOnPublicMap: false,
    // Restrict access to assigned NGO only
    accessRestricted: true,
  });

  console.log(`🔒 Privacy mode enabled for report ${reportId}`);
}

// Manual dispatch (for dashboard use)
export async function manualDispatch(
  reportId: string,
  ngoId: string,
  volunteerId?: string
): Promise<DispatchResult> {
  const db = getFirestore();
  
  try {
    const updates: any = {
      status: ReportStatus.DISPATCHED,
      assignedNgoId: ngoId,
      updatedAt: new Date().toISOString(),
    };
    
    if (volunteerId) {
      updates.assignedVolunteerId = volunteerId;
    }

    await db.collection('needReports').doc(reportId).update(updates);

    // Get report for notification
    const reportDoc = await db.collection('needReports').doc(reportId).get();
    const report = reportDoc.data() as NeedReport;

    await sendDispatchNotification(ngoId, report);

    return {
      success: true,
      dispatchedTo: { ngoId, volunteerId },
      message: 'Manual dispatch successful',
    };
  } catch (error) {
    console.error('Manual dispatch error:', error);
    return {
      success: false,
      message: 'Manual dispatch failed',
    };
  }
}
