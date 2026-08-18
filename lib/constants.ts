export const SESSION_COOKIE = "session_token";

/** RoleId values from the live `Roles` table (see project plan for how this was confirmed). */
export const ROLE = {
  SUPER_ADMIN: 1,
  MERCHANT: 2,
  CUSTOMER: 3,
} as const;

export const DASHBOARD_ROLE_IDS: number[] = [ROLE.SUPER_ADMIN, ROLE.MERCHANT];
