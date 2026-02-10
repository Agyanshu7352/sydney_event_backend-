// Logger utility
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'scraper.log');

class Logger {
  static log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...data
    };

    // Console output with color
    const colors = {
      INFO: '\x1b[36m',    // Cyan
      SUCCESS: '\x1b[32m', // Green
      WARNING: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m',   // Red
      RESET: '\x1b[0m'
    };

    console.log(
      `${colors[level] || ''}[${timestamp}] ${level}: ${message}${colors.RESET}`,
      Object.keys(data).length > 0 ? data : ''
    );

    // File output
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }

  static info(message, data) {
    this.log('INFO', message, data);
  }

  static success(message, data) {
    this.log('SUCCESS', message, data);
  }

  static warning(message, data) {
    this.log('WARNING', message, data);
  }

  static error(message, data) {
    this.log('ERROR', message, data);
  }

  static scrapeStart(source) {
    this.info(`Starting scrape for ${source}`);
  }

  static scrapeEnd(source, stats) {
    this.success(`Completed scrape for ${source}`, stats);
  }

  static scrapeError(source, error) {
    this.error(`Scrape failed for ${source}`, { error: error.message });
  }
}

module.exports = Logger;