import express from "express";
import passport from "passport";

const router = express.Router();

router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
  })
);

router.get(
  "/github/callback",
  passport.authenticate("github", {
    //keep the user logged in during the session
    session: true,
  }),
  (req, res) => {
    // Redirect to frontend dashboard after successful authentication
    res.redirect(`${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard`);
  }
);

export default router;
