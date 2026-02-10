const puppeteer = require('puppeteer');
const Logger = require('../utils/logger');
const { SCRAPE_CONFIG } = require('../config/constants');

class EventbriteScraper {
  constructor() {
    this.name = 'eventbrite';
    this.baseUrl = 'https://www.eventbrite.com.au/d/australia--sydney/events/';
  }

  async scrape() {
    let browser;
    const scrapedEvents = [];

    try {
      Logger.scrapeStart(this.name);

      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage'
        ]
      });

      const page = await browser.newPage();

      // Set realistic viewport and headers
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      // Set extra headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-AU,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      });

      Logger.info('Navigating to Eventbrite...');

      await page.goto(this.baseUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      // Wait a bit for JavaScript to render
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Try to find events with multiple strategies
      Logger.info('Looking for event elements...');

      // Wait for any content to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract event data with flexible selectors
      const events = await page.evaluate(() => {
        const results = [];

        const eventLinks = Array.from(document.querySelectorAll('a[href*="/e/"]'));

        console.log(`Found ${eventLinks.length} event links`);

        // Group by unique event URL to avoid duplicates
        const uniqueEvents = new Map();

        eventLinks.forEach(link => {
          const eventUrl = link.href;

          if (!uniqueEvents.has(eventUrl)) {
            // Find the parent card/container
            let card = link.closest('article') ||
              link.closest('[class*="card"]') ||
              link.closest('div[class*="event"]') ||
              link.closest('li') ||
              link.parentElement?.parentElement;

            if (!card) card = link;

            try {
              // Extract title from link or card
              const title = link.textContent?.trim() ||
                link.getAttribute('aria-label') ||
                card.querySelector('h1, h2, h3, h4')?.textContent?.trim() ||
                'Event';

              // Skip if title is too short or generic
              if (!title || title.length < 3 || title === 'Event') {
                return;
              }

              // Try to find date
              let dateText = '';
              const dateElements = card.querySelectorAll('[class*="date"], [class*="time"], time, [datetime]');
              for (const el of dateElements) {
                const text = el.textContent?.trim();
                if (text && text.length > 3) {
                  dateText = text;
                  break;
                }
                const datetime = el.getAttribute('datetime');
                if (datetime) {
                  dateText = datetime;
                  break;
                }
              }

              // Try to find location
              let locationText = '';
              const locationElements = card.querySelectorAll('[class*="location"], [class*="venue"], [class*="address"]');
              for (const el of locationElements) {
                const text = el.textContent?.trim();
                if (text && text.length > 2 && !text.includes('Online')) {
                  locationText = text;
                  break;
                }
              }

              // Try to find image
              let imageUrl = '';
              const img = card.querySelector('img');
              if (img) {
                imageUrl = img.src || img.getAttribute('data-src') || '';
              }

              // Try to find price
              let priceText = '';
              const priceElements = card.querySelectorAll('[class*="price"], [class*="cost"]');
              for (const el of priceElements) {
                const text = el.textContent?.trim();
                if (text) {
                  priceText = text;
                  break;
                }
              }

              // Try to find description
              let description = '';
              const descElements = card.querySelectorAll('p, [class*="description"], [class*="summary"]');
              for (const el of descElements) {
                const text = el.textContent?.trim();
                if (text && text.length > 10 && text.length < 500) {
                  description = text;
                  break;
                }
              }

              uniqueEvents.set(eventUrl, {
                title,
                eventUrl,
                dateText,
                locationText,
                imageUrl,
                priceText,
                description
              });

            } catch (err) {
              console.error('Error extracting event data:', err.message);
            }
          }
        });

        return Array.from(uniqueEvents.values());
      });

      Logger.info(`Extracted ${events.length} raw events from page`);

      // Process and normalize events
      for (const event of events) {
        try {
          const normalizedEvent = this.normalizeEvent(event);
          if (normalizedEvent) {
            scrapedEvents.push(normalizedEvent);
          }
        } catch (error) {
          Logger.warning('Failed to normalize event', {
            title: event.title,
            error: error.message
          });
        }
      }

      Logger.scrapeEnd(this.name, {
        found: events.length,
        normalized: scrapedEvents.length,
        successful: scrapedEvents.length
      });

    } catch (error) {
      Logger.scrapeError(this.name, error);
      console.error('Eventbrite scraper error:', error);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return scrapedEvents;
  }

  normalizeEvent(rawEvent) {
    try {
      // Parse date
      const startDate = this.parseDate(rawEvent.dateText);

      // If no valid date, use a default future date
      let finalDate = startDate;
      if (!startDate || startDate < new Date()) {
        // Use date from 7 days in future as default
        finalDate = new Date();
        finalDate.setDate(finalDate.getDate() + 7);
      }

      // Parse location
      const venue = this.parseLocation(rawEvent.locationText);

      // Parse price
      const price = this.parsePrice(rawEvent.priceText);

      // Determine category from title/description
      const category = this.detectCategory(rawEvent.title + ' ' + rawEvent.description);

      return {
        title: rawEvent.title,
        description: rawEvent.description || `Exciting event in ${venue.city}. Check Eventbrite for full details.`,
        startDate: finalDate,
        endDate: null,
        venue,
        category,
        tags: this.extractTags(rawEvent.title + ' ' + rawEvent.description),
        imageUrl: rawEvent.imageUrl || '',
        price,
        source: {
          url: rawEvent.eventUrl,
          eventId: this.extractEventId(rawEvent.eventUrl)
        }
      };
    } catch (error) {
      Logger.error('Error normalizing event', { error: error.message });
      return null;
    }
  }

  parseDate(dateText) {
    try {
      if (!dateText) return null;

      const now = new Date();

      // Try multiple date parsing strategies

      // Strategy 1: ISO datetime attribute
      if (dateText.includes('T') || dateText.includes('-')) {
        const date = new Date(dateText);
        if (!isNaN(date.getTime()) && date > now) {
          return date;
        }
      }

      // Strategy 2: Natural language parsing
      // "Mon, Feb 12" format
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const lowerText = dateText.toLowerCase();

      for (let i = 0; i < monthNames.length; i++) {
        if (lowerText.includes(monthNames[i])) {
          const dayMatch = dateText.match(/\d{1,2}/);
          if (dayMatch) {
            const day = parseInt(dayMatch[0]);
            const year = now.getFullYear();
            const date = new Date(year, i, day);

            // If date is in past, try next year
            if (date < now) {
              date.setFullYear(year + 1);
            }

            return date;
          }
        }
      }

      // Strategy 3: Try direct Date parsing
      const date = new Date(dateText);
      if (!isNaN(date.getTime())) {
        if (date < now) {
          date.setFullYear(now.getFullYear() + 1);
        }
        return date;
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  parseLocation(locationText) {
    if (!locationText || locationText.length < 2) {
      return {
        name: 'TBA',
        address: '',
        city: 'Sydney',
        state: 'NSW',
        country: 'Australia'
      };
    }

    // Clean up location text
    const cleaned = locationText.replace(/\s+/g, ' ').trim();

    // Split by common separators
    const parts = cleaned.split(/[•·,|]/g).map(p => p.trim()).filter(p => p);

    return {
      name: parts[0] || 'Venue TBA',
      address: parts.slice(1).join(', ') || '',
      city: 'Sydney',
      state: 'NSW',
      country: 'Australia'
    };
  }

  parsePrice(priceText) {
    if (!priceText || priceText.toLowerCase().includes('free')) {
      return {
        min: 0,
        max: 0,
        currency: 'AUD',
        isFree: true
      };
    }

    try {
      // Extract all numbers from price text
      const numbers = priceText.match(/\d+(?:[.,]\d+)?/g);

      if (!numbers || numbers.length === 0) {
        return { min: 0, max: 0, currency: 'AUD', isFree: false };
      }

      const prices = numbers.map(n => parseFloat(n.replace(',', '')));

      return {
        min: Math.min(...prices),
        max: Math.max(...prices),
        currency: 'AUD',
        isFree: false
      };
    } catch (error) {
      return { min: 0, max: 0, currency: 'AUD', isFree: false };
    }
  }

  detectCategory(text) {
    const keywords = {
      'Music': ['concert', 'music', 'band', 'dj', 'festival', 'gig', 'live music', 'performance'],
      'Arts & Culture': ['art', 'gallery', 'museum', 'theatre', 'theater', 'culture', 'exhibition', 'show'],
      'Food & Drink': ['food', 'wine', 'beer', 'dining', 'restaurant', 'tasting', 'cooking', 'chef'],
      'Sports & Fitness': ['sport', 'fitness', 'yoga', 'run', 'marathon', 'gym', 'workout', 'training'],
      'Business & Professional': ['business', 'networking', 'conference', 'seminar', 'workshop', 'professional', 'career'],
      'Community': ['community', 'meetup', 'social', 'charity', 'volunteer', 'fundraiser']
    };

    const lowerText = text.toLowerCase();

    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => lowerText.includes(word))) {
        return category;
      }
    }

    return 'Other';
  }

  extractTags(text) {
    const commonTags = ['sydney', 'event', 'australia'];
    const lowerText = text.toLowerCase();

    const tagKeywords = ['music', 'art', 'food', 'sport', 'tech', 'business', 'family', 'outdoor', 'indoor', 'free', 'weekend'];

    const foundTags = tagKeywords.filter(tag => lowerText.includes(tag));

    return [...new Set([...commonTags, ...foundTags])]; // Remove duplicates
  }

  extractEventId(url) {
    try {
      const match = url.match(/\/e\/([^\/\?]+)/);
      return match ? match[1] : url.split('/').pop().split('?')[0];
    } catch (error) {
      return url;
    }
  }
}

module.exports = EventbriteScraper;