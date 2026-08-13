import { createContext, useContext } from 'react';

/**
 * Shared state for the volunteer shell: who is signed in, which shelters they are
 * assigned to, and which one they are currently working in. The provider lives in
 * components/Layout.jsx so the choice survives navigation between the four screens.
 *
 * An empty activeShelterId means "all my assigned shelters" — pages omit the
 * shelterId query param entirely in that case.
 */
export const VolunteerContext = createContext(null);

export const ACTIVE_SHELTER_KEY = 'rescuenet_active_shelter';

export function useVolunteer() {
  const ctx = useContext(VolunteerContext);
  if (!ctx) throw new Error('useVolunteer must be used inside the volunteer Layout');
  return ctx;
}

/** Builds a query string, dropping the shelter filter when "all shelters" is active. */
export function volunteerQuery(volunteerId, activeShelterId, extra = {}) {
  const params = new URLSearchParams({ volunteerId });
  if (activeShelterId) params.set('shelterId', activeShelterId);
  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}
