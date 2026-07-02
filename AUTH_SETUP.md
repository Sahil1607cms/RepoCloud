# Backend-Frontend Auth Integration Guide

## Setup Instructions

### 1. Backend Setup

#### Environment Variables
Create a `.env` file in `/backend/` with the following (based on `.env.example`):

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
SESSION_SECRET=your-secret-key-change-this
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

**Important:** You've already added the GitHub credentials to your frontend env, so use the same credentials here.

#### Install Dependencies
```bash
cd backend
npm install
```

#### Run Backend
```bash
npm start
```
The backend will run on `http://localhost:3000`

---

### 2. Frontend Setup

#### Environment Variables
Frontend `.env` is already configured:
```env
VITE_API_URL=http://localhost:3000
```

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Run Frontend
```bash
npm run dev
```
The frontend will run on `http://localhost:5173`

---

## How It Works

### 1. **Login Flow**
- User clicks "Continue with GitHub" on LoginPage
- Redirected to `http://localhost:3000/auth/github`
- GitHub OAuth prompt appears
- After authentication, redirected to `http://localhost:5173/dashboard`

### 2. **Authentication State**
- `AuthContext` manages global auth state
- `useAuth()` hook provides access to:
  - `user` - Current user data
  - `isAuthenticated` - Boolean auth status
  - `loading` - Loading state
  - `login()` - Manual login
  - `logout()` - Logout function

### 3. **Protected Routes**
- `ProtectedRoute` component wraps protected pages
- Automatically redirects to `/login` if not authenticated
- Shows loading state while checking auth

### 4. **API Communication**
- `api.js` - Axios instance with backend URL
- `authService.js` - Auth API calls:
  - `getCurrentUser()` - Get logged-in user info
  - `logout()` - Log out user
  - `loginWithGithub()` - Initiate GitHub login
  - `isAuthenticated()` - Check auth status

---

## Backend Endpoints

### Authentication Routes
- `GET /auth/github` - Initiate GitHub OAuth
- `GET /auth/github/callback` - GitHub OAuth callback
- `GET /auth/me` - Get current user info (requires authentication)
- `POST /auth/logout` - Logout user

### User Data Available
After authentication, user object contains:
- `id` - GitHub user ID
- `username` - GitHub username
- `avatar_url` - GitHub avatar URL
- `displayName` - GitHub display name
- `email` - GitHub email

---

## Files Updated/Created

### Backend
- ✅ `src/index.ts` - Updated with auth middleware and routes
- ✅ `src/routes/authRoutes.js` - Updated with session-based auth
- ✅ `src/config/passport.js` - GitHub strategy config (already existed)
- ✅ `.env.example` - Created with required variables

### Frontend
- ✅ `src/context/AuthContext.jsx` - Created auth context provider
- ✅ `src/services/api.js` - Created axios instance
- ✅ `src/services/authService.js` - Created auth service
- ✅ `src/pages/LoginPage.jsx` - Updated with loading state
- ✅ `src/routes/ProtectedRoute.jsx` - Created protected route wrapper
- ✅ `src/routes/AppRoutes.jsx` - Updated with protected routes
- ✅ `src/App.jsx` - Wrapped with AuthProvider
- ✅ `.env` - Created with API URL
- ✅ `.env.example` - Created

---

## Testing the Integration

1. Start backend: `npm start` (from `/backend`)
2. Start frontend: `npm run dev` (from `/frontend`)
3. Navigate to `http://localhost:5173/login`
4. Click "Continue with GitHub"
5. Complete GitHub login
6. Should redirect to dashboard with user info available

---

## Troubleshooting

### CORS Error
- Ensure backend has correct `FRONTEND_URL` in `.env`
- Check `credentials: true` is set in axios instance

### Session Not Persisting
- Verify `SESSION_SECRET` is set in backend `.env`
- Check browser cookies are enabled
- Ensure axios has `withCredentials: true`

### GitHub Login Fails
- Verify GitHub Client ID and Secret in both frontend and backend `.env`
- Check callback URL in GitHub OAuth app settings matches: `http://localhost:3000/auth/github/callback`

---

## Production Deployment

When deploying to production:
1. Update `FRONTEND_URL` and `VITE_API_URL` to production URLs
2. Set secure `SESSION_SECRET` (use a strong random string)
3. Set `NODE_ENV=production`
4. Update GitHub OAuth app callback URL to production domain
5. Use HTTPS for secure cookie transmission

