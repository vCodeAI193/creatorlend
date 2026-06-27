import { SetMetadata } from "@nestjs/common";
import type { UserRole } from "@creatorlend/shared";

export const ROLES_KEY = "roles";

/** Markiert einen Endpunkt mit den erlaubten Rollen. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
