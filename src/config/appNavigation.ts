export type AppNavItem = {
  label: string;
  path: string;
  description: string;
  group: 'Command' | 'Field' | 'Intelligence' | 'Partners';
  icon: string;
  accent: 'terra' | 'jade' | 'amber';
};

export const appNavItems: AppNavItem[] = [
  {
    label: 'Workspace',
    path: '/workspace',
    description: 'Master dashboard linking every SevaSetu surface with live context and next actions.',
    group: 'Command',
    icon: 'constellation',
    accent: 'terra',
  },
  {
    label: 'The Map',
    path: '/pulse-map',
    description: 'Delhi operations atlas with area labels, NGO coverage, and live incident clusters.',
    group: 'Command',
    icon: 'map',
    accent: 'jade',
  },
  {
    label: 'SEVA Agent',
    path: '/seva-agent',
    description: 'Dispatch control room for ranked volunteer matching, SLAs, and coordinator overrides.',
    group: 'Command',
    icon: 'dispatch',
    accent: 'amber',
  },
  {
    label: 'NGO Dashboard',
    path: '/ngo-dashboard',
    description: 'Operations, volunteer health, pipeline flow, supplies, and impact in one command center.',
    group: 'Command',
    icon: 'dashboard',
    accent: 'jade',
  },
  {
    label: 'Report a Need',
    path: '/intake',
    description: 'Voice, photo, form, and assisted chat intake inside one field-ready reporting workspace.',
    group: 'Field',
    icon: 'intake',
    accent: 'terra',
  },
  {
    label: 'Volunteer App',
    path: '/volunteer-app',
    description: 'Mission feed, checklists, chat, evidence capture, and rewards for field volunteers.',
    group: 'Field',
    icon: 'volunteer',
    accent: 'jade',
  },
  {
    label: 'Gemini Lab',
    path: '/gemini-lab',
    description: 'AI workbench for copilots, forecasts, impact reporting, and escalation drafting.',
    group: 'Intelligence',
    icon: 'spark',
    accent: 'amber',
  },
  {
    label: 'CSR Portal',
    path: '/csr-portal',
    description: 'Enterprise volunteering, compliance, NGO due diligence, and leaderboards.',
    group: 'Partners',
    icon: 'csr',
    accent: 'terra',
  },
  {
    label: 'Panchayat',
    path: '/panchayat',
    description: 'Hindi-first civic coordination for village officials, scheme matching, and local history.',
    group: 'Partners',
    icon: 'civic',
    accent: 'jade',
  },
  {
    label: 'Crisis Mode',
    path: '/crisis-mode',
    description: 'Emergency response console with surge mobilization, requisitioning, and public briefs.',
    group: 'Command',
    icon: 'crisis',
    accent: 'amber',
  },
  {
    label: 'For NGOs',
    path: '/for-ngos',
    description: 'A guided onboarding space for NGO teams entering the SevaSetu network.',
    group: 'Partners',
    icon: 'network',
    accent: 'terra',
  },
];

export const marketingNavItems = appNavItems.filter((item) =>
  ['/pulse-map', '/intake', '/workspace'].includes(item.path)
);

export function getAppNavItem(pathname: string) {
  return appNavItems.find((item) => item.path === pathname) || appNavItems[0];
}
