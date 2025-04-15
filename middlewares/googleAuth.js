const passport = require("passport");
const googleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userModel.js");
const env = require('dotenv').config();

passport.use(new googleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:'https://buildyourdream.ddnsking.com/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {

    try {
        const email = profile.emails[0].value;
        const googleId = profile.id;

        let user = await User.findOne({ email });


        if (user) {
            if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
        } else {
            user = await User.create({
                googleId,
                email,
                username: profile.displayName
            });
        }

        
        return done(null, user);
        

    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

module.exports  =  passport;