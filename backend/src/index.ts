import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import session from "express-session";
import passport from "passport";
import authRoutes from "./routes/authRoutes.js";
import "./config/passport.js";  //node js import GitHubStrategy

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

// Session middleware setup
app.use(session({
  secret: process.env.SESSION_SECRET || "your-secret-key",
  resave: false,
  saveUninitialized: false,
  cookie: {
  secure: process.env.NODE_ENV === "production",
  httpOnly: true,
  sameSite: "none",
  maxAge: 24 * 60 * 60 * 1000,
}
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}))
app.use(express.json())

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport serialization
passport.serializeUser((user: any, done: any) => {
  done(null, user);
});

passport.deserializeUser((user: any, done: any) => {
  done(null, user);
});

// Auth routes
app.use("/auth", authRoutes);

// Protected route to get current user info
app.get("/auth/me", (req: Request, res: Response) => {
  console.log("isAuthenticated:", req.isAuthenticated());
  console.log("session:", req.session);
  console.log("user:", req.user);
  
  //isAuthenticated method added by passport 
  if (req.isAuthenticated()) {
    const user = req.user as any;
    res.json({
      id: user.id,
      username: user.username,
      avatar_url: user.photos?.[0]?.value,
      displayName: user.displayName,
      email: user.emails?.[0]?.value,
    });
  } else {
    res.status(401).json({ message: "Not authenticated" });
  }
});

// Logout route
app.post("/auth/logout", (req: Request, res: Response) => {
  // logout method added by passport js
  // other methods added are login, user
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle server errors
server.on('error', (error: any) => {
  console.error('Server error:', error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});