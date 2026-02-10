// Seed script to populate database with sample events for testing
const mongoose = require('mongoose');
const crypto = require('crypto');
const Event = require('../models/Event');
require('dotenv').config();

// Helper function to generate content hash
function generateContentHash(event) {
    const content = JSON.stringify({
        title: event.title,
        startDate: event.startDate,
        venue: event.venue
    });
    return crypto.createHash('md5').update(content).digest('hex');
}

// Helper to get future dates
function getFutureDate(daysFromNow, hour = 18, minute = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(hour, minute, 0, 0);
    return date;
}

const sampleEvents = [
    {
        title: "Sydney Harbour Jazz Festival 2026",
        description: "Experience world-class jazz performances against the stunning backdrop of Sydney Harbour. Featuring international and local artists across multiple stages.",
        startDate: getFutureDate(30, 18, 0), // 30 days from now
        endDate: getFutureDate(30, 23, 0),
        venue: {
            name: "Sydney Opera House",
            address: "Bennelong Point, Sydney NSW 2000",
            city: "Sydney",
            state: "NSW",
            country: "Australia",
            coordinates: { lat: -33.8568, lng: 151.2153 }
        },
        category: "Music",
        tags: ["jazz", "music", "festival", "live", "sydney"],
        price: { min: 75, max: 250, currency: "AUD", isFree: false },
        imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800",
        source: {
            name: "Eventbrite",
            url: "https://www.eventbrite.com.au/e/sydney-jazz-festival-001",
            eventId: "sample-jazz-001"
        },
        status: "new",
        lastScraped: new Date()
    },
    {
        title: "Vivid Sydney Light Festival",
        description: "The world's largest festival of light, music and ideas transforms Sydney into a creative canvas. Spectacular light installations across the city.",
        startDate: getFutureDate(90, 18, 0), // 90 days from now
        endDate: getFutureDate(112, 23, 0),
        venue: {
            name: "Circular Quay",
            address: "Circular Quay, Sydney NSW 2000",
            city: "Sydney",
            state: "NSW",
            country: "Australia",
            coordinates: { lat: -33.8614, lng: 151.2108 }
        },
        category: "Arts & Culture",
        tags: ["vivid", "lights", "art", "festival", "sydney"],
        price: { min: 0, max: 0, currency: "AUD", isFree: true },
        imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800",
        source: {
            name: "TimeOut",
            url: "https://www.timeout.com/sydney/vivid-sydney-002",
            eventId: "sample-vivid-001"
        },
        status: "new",
        lastScraped: new Date()
    },
    {
        title: "Sydney Food & Wine Festival",
        description: "Celebrate Sydney's vibrant food scene with tastings, masterclasses, and dining experiences from the city's best chefs and winemakers.",
        startDate: getFutureDate(55, 12, 0), // 55 days from now
        endDate: getFutureDate(55, 22, 0),
        venue: {
            name: "The Rocks Markets",
            address: "George Street, The Rocks NSW 2000",
            city: "Sydney",
            state: "NSW",
            country: "Australia",
            coordinates: { lat: -33.8587, lng: 151.2089 }
        },
        category: "Food & Drink",
        tags: ["food", "wine", "festival", "tasting", "sydney"],
        price: { min: 45, max: 150, currency: "AUD", isFree: false },
        imageUrl: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800",
        source: {
            name: "Eventbrite",
            url: "https://www.eventbrite.com.au/e/sydney-food-wine-003",
            eventId: "sample-food-001"
        },
        status: "new",
        lastScraped: new Date()
    },
    {
        title: "Sydney Tech Startup Meetup",
        description: "Monthly networking event for tech entrepreneurs, developers, and investors. Featuring guest speakers, pitch sessions, and networking opportunities.",
        startDate: getFutureDate(7, 18, 30), // 7 days from now
        endDate: getFutureDate(7, 21, 0),
        venue: {
            name: "Stone & Chalk",
            address: "11 York Street, Sydney NSW 2000",
            city: "Sydney",
            state: "NSW",
            country: "Australia",
            coordinates: { lat: -33.8688, lng: 151.2093 }
        },
        category: "Business & Professional",
        tags: ["tech", "startup", "networking", "business", "sydney"],
        price: { min: 0, max: 0, currency: "AUD", isFree: true },
        imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
        source: {
            name: "Meetup",
            url: "https://www.meetup.com/sydney-tech-startups-004",
            eventId: "sample-tech-001"
        },
        status: "new",
        lastScraped: new Date()
    },
    {
        title: "Bondi Beach Yoga Sunrise Session",
        description: "Start your day with energizing yoga on Australia's most famous beach. All levels welcome. Bring your own mat.",
        startDate: getFutureDate(12, 6, 0), // 12 days from now
        endDate: getFutureDate(12, 7, 30),
        venue: {
            name: "Bondi Beach",
            address: "Bondi Beach, Sydney NSW 2026",
            city: "Sydney",
            state: "NSW",
            country: "Australia",
            coordinates: { lat: -33.8908, lng: 151.2743 }
        },
        category: "Sports & Fitness",
        tags: ["yoga", "fitness", "beach", "wellness", "sydney"],
        price: { min: 20, max: 20, currency: "AUD", isFree: false },
        imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800",
        source: {
            name: "Meetup",
            url: "https://www.meetup.com/bondi-yoga-005",
            eventId: "sample-yoga-001"
        },
        status: "new",
        lastScraped: new Date()
    },
    {
        title: "Sydney Comedy Festival - Opening Night",
        description: "Laugh until your sides hurt with Australia's best comedians. Opening night gala featuring surprise special guests.",
        startDate: getFutureDate(45, 20, 0), // 45 days from now
        endDate: getFutureDate(45, 22, 30),
        venue: {
            name: "Enmore Theatre",
            address: "118-132 Enmore Road, Newtown NSW 2042",
            city: "Sydney",
            state: "NSW",
            country: "Australia",
            coordinates: { lat: -33.8987, lng: 151.1753 }
        },
        category: "Arts & Culture",
        tags: ["comedy", "entertainment", "theatre", "sydney"],
        price: { min: 55, max: 95, currency: "AUD", isFree: false },
        imageUrl: "https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800",
        source: {
            name: "TimeOut",
            url: "https://www.timeout.com/sydney/comedy-festival-006",
            eventId: "sample-comedy-001"
        },
        status: "updated",
        lastScraped: new Date()
    },
    {
        title: "Sydney Marathon 2026",
        description: "Run through Sydney's most iconic locations in this world-class marathon event. Full marathon, half marathon, and 10K options available.",
        startDate: getFutureDate(220, 7, 0), // 220 days from now
        endDate: getFutureDate(220, 14, 0),
        venue: {
            name: "Sydney Harbour Bridge",
            address: "Sydney Harbour Bridge, Sydney NSW",
            city: "Sydney",
            state: "NSW",
            country: "Australia",
            coordinates: { lat: -33.8523, lng: 151.2108 }
        },
        category: "Sports & Fitness",
        tags: ["marathon", "running", "fitness", "sport", "sydney"],
        price: { min: 120, max: 180, currency: "AUD", isFree: false },
        imageUrl: "https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800",
        source: {
            name: "Eventbrite",
            url: "https://www.eventbrite.com.au/e/sydney-marathon-007",
            eventId: "sample-marathon-001"
        },
        status: "new",
        lastScraped: new Date()
    },
    {
        title: "Darling Harbour Night Markets",
        description: "Experience Sydney's vibrant night market culture with street food, live music, artisan crafts, and entertainment for the whole family.",
        startDate: getFutureDate(22, 17, 0), // 22 days from now
        endDate: getFutureDate(22, 22, 0),
        venue: {
            name: "Darling Harbour",
            address: "Darling Harbour, Sydney NSW 2000",
            city: "Sydney",
            state: "NSW",
            country: "Australia",
            coordinates: { lat: -33.8737, lng: 151.2006 }
        },
        category: "Food & Drink",
        tags: ["markets", "food", "family", "entertainment", "sydney"],
        price: { min: 0, max: 0, currency: "AUD", isFree: true },
        imageUrl: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800",
        source: {
            name: "TimeOut",
            url: "https://www.timeout.com/sydney/night-markets-008",
            eventId: "sample-markets-001"
        },
        status: "new",
        lastScraped: new Date()
    },
    {
        title: "Sydney Art Gallery Contemporary Exhibition",
        description: "Explore cutting-edge contemporary art from Australian and international artists. Interactive installations and guided tours available.",
        startDate: getFutureDate(15, 10, 0), // 15 days from now
        endDate: getFutureDate(105, 17, 0),
        venue: {
            name: "Art Gallery of New South Wales",
            address: "Art Gallery Road, The Domain NSW 2000",
            city: "Sydney",
            state: "NSW",
            country: "Australia",
            coordinates: { lat: -33.8688, lng: 151.2173 }
        },
        category: "Arts & Culture",
        tags: ["art", "gallery", "exhibition", "culture", "sydney"],
        price: { min: 0, max: 25, currency: "AUD", isFree: false },
        imageUrl: "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=800",
        source: {
            name: "TimeOut",
            url: "https://www.timeout.com/sydney/art-gallery-009",
            eventId: "sample-art-001"
        },
        status: "new",
        lastScraped: new Date()
    },
    {
        title: "Sydney Craft Beer Festival",
        description: "Sample over 100 craft beers from Australia's best independent breweries. Food trucks, live music, and brewery masterclasses included.",
        startDate: getFutureDate(42, 12, 0), // 42 days from now
        endDate: getFutureDate(42, 20, 0),
        venue: {
            name: "Carriageworks",
            address: "245 Wilson Street, Eveleigh NSW 2015",
            city: "Sydney",
            state: "NSW",
            country: "Australia",
            coordinates: { lat: -33.8946, lng: 151.1892 }
        },
        category: "Food & Drink",
        tags: ["beer", "craft", "festival", "food", "sydney"],
        price: { min: 65, max: 95, currency: "AUD", isFree: false },
        imageUrl: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800",
        source: {
            name: "Eventbrite",
            url: "https://www.eventbrite.com.au/e/craft-beer-festival-010",
            eventId: "sample-beer-001"
        },
        status: "new",
        lastScraped: new Date()
    }
];

