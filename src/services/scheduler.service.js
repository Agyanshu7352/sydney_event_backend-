// Scheduler service
const cron = require('node-cron');
const ScraperOrchestrator = require('../scrapers/index');
const Logger = require('../utils/logger');
const EventUpdateService = require('./eventUpdate.service');

class SchedulerService {
  constructor() {
    this.jobs = [];
    this.orchestrator = new ScraperOrchestrator();
  }

  /**
   * Start scheduled scraping
   * Default: Every 4 hours
   */
  startScrapingSchedule(intervalHours = 4) {
    // Cron pattern: At minute 0 of every Nth hour
    const cronPattern = `0 */${intervalHours} * * *`;

    Logger.info(`Scheduling scraper to run every ${intervalHours} hours`);

    const job = cron.schedule(cronPattern, async () => {
      Logger.info('⏰ Scheduled scrape triggered');
      try {
        await this.orchestrator.runAll();
      } catch (error) {
        Logger.error('Scheduled scrape failed', { error: error.message });
      }
    });

    this.jobs.push({ name: 'scraper', job });

    // Run immediately on startup
    Logger.info('Running initial scrape...');
    setTimeout(() => {
      this.orchestrator.runAll().catch(err => {
        Logger.error('Initial scrape failed', { error: err.message });
      });
    }, 5000); // 5 second delay to allow server to fully start

    return job;
  }

  /**
   * Start cleanup schedule
   * Remove old inactive events daily
   */
  startCleanupSchedule() {
    // Run daily at 3 AM
    const cronPattern = '0 3 * * *';

    Logger.info('Scheduling daily cleanup at 3 AM');

    const job = cron.schedule(cronPattern, async () => {
      Logger.info('⏰ Scheduled cleanup triggered');
      try {
        await EventUpdateService.cleanupOldEvents(30); // 30 days old
      } catch (error) {
        Logger.error('Scheduled cleanup failed', { error: error.message });
      }
    });

    this.jobs.push({ name: 'cleanup', job });
    return job;
  }

  /**
   * Start all scheduled jobs
   */
  startAll() {
    const intervalHours = parseInt(process.env.SCRAPE_INTERVAL_HOURS || '4');
    
    this.startScrapingSchedule(intervalHours);
    this.startCleanupSchedule();

    Logger.success('All scheduled jobs started');
  }

  /**
   * Stop all jobs
   */
  stopAll() {
    this.jobs.forEach(({ name, job }) => {
      job.stop();
      Logger.info(`Stopped job: ${name}`);
    });
    this.jobs = [];
  }

  /**
   * Get job status
   */
  getStatus() {
    return this.jobs.map(({ name, job }) => ({
      name,
      running: job.running
    }));
  }
}

module.exports = new SchedulerService();