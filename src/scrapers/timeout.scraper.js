// Timeout scraper
const axios = require('axios');
const cheerio = require('cheerio');
const Logger = require('../utils/logger');

class TimeOutScraper {
  constructor() {
    this.name = 'timeout';
    this.baseUrl = 'https://www.timeout.com/sydney/things-to-do/things-to-do-in-sydney-this-week';
  }

  async scrape() {
    const scrapedEvents = [];

    try {
      Logger.scrapeStart(this.name);

      // Use axios + cheerio for static content (faster than Puppeteer)
      const response = await axios.get(this.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);

      // Find event cards (adjust selectors based on actual site structure)
      $('.event-card, .article-card, [class*="event"]').each((index, element) => {
        try {
          const $el = $(element);
          
          const title = $el.find('h3, h2, .title, [class*="title"]').first().text().trim();
          const link = $el.find('a').first().attr('href');
          const description = $el.find('p, .description, [class*="description"]').first().text().trim();
          const imageUrl = $el.find('img').first().attr('src');

          if (title && link) {
            const eventUrl = link.startsWith('http') ? link : `https://www.timeout.com${link}`;
            
            scrapedEvents.push({
              title,
              eventUrl,
              description,
              imageUrl
            });
          }
        } catch (err) {
          // Skip problematic cards
        }
      });

      // Normalize events
      const normalizedEvents = scrapedEvents
        .map(event => this.normalizeEvent(event))
        .filter(event => event !== null);

      Logger.scrapeEnd(this.name, { 
        total: normalizedEvents.length 
      });

      return normalizedEvents;

    } catch (error) {
      Logger.scrapeError(this.name, error);
      return [];
    }
  }

  normalizeEvent(rawEvent) {
    // TimeOut doesn't always have specific dates, so we use a default upcoming date
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 3); // Default to 3 days from now

    return {
      title: rawEvent.title,
      description: rawEvent.description || 'Check TimeOut Sydney for full details',
      startDate,
      endDate: null,
      venue: {
        name: 'Various Locations',
        address: 'Sydney',
        city: 'Sydney',
        state: 'NSW',
        country: 'Australia'
      },
      category: this.detectCategory(rawEvent.title + ' ' + rawEvent.description),
      tags: ['timeout', 'sydney', 'featured'],
      imageUrl: rawEvent.imageUrl,
      price: {
        min: 0,
        max: 0,
        currency: 'AUD',
        isFree: false
      },
      source: {
        url: rawEvent.eventUrl,
        eventId: this.extractEventId(rawEvent.eventUrl)
      }
    };
  }

  detectCategory(text) {
    const keywords = {
      'Food & Drink': ['restaurant', 'bar', 'food', 'drink', 'dining', 'cafe'],
      'Arts & Culture': ['art', 'museum', 'gallery', 'theatre', 'culture'],
      'Music': ['concert', 'music', 'band', 'gig', 'festival'],
      'Sports & Fitness': ['sport', 'fitness', 'run', 'outdoor']
    };

    const lowerText = text.toLowerCase();
    
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => lowerText.includes(word))) {
        return category;
      }
    }

    return 'Other';
  }

  extractEventId(url) {
    const parts = url.split('/');
    return parts[parts.length - 1] || url;
  }
}

module.exports = TimeOutScraper;