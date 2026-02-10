// Event update service
const Event = require('../models/Event');
const { generateEventHash, detectChanges } = require('../utils/hashGenerator');
const { EVENT_STATUS } = require('../config/constants');
const Logger = require('../utils/logger');
const stringSimilarity = require('string-similarity');

class EventUpdateService {

  async processScrapedEvent(scrapedEvent, sourceName) {
    try {
      // Generate content hash
      const contentHash = generateEventHash(scrapedEvent);

      // Try to find existing event by source URL (most reliable)
      let existingEvent = await Event.findOne({
        'source.url': scrapedEvent.source.url
      });

      // If not found by URL, try fuzzy matching (prevent duplicates from different sources)
      if (!existingEvent) {
        existingEvent = await this.findSimilarEvent(scrapedEvent);
      }

      if (existingEvent) {
        // Event exists - check if it needs updating
        if (existingEvent.contentHash === contentHash) {
          // No changes detected - just update lastScraped
          existingEvent.lastScraped = new Date();
          existingEvent.scrapedCount += 1;
          await existingEvent.save();

          return {
            action: 'unchanged',
            event: existingEvent,
            message: 'Event unchanged, lastScraped updated'
          };
        } else {
          // Content changed - update event
          const changes = detectChanges(existingEvent, scrapedEvent);
          
          existingEvent.title = scrapedEvent.title;
          existingEvent.description = scrapedEvent.description;
          existingEvent.startDate = scrapedEvent.startDate;
          existingEvent.endDate = scrapedEvent.endDate;
          existingEvent.venue = scrapedEvent.venue;
          existingEvent.category = scrapedEvent.category;
          existingEvent.tags = scrapedEvent.tags;
          existingEvent.imageUrl = scrapedEvent.imageUrl;
          existingEvent.price = scrapedEvent.price;
          existingEvent.contentHash = contentHash;
          existingEvent.status = EVENT_STATUS.UPDATED;
          existingEvent.changeLog.push(...changes);
          existingEvent.lastScraped = new Date();
          existingEvent.scrapedCount += 1;

          await existingEvent.save();

          Logger.info(`Event updated: ${existingEvent.title}`, { 
            changes: changes.length 
          });

          return {
            action: 'updated',
            event: existingEvent,
            changes,
            message: `Event updated with ${changes.length} changes`
          };
        }
      } else {
        // New event - create it
        const newEvent = await Event.findOneAndUpdate(
          {
            "source.name": sourceName,
            "source.eventId": scrapedEvent.source.eventId
          },
          {
            ...scrapedEvent,
            contentHash,
            status: EVENT_STATUS.NEW,
            source: {
              name: sourceName,
              url: scrapedEvent.source.url,
              eventId: scrapedEvent.source.eventId
            },
            firstScraped: new Date(),
            lastScraped: new Date(),
            scrapedCount: 1
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
          }
        );


        Logger.success(`New event created: ${newEvent.title}`);

        return {
          action: 'created',
          event: newEvent,
          message: 'New event created'
        };
      }
    } catch (error) {
      Logger.error('Error processing scraped event', { 
        error: error.message,
        event: scrapedEvent.title 
      });
      throw error;
    }
  }

  /**
   * Find similar event using fuzzy matching
   * Prevents duplicates from different sources
   */
  async findSimilarEvent(scrapedEvent) {
    const startDate = new Date(scrapedEvent.startDate);
    const dayBefore = new Date(startDate);
    dayBefore.setDate(dayBefore.getDate() - 1);
    const dayAfter = new Date(startDate);
    dayAfter.setDate(dayAfter.getDate() + 1);

    // Find events with similar date and venue
    const candidates = await Event.find({
      startDate: { $gte: dayBefore, $lte: dayAfter },
      'venue.city': scrapedEvent.venue?.city || 'Sydney'
    });

    if (candidates.length === 0) return null;

    // Calculate title similarity
    const titleSimilarities = candidates.map(candidate => ({
      event: candidate,
      similarity: stringSimilarity.compareTwoStrings(
        scrapedEvent.title.toLowerCase(),
        candidate.title.toLowerCase()
      )
    }));

    // Find best match
    const bestMatch = titleSimilarities.reduce((best, current) => 
      current.similarity > best.similarity ? current : best
    );

    // If similarity > 0.8, consider it the same event
    if (bestMatch.similarity > 0.8) {
      Logger.info('Found similar event via fuzzy matching', {
        original: bestMatch.event.title,
        scraped: scrapedEvent.title,
        similarity: bestMatch.similarity
      });
      return bestMatch.event;
    }

    return null;
  }

  /**
   * Mark events as inactive if not found in latest scrape
   * @param {String} sourceName - Source identifier
   * @param {Array} scrapedUrls - URLs found in latest scrape
   */
  async markInactiveEvents(sourceName, scrapedUrls) {
    try {
      const result = await Event.updateMany(
        {
          'source.name': sourceName,
          'source.url': { $nin: scrapedUrls },
          status: { $ne: EVENT_STATUS.INACTIVE }
        },
        {
          $set: { 
            status: EVENT_STATUS.INACTIVE,
            lastScraped: new Date()
          }
        }
      );

      if (result.modifiedCount > 0) {
        Logger.warning(`Marked ${result.modifiedCount} events as inactive from ${sourceName}`);
      }

      return result.modifiedCount;
    } catch (error) {
      Logger.error('Error marking inactive events', { error: error.message });
      throw error;
    }
  }

  /**
   * Clean up old past events
   * @param {Number} daysOld - Remove events older than this many days
   */
  async cleanupOldEvents(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Event.deleteMany({
        startDate: { $lt: cutoffDate },
        status: EVENT_STATUS.INACTIVE,
        'imported.status': false
      });

      Logger.info(`Cleaned up ${result.deletedCount} old events`);
      return result.deletedCount;
    } catch (error) {
      Logger.error('Error cleaning up old events', { error: error.message });
      throw error;
    }
  }
}

module.exports = new EventUpdateService();