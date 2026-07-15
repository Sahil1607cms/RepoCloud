import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";

//handles github OAuth
passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      callbackURL:
        "http://localhost:3000/auth/github/callback",
    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      return done(null, profile);
    }
  )
);

export default passport;
