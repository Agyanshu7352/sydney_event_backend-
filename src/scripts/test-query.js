// Debug script to test the exact query the API is using
const mongoose = require('mongoose');
const Event = require('../models/Event');
const { EVENT_STATUS } = require('../config/constants');
require('dotenv').config();

async function testQuery() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sydney_events');
        console.log('✅ Connected to MongoDB');

        const city = 'Sydney';
        const now = new Date();

        console.log(`\n🔍 Testing query with:`);
        console.log(`   City: ${city}`);
        console.log(`   Current date: ${now}`);
        console.log(`   Inactive status value: ${EVENT_STATUS.INACTIVE}`);

        // Exact query from API
        const query = {
            'venue.city': city,
            startDate: { $gte: now },
            status: { $ne: EVENT_STATUS.INACTIVE }
        };

        console.log(`\n📋 Query object:`, JSON.stringify(query, null, 2));

        const events = await Event.find(query);
        console.log(`\n✅ Found ${events.length} events`);

        if (events.length > 0) {
            console.log(`\n📋 First event:`);
            console.log(`   Title: ${events[0].title}`);
            console.log(`   City: ${events[0].venue?.city}`);
            console.log(`   Start Date: ${events[0].startDate}`);
            console.log(`   Status: ${events[0].status}`);
        } else {
            console.log(`\n❌ No events found. Let's check what's in the database:`);

            const allEvents = await Event.find({}).limit(3);
            allEvents.forEach(event => {
                console.log(`\n   Event: ${event.title}`);
                console.log(`   City: ${event.venue?.city}`);
                console.log(`   Start Date: ${event.startDate}`);
                console.log(`   Status: ${event.status}`);
                console.log(`   Passes city filter: ${event.venue?.city === city}`);
                console.log(`   Passes date filter: ${event.startDate >= now}`);
                console.log(`   Passes status filter: ${event.status !== EVENT_STATUS.INACTIVE}`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Connection closed');
    }
}

testQuery();
