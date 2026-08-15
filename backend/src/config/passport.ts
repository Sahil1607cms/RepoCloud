import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";

//handles github OAuth
const backendUrl = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000";
const callbackUrl = process.env.GITHUB_CALLBACK_URL || `${backendUrl.replace(/\/$/, "")}/auth/github/callback`;

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      callbackURL: callbackUrl,
    },
    async (accessToken: string, refreshToken: string, profile: any, done: any) => {
      return done(null, profile);
    }
  )
);

export default passport;
