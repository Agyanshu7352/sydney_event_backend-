// Scrapers index
const EventbriteScraper = require('./eventbrite.scraper');
const MeetupScraper = require('./meetup.scraper');
const TimeOutScraper = require('./timeout.scraper');
const EventUpdateService = require('../services/eventUpdate.service');
const Logger = require('../utils/logger');
const connectDB = require('../config/database');

class ScraperOrchestrator {
  constructor() {
    this.scrapers = [
      new EventbriteScraper(),
      new MeetupScraper(),
      new TimeOutScraper()
    ];
  }

  /**
   * Run all scrapers and update database
   */
  async runAll() {
    const startTime = Date.now();
    const stats = {
      totalScraped: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      inactive: 0,
      errors: 0
    };

    Logger.info('🚀 Starting scraping process for all sources');

    for (const scraper of this.scrapers) {
      try {
        await this.runScraper(scraper, stats);
      } catch (error) {
        Logger.error(`Failed to run scraper: ${scraper.name}`, { 
          error: error.message 
        });
        stats.errors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    Logger.success('✅ Scraping process completed', {
      duration: `${duration}s`,
      ...stats
    });

    return stats;
  }

  /**
   * Run a single scraper
   */
  async runScraper(scraper, stats) {
    try {
      Logger.info(`Running ${scraper.name} scraper...`);

      // Scrape events
      const scrapedEvents = await scraper.scrape();
      stats.totalScraped += scrapedEvents.length;

      if (scrapedEvents.length === 0) {
        Logger.warning(`No events found by ${scraper.name}`);
        return;
      }

      const scrapedUrls = [];

      // Process each scraped event
      for (const event of scrapedEvents) {
        try {
          const result = await EventUpdateService.processScrapedEvent(
            event,
            scraper.name
          );

          scrapedUrls.push(event.source.url);

          // Update stats
          if (result.action === 'created') stats.created++;
          else if (result.action === 'updated') stats.updated++;
          else if (result.action === 'unchanged') stats.unchanged++;

        } catch (error) {
          Logger.error('Error processing event', {
            title: event.title,
            error: error.message
          });
          stats.errors++;
        }
      }

      // Mark events not found in this scrape as inactive
      const inactiveCount = await EventUpdateService.markInactiveEvents(
        scraper.name,
        scrapedUrls
      );
      stats.inactive += inactiveCount;

      Logger.success(`${scraper.name} completed`, {
        scraped: scrapedEvents.length,
        created: stats.created,
        updated: stats.updated,
        inactive: inactiveCount
      });

    } catch (error) {
      Logger.error(`Error in ${scraper.name}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Run a specific scraper by name
   */
  async runOne(scraperName) {
    const scraper = this.scrapers.find(s => s.name === scraperName);
    
    if (!scraper) {
      throw new Error(`Scraper not found: ${scraperName}`);
    }

    const stats = {
      totalScraped: 0,
      created: 0,
      updated: 0,
      unchanged: 0,
      inactive: 0,
      errors: 0
    };

    await this.runScraper(scraper, stats);
    return stats;
  }
}

// CLI execution
if (require.main === module) {
  (async () => {
    try {
      // Load environment variables
      require('dotenv').config();

      // Connect to database
      await connectDB();

      // Run scrapers
      const orchestrator = new ScraperOrchestrator();
      
      // Check if specific scraper requested
      const scraperName = process.argv[2];
      
      if (scraperName) {
        await orchestrator.runOne(scraperName);
      } else {
        await orchestrator.runAll();
      }

      process.exit(0);
    } catch (error) {
      Logger.error('Fatal error in scraper', { error: error.message });
      process.exit(1);
    }
  })();
}

module.exports = ScraperOrchestrator;