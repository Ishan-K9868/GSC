import { getFirestore } from '../config/firebase';

function getDb() {
  return getFirestore();
}

export const LIVE_FUNCTION_DECLARATIONS = [
  {
    name: 'assign_volunteer',
    description: 'Assign a specific volunteer to a specific need report. Use when coordinator says assign, dispatch, or send.',
    parameters: {
      type: 'object',
      properties: {
        needReportId: { type: 'string', description: 'The ID of the need report' },
        volunteerId: { type: 'string', description: 'The ID of the volunteer to assign' },
      },
      required: ['needReportId', 'volunteerId'],
    },
  },
  {
    name: 'get_needs_summary',
    description: 'Get a summary of current active needs. Use when coordinator asks how many needs, what is the status, or show me needs.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Filter by category (optional)' },
        status: { type: 'string', description: 'Filter by status (optional)' },
        urgencyMin: { type: 'number', description: 'Minimum urgency score (optional)' },
      },
    },
  },
  {
    name: 'escalate_need',
    description: 'Escalate a need report to critical status or cross-NGO overflow.',
    parameters: {
      type: 'object',
      properties: {
        needReportId: { type: 'string', description: 'The ID of the need report to escalate' },
        reason: { type: 'string', description: 'Reason for escalation' },
      },
      required: ['needReportId'],
    },
  },
  {
    name: 'mark_resolved',
    description: 'Mark a need report as resolved by coordinator override.',
    parameters: {
      type: 'object',
      properties: {
        needReportId: { type: 'string', description: 'The ID of the need report' },
        coordinatorId: { type: 'string', description: 'ID of the coordinator marking it resolved' },
      },
      required: ['needReportId', 'coordinatorId'],
    },
  },
  {
    name: 'get_volunteer_list',
    description: 'Get available volunteers, optionally filtered by district or category.',
    parameters: {
      type: 'object',
      properties: {
        ward: { type: 'string', description: 'Ward or district name (optional)' },
        category: { type: 'string', description: 'Need category to match skills (optional)' },
      },
    },
  },
];

export async function executeLiveTool(
  toolName: string,
  args: Record<string, any>
): Promise<string> {
  try {
    switch (toolName) {
      case 'assign_volunteer': {
        const { needReportId, volunteerId } = args;
        const taskSnapshot = await getDb().collection('dispatchTasks').where('needReportId', '==', needReportId).limit(1).get();

        if (!taskSnapshot.empty) {
          await taskSnapshot.docs[0].ref.update({
            status: 'accepted',
            acceptedVolunteerId: volunteerId,
            'coordinatorOverride.overridden': true,
            'coordinatorOverride.reason': 'Voice command dispatch',
            'coordinatorOverride.selectedVolunteerId': volunteerId,
            updatedAt: new Date().toISOString(),
          });
        }

        await getDb().collection('needReports').doc(needReportId).set(
          {
            assignedVolunteerId: volunteerId,
            status: 'dispatched',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        const volunteerDoc = await getDb().collection('volunteers').doc(volunteerId).get();
        const volunteerName = volunteerDoc.data()?.name || volunteerId;

        return `Done. ${volunteerName} has been assigned to ${needReportId}.`;
      }

      case 'get_needs_summary': {
        const { category, status, urgencyMin } = args;
        let query: FirebaseFirestore.Query = getDb().collection('needReports').where(
          'status',
          'in',
          status ? [status] : ['pending', 'classified', 'dispatched', 'in_progress']
        );

        if (category) {
          query = query.where('category', '==', category);
        }

        const snapshot = await query.get();
        let docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

        if (typeof urgencyMin === 'number') {
          docs = docs.filter((doc) => Number(doc.urgencyScore || 0) >= urgencyMin);
        }

        const total = docs.length;
        const critical = docs.filter((doc) => doc.urgency === 'critical' || Number(doc.urgencyScore || 0) >= 9).length;
        const categories = docs.reduce<Record<string, number>>((acc, doc) => {
          acc[doc.category] = (acc[doc.category] || 0) + 1;
          return acc;
        }, {});

        const categorySummary = Object.entries(categories)
          .map(([key, value]) => `${value} ${String(key).replace(/_/g, ' ')}`)
          .join(', ');

        return `There are ${total} active needs${category ? ` in ${category}` : ''}. ${categorySummary || 'No active categories found'}. ${critical} are critical.`;
      }

      case 'escalate_need': {
        const { needReportId, reason } = args;
        await getDb().collection('needReports').doc(needReportId).set(
          {
            urgency: 'critical',
            urgencyScore: 9,
            escalatedByVoice: true,
            escalationReason: reason || 'Coordinator voice escalation',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        return `Need ${needReportId} has been escalated to critical.`;
      }

      case 'mark_resolved': {
        const { needReportId, coordinatorId } = args;
        await getDb().collection('needReports').doc(needReportId).set(
          {
            status: 'resolved',
            resolvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            coordinatorOverride: {
              overridden: true,
              coordinatorId,
              at: new Date().toISOString(),
            },
          },
          { merge: true }
        );

        return `Need ${needReportId} has been marked as resolved.`;
      }

      case 'get_volunteer_list': {
        const { ward, category } = args;
        const snapshot = await getDb().collection('volunteers').where('availability', '==', 'free').limit(12).get();
        let volunteers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));

        if (ward) {
          const wardLower = String(ward).toLowerCase();
          volunteers = volunteers.filter((volunteer) =>
            String(volunteer.location?.district || volunteer.location?.state || '').toLowerCase().includes(wardLower)
          );
        }

        if (category) {
          volunteers = volunteers.filter((volunteer) =>
            Array.isArray(volunteer.categories) ? volunteer.categories.includes(category) : true
          );
        }

        if (volunteers.length === 0) {
          return 'No volunteers are currently available for that request.';
        }

        const list = volunteers
          .map((volunteer) => {
            const reliability = Math.round(Number(volunteer.stats?.reliabilityScore || 0.8) * 100);
            return `${volunteer.name} (${reliability}% reliability, ${volunteer.stats?.activeTasks || 0} active tasks)`;
          })
          .join('; ');

        return `Available volunteers: ${list}.`;
      }

      default:
        return `Unknown tool: ${toolName}`;
    }
  } catch (error) {
    console.error(`[GeminiLive] Tool ${toolName} error:`, error);
    return `Error executing ${toolName}. Please try again or use the dashboard manually.`;
  }
}
