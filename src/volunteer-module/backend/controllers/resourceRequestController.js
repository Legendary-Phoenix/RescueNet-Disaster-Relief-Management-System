import * as requestService from '../services/resourceRequestService.js';

// Mirrors resource_type_enum exactly. There is no 'OTHER' — the official schema has
// neither the enum value nor a column to store a typed-in category name.
const CATEGORIES = ['WATER', 'FOOD', 'MEDICINE', 'HYGIENE'];
const MAX_ITEMS = 20;
const MAX_TEXT_LENGTH = 60;

function boundedText(value, label, line) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text) throw Object.assign(new Error(`Line ${line}: ${label} is required`), { status: 400 });
  if (text.length > MAX_TEXT_LENGTH) {
    throw Object.assign(new Error(`Line ${line}: ${label} must be ${MAX_TEXT_LENGTH} characters or fewer`), { status: 400 });
  }
  return text;
}

/**
 * A line is either a catalogue pick ({ resourceId }) or a custom one
 * ({ custom: { category, name, unit } }) — an item not yet in the catalogue, filed
 * under one of the four resource categories.
 */
function parseItems(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw Object.assign(new Error('items must be a non-empty array'), { status: 400 });
  }
  if (value.length > MAX_ITEMS) {
    throw Object.assign(new Error(`At most ${MAX_ITEMS} items per request`), { status: 400 });
  }

  return value.map((item, index) => {
    const line = index + 1;
    const quantity = parseInt(item?.quantity, 10);
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw Object.assign(new Error(`Line ${line}: quantity must be a whole number of at least 1`), { status: 400 });
    }

    if (item.custom) {
      const category = String(item.custom.category ?? '').trim().toUpperCase();
      if (!CATEGORIES.includes(category)) {
        throw Object.assign(new Error(`Line ${line}: category must be one of ${CATEGORIES.join(', ')}`), { status: 400 });
      }
      return {
        quantity,
        custom: {
          category,
          name: boundedText(item.custom.name, 'item name', line),
          unit: boundedText(item.custom.unit, 'unit', line),
        },
      };
    }

    if (!item.resourceId) {
      throw Object.assign(new Error(`Line ${line}: pick a resource or enter a custom one`), { status: 400 });
    }
    return { resourceId: item.resourceId, quantity };
  });
}

export async function listRequests(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { status, shelterId, scope } = req.query;
    const data = await requestService.listRequests(volunteerId, { status, shelterId, scope });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function getRequestStats(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { shelterId, scope } = req.query;
    const data = await requestService.getRequestStats(volunteerId, { shelterId, scope });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function getRequest(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { id } = req.params;
    const data = await requestService.getRequest(volunteerId, id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function createRequest(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { shelterId, eventId, items } = req.body;
    if (!shelterId) return res.status(400).json({ error: 'shelterId is required' });
    if (!eventId) return res.status(400).json({ error: 'eventId is required' });
    const parsedItems = parseItems(items);
    const requestId = await requestService.createRequest(volunteerId, { shelterId, eventId, items: parsedItems });
    const data = await requestService.getRequest(volunteerId, requestId);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function updateRequest(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { id } = req.params;
    const { items } = req.body;
    await requestService.updateRequest(volunteerId, id, { items: parseItems(items) });
    const data = await requestService.getRequest(volunteerId, id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function withdrawRequest(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const { id } = req.params;
    await requestService.withdrawRequest(volunteerId, id);
    const data = await requestService.getRequest(volunteerId, id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function listResources(req, res) {
  try {
    const data = await requestService.listResources();
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function listRequestableEvents(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const data = await requestService.listRequestableEvents(volunteerId);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

export async function getRequestOptions(req, res) {
  try {
    const volunteerId = req.query.volunteerId;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId is required' });
    const [resources, events] = await Promise.all([
      requestService.listResources(),
      requestService.listRequestableEvents(volunteerId),
    ]);
    res.json({
      resources,
      events,
      categories: CATEGORIES,
      limits: { maxItems: MAX_ITEMS, maxTextLength: MAX_TEXT_LENGTH },
      statuses: ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'FULFILLED'],
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}
