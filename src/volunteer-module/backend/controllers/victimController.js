import * as fieldService from '../services/volunteerFieldService.js';

const VICTIM_STATUSES = ['CHECKED_IN', 'MEDICAL_ATTENTION', 'TRANSFERRED', 'DISCHARGED'];
const GENDERS = ['MALE', 'FEMALE'];
const MAX_NEEDS = 10;
const MAX_NEED_LENGTH = 60;
const MAX_CUSTOM_NEEDS = 3;
// Shown as the checkbox grid on the registration form.
const PRESET_NEEDS = [
  'INFANT_CARE', 'ELDERLY_MOBILITY', 'MEDICAL_SUPPLIES', 'DIETARY_RESTRICTIONS',
  'PREGNANCY', 'DISABILITY_SUPPORT', 'CHRONIC_ILLNESS', 'UNACCOMPANIED_MINOR',
];

// Retired from the picker but still carried by already-registered victims. They stay
// on the whitelist so editing an old record doesn't spend its custom-need allowance.
const LEGACY_NEEDS = [
  'WHEELCHAIR', 'VISUAL_IMPAIRMENT', 'HEARING_IMPAIRMENT', 'DIABETES',
  'HEART_CONDITION', 'PREGNANT', 'INFANT', 'ELDERLY', 'SEVERE_ALLERGY',
  'MENTAL_HEALTH', 'DIALYSIS', 'OXYGEN_DEPENDENT',
];

// Anything outside this set counts against MAX_CUSTOM_NEEDS, so every tag the form
// can offer as a preset has to be in here.
const KNOWN_NEEDS = new Set([...PRESET_NEEDS, ...LEGACY_NEEDS]);

function parseSpecialNeeds(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw Object.assign(new Error('specialNeeds must be an array'), { status: 400 });
  if (value.length > MAX_NEEDS) throw Object.assign(new Error(`At most ${MAX_NEEDS} special needs allowed`), { status: 400 });

  const seen = new Set();
  const tags = [];
  let customCount = 0;

  for (const entry of value) {
    if (typeof entry !== 'string') throw Object.assign(new Error('Every special need must be a string'), { status: 400 });
    const tag = entry.trim().replace(/\s+/g, ' ');
    if (!tag) continue;
    if (tag.length > MAX_NEED_LENGTH) throw Object.assign(new Error(`Each need must be ${MAX_NEED_LENGTH} chars or fewer`), { status: 400 });
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (!KNOWN_NEEDS.has(tag.toUpperCase())) {
      customCount++;
      if (customCount > MAX_CUSTOM_NEEDS) throw Object.assign(new Error(`At most ${MAX_CUSTOM_NEEDS} custom needs allowed`), { status: 400 });
    }
    tags.push(tag);
  }
  return tags;
}

export async function registerVictim(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { name, age, gender, contactNumber, shelterId, eventId, status, specialNeeds } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });
    if (!shelterId) return res.status(400).json({ error: 'shelterId is required' });
    if (!eventId) return res.status(400).json({ error: 'eventId is required' });
    if (gender && !GENDERS.includes(gender)) return res.status(400).json({ error: `gender must be one of: ${GENDERS.join(', ')}` });
    if (status && !VICTIM_STATUSES.includes(status)) return res.status(400).json({ error: `status must be one of: ${VICTIM_STATUSES.join(', ')}` });
    const parsedNeeds = parseSpecialNeeds(specialNeeds);
    const data = await fieldService.registerVictim(volunteerId, {
      name: name.trim().slice(0, 100),
      age: age != null ? parseInt(age, 10) : null,
      gender: gender || null,
      contactNumber: contactNumber ? String(contactNumber).slice(0, 20) : null,
      shelterId,
      eventId,
      status,
      specialNeeds: parsedNeeds,
    });
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function listVictims(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { shelterId, status, search, scope } = req.query;
    const data = await fieldService.listVictims(volunteerId, { shelterId, status, search, scope });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function getVictimStats(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { shelterId, scope } = req.query;
    const data = await fieldService.getVictimStats(volunteerId, { shelterId, scope });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function updateVictimStatus(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { id } = req.params;
    const { status } = req.body;
    if (!status || !VICTIM_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${VICTIM_STATUSES.join(', ')}` });
    }
    const data = await fieldService.updateVictimStatus(volunteerId, id, status);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function assignVictimShelter(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { id } = req.params;
    const { shelterId } = req.body;
    if (!shelterId) return res.status(400).json({ error: 'shelterId is required' });
    const data = await fieldService.assignVictimToShelter(volunteerId, id, shelterId);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function getVictimOptions(req, res) {
  res.json({
    statuses: VICTIM_STATUSES,
    genders: GENDERS,
    specialNeeds: PRESET_NEEDS,
    limits: { maxCustomNeeds: MAX_CUSTOM_NEEDS, maxNeedLength: MAX_NEED_LENGTH, maxNeeds: MAX_NEEDS },
  });
}
