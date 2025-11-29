import React from 'react';
import { useAuth } from '@/shared/lib/auth/auth-context';

export type UserRole = 'Sales Agent' | 'Team Lead' | 'Super Agent';

export interface RolePermissions {
  'Sales Agent': {
    canCreateLead: boolean;
    canUpdateOwnLead: boolean;
    canLogCall: boolean;
    canManageFollowup: boolean;
    canViewOwnDashboard: boolean;
    canManageOwnSettings: boolean;
    canViewLeads: boolean;
    canAssignLeads: boolean;
    canViewTeamReport: boolean;
    canViewDSR: boolean;
  };
  'Team Lead': {
    canCreateLead: boolean;
    canUpdateOwnLead: boolean;
    canLogCall: boolean;
    canManageFollowup: boolean;
    canViewOwnDashboard: boolean;
    canManageOwnSettings: boolean;
    canViewLeads: boolean;
    canAssignLeads: boolean;
    canViewTeamReport: boolean;
    canViewDSR: boolean;
    canMonitorTeam: boolean;
  };
  'Super Agent': {
    canCreateLead: boolean;
    canUpdateOwnLead: boolean;
    canLogCall: boolean;
    canManageFollowup: boolean;
    canViewOwnDashboard: boolean;
    canManageOwnSettings: boolean;
    canViewLeads: boolean;
    canAssignLeads: boolean;
    canViewTeamReport: boolean;
    canViewDSR: boolean;
    canMonitorTeam: boolean;
    canViewAllMetrics: boolean;
  };
}

const rolePermissions: RolePermissions = {
  'Sales Agent': {
    canCreateLead: true,
    canUpdateOwnLead: true,
    canLogCall: true,
    canManageFollowup: true,
    canViewOwnDashboard: true,
    canManageOwnSettings: true,
    canViewLeads: true,
    canAssignLeads: false,
    canViewTeamReport: false,
    canViewDSR: false,
  },
  'Team Lead': {
    canCreateLead: true,
    canUpdateOwnLead: true,
    canLogCall: true,
    canManageFollowup: true,
    canViewOwnDashboard: true,
    canManageOwnSettings: true,
    canViewLeads: true,
    canAssignLeads: true,
    canViewTeamReport: true,
    canViewDSR: false,
    canMonitorTeam: true,
  },
  'Super Agent': {
    canCreateLead: true,
    canUpdateOwnLead: true,
    canLogCall: true,
    canManageFollowup: true,
    canViewOwnDashboard: true,
    canManageOwnSettings: true,
    canViewLeads: true,
    canAssignLeads: true,
    canViewTeamReport: true,
    canViewDSR: true,
    canMonitorTeam: true,
    canViewAllMetrics: true,
  },
};

/**
 * Hook to check user role and permissions
 */
export function useRoleBasedAccess() {
  const { user } = useAuth();

  const hasRole = (roleName: string): boolean => {
    return user?.role === roleName;
  };

  const hasAnyRole = (roleNames: string[]): boolean => {
    return roleNames.includes(user?.role || '');
  };

  const hasPermission = (permission: keyof (typeof rolePermissions)[UserRole]): boolean => {
    if (!user?.role) return false;

    const userRole = user.role as UserRole;
    const permissions = rolePermissions[userRole];
    return permissions[permission] || false;
  };

  const isSalesAgent = (): boolean => hasRole('Sales Agent');
  const isTeamLead = (): boolean => hasRole('Team Lead');
  const isSuperAgent = (): boolean => hasRole('Super Agent');
  const isManager = (): boolean => hasAnyRole(['Team Lead', 'Super Agent']);
  const isAdmin = (): boolean => hasRole('Super Agent');

  return {
    user,
    hasRole,
    hasAnyRole,
    hasPermission,
    isSalesAgent,
    isTeamLead,
    isSuperAgent,
    isManager,
    isAdmin,
  };
}

/**
 * HOC to protect components based on role
 */
export function withRoleProtection<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles: string[]
) {
  return function ProtectedComponent(props: P) {
    const { user } = useAuth();

    if (!user || !requiredRoles.includes(user.role)) {
      return null;
    }

    return React.createElement(Component, props);
  };
}

/**
 * HOC to protect components based on permission
 */
export function withPermissionProtection<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: string
) {
  return function ProtectedComponent(props: P) {
    const { hasPermission } = useRoleBasedAccess();

    if (!hasPermission(requiredPermission as any)) {
      return null;
    }

    return React.createElement(Component, props);
  };
}
