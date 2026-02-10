module.exports = {
  EVENT_STATUS: {
    NEW: 'new',
    UPDATED: 'updated',
    INACTIVE: 'inactive',
    IMPORTED: 'imported'
  },

  EVENT_CATEGORIES: [
    'Music',
    'Arts & Culture',
    'Sports & Fitness',
    'Food & Drink',
    'Community',
    'Business & Professional',
    'Film & Media',
    'Charity & Causes',
    'Other'
  ],

  CITIES: [
    { name: 'Sydney', country: 'Australia' },
    // Scalable for future cities
  ],

  SCRAPER_SOURCES: {
    EVENTBRITE: 'eventbrite',
    MEETUP: 'meetup',
    TIMEOUT: 'timeout'
  },

  SCRAPE_CONFIG: {
    TIMEOUT_MS: 30000,
    MAX_RETRIES: 3,
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
};