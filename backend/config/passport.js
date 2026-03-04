const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;

// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Configure GitHub OAuth Strategy
passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/auth/github/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // On successful login, serialize user data into session
    const user = {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      avatar: profile.photos?.[0]?.value,
      profileUrl: profile.profileUrl
    };
    return done(null, user);
  }
));

module.exports = passport;
