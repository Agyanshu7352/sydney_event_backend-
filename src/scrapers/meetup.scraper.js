// Meetup scraper
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const Logger = require('../utils/logger');
const { SCRAPE_CONFIG } = require('../config/constants');

class MeetupScraper {
  constructor() {
    this.name = 'meetup';
    this.baseUrl = 'https://www.meetup.com/find/?location=au--sydney&source=EVENTS';
  }

  async getBrowserConfig() {
    // Check if running on Render or other production environment
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER;

    if (isProduction) {
      // Production configuration (Render)
      return {
        args: [
          ...chromium.args,
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless
      };
    } else {
      // Local development configuration
      return {
        executablePath: process.env.CHROME_PATH ||
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
        // For Windows: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
        // For Linux: '/usr/bin/google-chrome'
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      };
    }
  }

  async scrape() {
    let browser;
    const scrapedEvents = [];

    try {
      Logger.scrapeStart(this.name);

      const browserConfig = await this.getBrowserConfig();
      browser = await puppeteer.launch(browserConfig);

      const page = await browser.newPage();
      await page.setUserAgent(SCRAPE_CONFIG.USER_AGENT);

      await page.goto(this.baseUrl, {
        waitUntil: 'networkidle2',
        timeout: SCRAPE_CONFIG.TIMEOUT_MS
      });

      // Wait for events to load
      await page.waitForSelector('[data-testid="event-card"]', { timeout: 10000 });

      // Extract event data
      const events = await page.evaluate(() => {
        const eventCards = document.querySelectorAll('[data-testid="event-card"]');
        const results = [];

        eventCards.forEach(card => {
          try {
            const linkEl = card.querySelector('a[href*="/events/"]');
            const eventUrl = linkEl?.href;

            const titleEl = card.querySelector('[data-testid="event-title"]');
            const title = titleEl?.textContent?.trim();

            const dateEl = card.querySelector('[data-testid="event-time-start"]');
            const dateText = dateEl?.textContent?.trim();

            const locationEl = card.querySelector('[data-testid="event-location"]');
            const locationText = locationEl?.textContent?.trim();

            const groupEl = card.querySelector('[data-testid="group-name"]');
            const groupName = groupEl?.textContent?.trim();

            const attendeesEl = card.querySelector('[data-testid="event-attendees"]');
            const attendeesText = attendeesEl?.textContent?.trim();

            const imageEl = card.querySelector('img');
            const imageUrl = imageEl?.src;

            if (title && eventUrl) {
              results.push({
                title,
                eventUrl,
                dateText,
                locationText,
                groupName,
                attendeesText,
                imageUrl
              });
            }
          } catch (err) {
            console.error('Error parsing meetup card:', err);
          }
        });

        return results;
      });

      // Process and normalize events
      for (const event of events) {
        try {
          const normalizedEvent = this.normalizeEvent(event);
          if (normalizedEvent) {
            scrapedEvents.push(normalizedEvent);
          }
        } catch (error) {
          Logger.warning('Failed to normalize meetup event', {
            title: event.title,
            error: error.message
          });
        }
      }

      Logger.scrapeEnd(this.name, {
        total: scrapedEvents.length
      });

    } catch (error) {
      Logger.scrapeError(this.name, error);
    } finally {
      if (browser) {
        await browser.close();
      }
    }

    return scrapedEvents;
  }

  normalizeEvent(rawEvent) {
    const startDate = this.parseDate(rawEvent.dateText);
    if (!startDate || startDate < new Date()) {
      return null;
    }

    const venue = this.parseLocation(rawEvent.locationText);

    return {
      title: rawEvent.title,
      description: `Hosted by ${rawEvent.groupName || 'Meetup Group'}. ${rawEvent.attendeesText || ''}`,
      startDate,
      endDate: null,
      venue,
      category: 'Community',
      tags: ['meetup', 'community', 'sydney'],
      imageUrl: rawEvent.imageUrl,
      price: {
        min: 0,
        max: 0,
        currency: 'AUD',
        isFree: true
      },
      source: {
        url: rawEvent.eventUrl,
        eventId: this.extractEventId(rawEvent.eventUrl)
      }
    };
  }

  parseDate(dateText) {
    try {
      if (!dateText) return null;

      const now = new Date();
      const date = new Date(dateText);

      if (isNaN(date.getTime())) return null;
      if (date < now) return null;

      return date;
    } catch (error) {
      return null;
    }
  }

  parseLocation(locationText) {
    if (!locationText) {
      return {
        name: 'Online Event',
        address: '',
        city: 'Sydney',
        state: 'NSW',
        country: 'Australia'
      };
    }

    return {
      name: locationText,
      address: locationText,
      city: 'Sydney',
      state: 'NSW',
      country: 'Australia'
    };
  }

  extractEventId(url) {
    const match = url.match(/\/events\/(\d+)/);
    return match ? match[1] : url;
  }
}

module.exports = MeetupScraper;