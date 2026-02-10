// Quick script to check database contents
const mongoose = require('mongoose');
const Event = require('../models/Event');
require('dotenv').config();

async function checkDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sydney_events');
        console.log('✅ Connected to MongoDB');

        // Count total events
        const totalCount = await Event.countDocuments();
        console.log(`\n📊 Total events in database: ${totalCount}`);

        // Get all events
        const events = await Event.find().limit(5);
        console.log(`\n📋 First 5 events:`);
        events.forEach((event, index) => {
            console.log(`\n${index + 1}. ${event.title}`);
            console.log(`   City: ${event.venue?.city}`);
            console.log(`   Status: ${event.status}`);
            console.log(`   Start Date: ${event.startDate}`);
            console.log(`   Source: ${event.source?.name}`);
        });

        // Check Sydney events specifically
        const sydneyEvents = await Event.find({ 'venue.city': 'Sydney' });
        console.log(`\n🌆 Events in Sydney: ${sydneyEvents.length}`);

        // Check upcoming events
        const upcomingEvents = await Event.find({
            startDate: { $gte: new Date() }
        });
        console.log(`📅 Upcoming events: ${upcomingEvents.length}`);

        // Check by status
        const newEvents = await Event.find({ status: 'new' });
        console.log(`🆕 New events: ${newEvents.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n👋 Connection closed');
    }
}

checkDatabase();
