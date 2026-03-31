export type UserRole = 'admin' | 'employee' | 'superuser';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: any;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  createdAt: any;
}

export interface Task {
  id: string;
  projectId?: string;
  title: string;
  description: string;
  completionPercentage: number;
  deadline: string;
  assignedTo: string;
  assignedBy: string;
  date: string;
  createdAt: any;
}
