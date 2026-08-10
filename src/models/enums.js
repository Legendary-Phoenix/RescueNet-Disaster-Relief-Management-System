export const UserRole = Object.freeze({
  ADMIN: 'ADMIN',
  RELIEF_ORG: 'RELIEF_ORG',
  VOLUNTEER: 'VOLUNTEER',
  PUBLIC: 'PUBLIC',
});

export const DisasterType = Object.freeze({
  FLOOD: 'FLOOD',
  LANDSLIDE: 'LANDSLIDE',
  SEVERE_STORM: 'SEVERE_STORM',
  EARTHQUAKE: 'EARTHQUAKE',
});

export const DisasterTypeLabel = Object.freeze({
  FLOOD: 'Flood',
  LANDSLIDE: 'Landslide',
  SEVERE_STORM: 'Severe Storm',
  EARTHQUAKE: 'Earthquake',
});

export const Severity = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

export const EventStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  RESOLVED: 'RESOLVED',
});

export const ShelterStatus = Object.freeze({
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
});

export const Gender = Object.freeze({
  MALE: 'MALE',
  FEMALE: 'FEMALE',
});

export const VolunteerStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

export const OrgStatus = Object.freeze({
  APPROVED: 'APPROVED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  REVOKED: 'REVOKED',
});

export const ResourceType = Object.freeze({
  WATER: 'WATER',
  FOOD: 'FOOD',
  MEDICINE: 'MEDICINE',
  HYGIENE: 'HYGIENE',
});

export const RequestStatus = Object.freeze({
  APPROVED: 'APPROVED',
  PENDING: 'PENDING',
  REJECTED: 'REJECTED',
  REVOKED: 'REVOKED',
  FULFILLED: 'FULFILLED',
});

export const TaskStatus = Object.freeze({
  IN_PROGRESS: 'IN_PROGRESS',
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  REVOKED: 'REVOKED',
});

export const ReportStatus = Object.freeze({
  OPEN: 'OPEN',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
});
