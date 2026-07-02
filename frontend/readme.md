Routes
/
├── Landing Page

/login
├── GitHub Login Page

/dashboard
├── Deploy New Project
├── Past Projects
├── Deployment Status
└── Recent Activity

/project/:projectId
├── Project Details
├── Build Logs
├── Live URL
└── Deployment History

GitHub Login is completely free using **GitHub OAuth Apps**.

### Step 1: Create a GitHub OAuth App

Go to:

[GitHub Developer Settings](https://github.com/settings/developers?utm_source=chatgpt.com)

Then:

```text
Developer settings
    ↓
OAuth Apps
    ↓
New OAuth App
```

Fill:

```text
Application name:
RepoCloud

Homepage URL:
http://localhost:5173

Authorization callback URL:
http://localhost:3000/auth/github/callback
```

Click **Register Application**.

---

### Step 2: Get Credentials

GitHub will give you:

```text
Client ID
```

Then click:

```text
Generate a new client secret
```

GitHub will give:

```text
Client Secret
```

Store them in backend `.env`:

```env
GITHUB_CLIENT_ID=xxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxx
```

---

### Step 3: Install Passport

Backend:

```bash
npm install passport passport-github2 express-session
```

---

### Step 4: Passport Strategy

```js
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL:
        "http://localhost:3000/auth/github/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);
```

---

### Step 5: Routes

```js
app.get(
  "/auth/github",
  passport.authenticate("github", {
    scope: ["user:email"],
  })
);
```

```js
app.get(
  "/auth/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    res.redirect("http://localhost:5173/dashboard");
  }
);
```

---

### Step 6: Frontend Login Button

```jsx
<button
  onClick={() =>
    window.location.href =
      "http://localhost:3000/auth/github"
  }
>
  Continue with GitHub
</button>
```

Flow:

```text
User clicks Login
       ↓
GitHub OAuth
       ↓
User approves
       ↓
Backend receives GitHub profile
       ↓
Create/Login user
       ↓
Redirect to Dashboard
```

For your mini-Vercel project, this is enough. You don't need paid GitHub APIs or GitHub Apps. A free OAuth App is the standard approach and looks professional on internship projects.
