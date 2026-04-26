export type AppointmentStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_ROUTE"
  | "IN_SERVICE"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Customer {
  id: number;
  fullName: string;
  phoneE164: string | null;
  email: string | null;
}

export interface Neighborhood {
  id: number;
  locality: string;
  name: string;
}

export interface Address {
  id: number;
  line1: string;
  mapsUrl: string | null;
  neighborhood: Neighborhood | null;
}

export interface ServiceCategory {
  id: number;
  code: string;
  name: string;
}

export interface Service {
  id: number;
  name: string;
  category: ServiceCategory;
}

export interface PlannedLine {
  id: number;
  quantity: number;
  service: Service;
}

export interface Appointment {
  id: number;
  status: AppointmentStatus;
  startAt: string | null;
  endAt: string | null;
  requestedStartAt: string | null;
  requestedTimeText: string | null;
  leadName: string | null;
  leadPhoneE164: string | null;
  notes: string | null;
  createdAt: string;
  customer: Customer;
  address: (Address & { neighborhood: Neighborhood | null }) | null;
  plannedServices: PlannedLine[];
}

export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  phoneE164: string | null;
  roles: string[];
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
