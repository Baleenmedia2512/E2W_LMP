import { Session } from 'next-auth';

export type RoleName = 'Agent' | 'SuperAgent' | 'Finance' | 'HR' | 'Procurement';

export interface Permission {
  read: boolean | 'own' | 'all';
  create?: boolean;
  update?: boolean;
  delete?: boolean;
  export?: boolean;
  assign?: boolean;
}

export interface RolePermissions {
  leads: Permission;
  dashboard: Permission;
  dsr: Permission;
  calls?: Permission;
  followups?: Permission;
  users?: Permission;
  reports?: Permission;
}

export const ROLE_PERMISSIONS: Record<RoleName, RolePermissions> = {
  Agent: {
    leads: { read: 'own', create: false, update: true, delete: false },
    dashboard: { read: true },
    dsr: { read: 'own' },
    calls: { read: true, create: true },
    followups: { read: true, create: true },
  },
  SuperAgent: {
    leads: { read: 'all', create: true, update: true, delete: true },
    dashboard: { read: 'all' },
    dsr: { read: 'all', export: true },
    calls: { read: 'all', create: true },
    followups: { read: 'all', create: true },
    users: { read: true, assign: true },
  },
  Finance: {
    leads: { read: 'all' },
    dashboard: { read: true },
    dsr: { read: 'all', export: true },
    reports: { read: true },
  },
  HR: {
    leads: { read: false },
    dashboard: { read: true },
    dsr: { read: 'all' },
    users: { read: true, create: true, update: true },
    reports: { read: true },
  },
  Procurement: {
    leads: { read: 'all' },
    dashboard: { read: true },
    dsr: { read: false },
    reports: { read: true },
  },
};

export function hasPermission(
  session: Session | null,
  resource: keyof RolePermissions,
  action: keyof Permission
): boolean {
  if (!session?.user?.role) return false;

  const roleName = session.user.role as RoleName;
  const permissions = ROLE_PERMISSIONS[roleName];

  if (!permissions || !permissions[resource]) return false;

  const resourcePermission = permissions[resource];
  const permissionValue = resourcePermission[action];

  if (typeof permissionValue === 'boolean') return permissionValue;
  if (permissionValue === 'own' || permissionValue === 'all') return true;

  return false;
}

export function canAccessResource(
  session: Session | null,
  resource: keyof RolePermissions,
  ownerId?: string
): boolean {
  if (!session?.user?.role) return false;

  const roleName = session.user.role as RoleName;
  const permissions = ROLE_PERMISSIONS[roleName];

  if (!permissions || !permissions[resource]) return false;

  const resourcePermission = permissions[resource];
  const readPermission = resourcePermission.read;

  if (readPermission === true || readPermission === 'all') return true;
  if (readPermission === 'own' && ownerId === session.user.id) return true;

  return false;
}

export function isSuperAgent(session: Session | null): boolean {
  return session?.user?.role === 'SuperAgent';
}

export function isAgent(session: Session | null): boolean {
  return session?.user?.role === 'Agent' || session?.user?.role === 'SuperAgent';
}
