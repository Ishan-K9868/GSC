import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import type { DemoRole } from '../config/appNavigation';

type DemoRoleContextType = {
  role: DemoRole;
  setRole: (role: DemoRole) => void;
  clearRole: () => void;
  roleLabel: string;
  isRolePreview: boolean;
};

const ROLE_STORAGE_KEY = 'sevasetu-demo-role';

const roleLabels: Record<DemoRole, string> = {
  all: 'MVP Demo View',
  reporter: 'Reporter',
  volunteer: 'Volunteer',
  ngo: 'NGO Workspace',
};

const validRoles = new Set<DemoRole>(['all', 'reporter', 'volunteer', 'ngo']);

const DemoRoleContext = createContext<DemoRoleContextType | undefined>(undefined);

function readStoredRole(): DemoRole {
  if (typeof window === 'undefined') return 'all';
  const stored = window.localStorage.getItem(ROLE_STORAGE_KEY) as DemoRole | null;
  return stored && validRoles.has(stored) ? stored : 'all';
}

export function DemoRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<DemoRole>(() => readStoredRole());

  const setRole = (nextRole: DemoRole) => {
    setRoleState(nextRole);
  };

  const clearRole = () => {
    setRoleState('all');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (role === 'all') {
      window.localStorage.removeItem(ROLE_STORAGE_KEY);
      return;
    }

    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  }, [role]);

  const value = useMemo<DemoRoleContextType>(
    () => ({
      role,
      setRole,
      clearRole,
      roleLabel: roleLabels[role],
      isRolePreview: role !== 'all',
    }),
    [role]
  );

  return <DemoRoleContext.Provider value={value}>{children}</DemoRoleContext.Provider>;
}

export function useDemoRole() {
  const context = useContext(DemoRoleContext);
  if (!context) {
    throw new Error('useDemoRole must be used within DemoRoleProvider');
  }
  return context;
}
