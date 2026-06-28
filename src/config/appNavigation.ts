export type DemoRole = 'all' | 'reporter' | 'volunteer' | 'ngo';

export type AppNavItem = {
  label: string;
  path: string;
  description: string;
  group: 'Command' | 'Field' | 'Intelligence' | 'Partners';
  icon: string;
  accent: 'terra' | 'jade' | 'amber';
  demoRoles: Exclude<DemoRole, 'all'>[];
};

export const appNavItems: AppNavItem[] = [
  {
    label: 'Workspace',
    path: '/workspace',
    description: 'Master dashboard linking every SevaSetu surface with live context and next actions.',
    group: 'Command',
    icon: 'constellation',
    accent: 'terra',
    demoRoles: ['ngo'],
  },
  {
    label: 'The Map',
    path: '/pulse-map',
    description: 'Delhi operations atlas with area labels, NGO coverage, and live incident clusters.',
    group: 'Command',
    icon: 'map',
    accent: 'jade',
    demoRoles: ['reporter', 'volunteer', 'ngo'],
  },
  {
    label: 'SEVA Agent',
    path: '/seva-agent',
    description: 'Dispatch control room for ranked volunteer matching, SLAs, and coordinator overrides.',
    group: 'Command',
    icon: 'dispatch',
    accent: 'amber',
    demoRoles: ['ngo'],
  },
  {
    label: 'NGO Dashboard',
    path: '/ngo-dashboard',
    description: 'Operations, volunteer health, pipeline flow, supplies, and impact in one command center.',
    group: 'Command',
    icon: 'dashboard',
    accent: 'jade',
    demoRoles: ['ngo'],
  },
  {
    label: 'Report a Need',
    path: '/intake',
    description: 'Voice, photo, form, and assisted chat intake inside one field-ready reporting workspace.',
    group: 'Field',
    icon: 'intake',
    accent: 'terra',
    demoRoles: ['reporter'],
  },
  {
    label: 'Volunteer App',
    path: '/volunteer-app',
    description: 'Mission feed, checklists, chat, evidence capture, and rewards for field volunteers.',
    group: 'Field',
    icon: 'volunteer',
    accent: 'jade',
    demoRoles: ['volunteer'],
  },
  {
    label: 'Gemini Lab',
    path: '/gemini-lab',
    description: 'AI workbench for copilots, forecasts, impact reporting, and escalation drafting.',
    group: 'Intelligence',
    icon: 'spark',
    accent: 'amber',
    demoRoles: ['ngo'],
  },
  {
    label: 'CSR Portal',
    path: '/csr-portal',
    description: 'Enterprise volunteering, compliance, NGO due diligence, and leaderboards.',
    group: 'Partners',
    icon: 'csr',
    accent: 'terra',
    demoRoles: ['ngo'],
  },
  {
    label: 'Panchayat',
    path: '/panchayat',
    description: 'Hindi-first civic coordination for village officials, scheme matching, and local history.',
    group: 'Partners',
    icon: 'civic',
    accent: 'jade',
    demoRoles: ['ngo'],
  },
  {
    label: 'Crisis Mode',
    path: '/crisis-mode',
    description: 'Emergency response console with surge mobilization, requisitioning, and public briefs.',
    group: 'Command',
    icon: 'crisis',
    accent: 'amber',
    demoRoles: ['ngo'],
  },
  {
    label: 'For NGOs',
    path: '/for-ngos',
    description: 'A guided onboarding space for NGO teams entering the SevaSetu network.',
    group: 'Partners',
    icon: 'network',
    accent: 'terra',
    demoRoles: ['ngo'],
  },
];

export const marketingNavItems = appNavItems.filter((item) =>
  ['/pulse-map', '/intake', '/workspace'].includes(item.path)
);

export const roleDefaultPaths: Record<DemoRole, string> = {
  all: '/workspace',
  reporter: '/intake',
  volunteer: '/volunteer-app',
  ngo: '/workspace',
};

export function getNavItemsForRole(role: DemoRole) {
  if (role === 'all') return appNavItems;
  return appNavItems.filter((item) => item.demoRoles.includes(role));
}

export function canRoleAccessPath(role: DemoRole, pathname: string) {
  if (role === 'all') return true;
  if (pathname === '/role-access') return true;
  const item = appNavItems.find((navItem) => navItem.path === pathname);
  return item ? item.demoRoles.includes(role) : true;
}

export function getAppNavItem(pathname: string) {
  if (pathname === '/role-access') {
    return {
      label: 'Role Access',
      path: '/role-access',
      description: 'Coming soon role-based workspaces for reporters, volunteers, and NGO teams.',
      group: 'Command',
      icon: 'shield',
      accent: 'amber',
      demoRoles: ['reporter', 'volunteer', 'ngo'],
    } satisfies AppNavItem;
  }

  return appNavItems.find((item) => item.path === pathname) || appNavItems[0];
}