async function seedDatabase() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sydney_events');
        console.log('✅ Connected to MongoDB');

        // Clear existing events (optional - comment out if you want to keep existing data)
        await Event.deleteMany({});
        console.log('🗑️  Cleared existing events');

        // Add contentHash to each event
        const eventsWithHash = sampleEvents.map(event => ({
            ...event,
            contentHash: generateContentHash(event)
        }));

        // Insert sample events
        const inserted = await Event.insertMany(eventsWithHash);
        console.log(`✅ Inserted ${inserted.length} sample events`);

        // Display summary
        console.log('\n📊 Event Summary:');
        console.log(`   Total Events: ${inserted.length}`);
        console.log(`   Categories: ${[...new Set(sampleEvents.map(e => e.category))].join(', ')}`);
        console.log(`   Sources: ${[...new Set(sampleEvents.map(e => e.source.name))].join(', ')}`);
        console.log(`   Status: ${inserted.filter(e => e.status === 'new').length} new, ${inserted.filter(e => e.status === 'updated').length} updated`);
        console.log(`   Date Range: ${Math.min(...sampleEvents.map(e => e.startDate))} to ${Math.max(...sampleEvents.map(e => e.startDate))}`);

        console.log('\n✅ Database seeded successfully!');
        console.log('🚀 You can now test the application at http://localhost:5173');

    } catch (error) {
        console.error('❌ Error seeding database:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Database connection closed');
    }
}

// Run the seed function
seedDatabase();
