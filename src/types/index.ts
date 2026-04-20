export type UserRole = "ADMIN" | "STUDENT";

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SessionWithSchedule {
  id: string;
  date: Date;
  startTime: string | null;
  duration: number | null;
  maxCapacity: number | null;
  status: string;
  cancelReason: string | null;
  classSchedule: {
    id: string;
    name: string;
    description: string | null;
    startTime: string;
    duration: number;
    maxCapacity: number;
    days: string[];
  };
  _count?: {
    bookings: number;
  };
  userBooking?: {
    id: string;
    status: string;
  } | null;
}

export interface StudentWithUser {
  id: string;
  firstName: string;
  lastName: string;
  status: string;
  belt: string;
  beltGrade: number;
  user: {
    email: string;
  };
  plans: Array<{
    isActive: boolean;
    plan: {
      name: string;
    };
  }>;
}
