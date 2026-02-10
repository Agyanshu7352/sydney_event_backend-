// src/config/passport.js - COMPLETE FIXED VERSION
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {

        // Check if user already exists
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          
          // Update user info and last login
          user.name = profile.displayName || user.name;
          user.picture = (profile.photos && profile.photos[0] ? profile.photos[0].value : null) || user.picture;
          user.lastLogin = new Date();
          await user.save();
          
          return done(null, user);
        }

        let name = profile.displayName;
        
        if (!name && profile.name) {
          name = `${profile.name.givenName || ''} ${profile.name.familyName || ''}`.trim();
        }
        
        if (!name && profile.emails && profile.emails[0]) {
          name = profile.emails[0].value.split('@')[0];
        }
        
        if (!name) {
          name = 'User'; // Last fallback
        }

        // Get email
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;

        if (!email) {
          console.error('❌ ERROR: No email provided by Google');
          return done(new Error('No email provided by Google. Please ensure email permission is granted.'), null);
        }

        const picture = profile.photos && profile.photos[0] ? profile.photos[0].value : null;

        console.log('\n===== EXTRACTED USER DATA =====');
        console.log('Google ID:', profile.id);
        console.log('Email:', email);
        console.log('Name:', name);
        console.log('Picture:', picture ? 'Yes' : 'No');
        console.log('================================\n');


        
        user = await User.create({
          googleId: profile.id,
          email: email,
          name: name,
          picture: picture,  // ✅ Changed from 'avatar' to 'picture'
          lastLogin: new Date(),
        });        
        
        done(null, user);
        
      } catch (error) {
        console.error('\n❌ ERROR in Google Strategy:');
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        if (error.errors) {
          console.error('Validation errors:', error.errors);
          Object.keys(error.errors).forEach(key => {
            console.error(`  - ${key}: ${error.errors[key].message}`);
          });
        }
        
        console.error('Full error:', error);
        console.error('===============================\n');
        
        done(error, null);
      }
    }
  )
);

module.exports = passport;