// src/constants/team-roles.ts
import { EmployeeRole } from "@prisma/client";

/**
 * The only roles that may be added as *members* of a team (and therefore be
 * assigned tasks within that team). Managers, SuperAdmins, and HR oversee
 * teams but are intentionally excluded from this list — they administer
 * teams rather than being staffed on them.
 *
 * This is the single source of truth for the restriction; both the
 * validation layer (Zod) and the service layer re-check against this array
 * so the rule can never be bypassed by calling the service directly.
 */
export const TEAM_MEMBER_ROLES = [
  EmployeeRole.Developer,
  EmployeeRole.Marketing,
  EmployeeRole.CustomStaff,
] as const;

export type TeamMemberRole = (typeof TEAM_MEMBER_ROLES)[number];

export const isTeamMemberRole = (
  role: EmployeeRole | string
): role is TeamMemberRole =>
  (TEAM_MEMBER_ROLES as readonly string[]).includes(role);

/**
 * Roles that are allowed to administer teams (create teams, add/remove
 * members, create/reassign tasks for any team they own). SuperAdmin and HR
 * can act on any team; Manager can only act on teams they personally own
 * (enforced separately via `assertTeamOwnership`).
 */
export const TEAM_ADMIN_ROLES = [
  EmployeeRole.SuperAdmin,
  EmployeeRole.HR,
  EmployeeRole.Manager,
] as const;
