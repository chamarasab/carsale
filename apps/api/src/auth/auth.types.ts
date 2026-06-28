import { UserRole } from '../users/user.schema';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};
