// Hash generator utility
const crypto = require('crypto');

/**
 * Generate a hash for event content to detect changes
 * @param {Object} event - Event object with title, date, venue, description
 * @returns {String} SHA256 hash
 */
function generateEventHash(event) {
  const contentString = [
    event.title || '',
    event.startDate ? event.startDate.toString() : '',
    event.venue?.name || '',
    event.venue?.address || '',
    event.description || '',
    event.price?.min || '',
    event.price?.max || ''
  ].join('|').toLowerCase().trim();

  return crypto
    .createHash('sha256')
    .update(contentString)
    .digest('hex');
}

/**
 * Compare two events and return changed fields
 * @param {Object} oldEvent - Previous event version
 * @param {Object} newEvent - New event version
 * @returns {Array} Array of change objects
 */
function detectChanges(oldEvent, newEvent) {
  const changes = [];
  const fieldsToCheck = [
    'title',
    'description',
    'startDate',
    'endDate',
    'venue.name',
    'venue.address',
    'imageUrl',
    'price.min',
    'price.max'
  ];

  fieldsToCheck.forEach(field => {
    const oldValue = getNestedValue(oldEvent, field);
    const newValue = getNestedValue(newEvent, field);

    if (oldValue !== newValue) {
      changes.push({
        field,
        oldValue: String(oldValue || ''),
        newValue: String(newValue || ''),
        changedAt: new Date()
      });
    }
  });

  return changes;
}

/**
 * Get nested object value by path
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Normalize event title for fuzzy matching
 */
function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = {
  generateEventHash,
  detectChanges,
  normalizeTitle
};