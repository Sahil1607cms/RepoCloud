# RepoCloud

RepoCloud is a full-stack deployment platform that lets a user paste a GitHub repository URL, trigger a containerized build, stream build logs in real time, and access the deployed site through a live preview URL. The implementation in this repository combines a React frontend, an Express-based backend, a Socket.IO log server, an AWS ECS Fargate build pipeline, an S3 artifact store, and a reverse proxy for subdomain-style deployment URLs.

This README reflects the implementation currently present in the repository rather than a generic deployment template. Where the codebase still contains hard-coded values or a simpler prototype path, that is called out explicitly.

---

## 1. Project Overview

### What RepoCloud does
RepoCloud accepts a GitHub repository URL, starts a build process for that repository, compiles the project, uploads the build output to Amazon S3, and makes the result accessible through a generated deployment URL. The frontend shows the deployment progress and streams build logs live while the build is running.

### Motivation
The project is designed to simplify the path from repository to preview deployment. Instead of manually cloning a repository, installing dependencies, building the project, and uploading artifacts, RepoCloud automates that workflow and presents the entire process through a single web interface.

### Main features
- GitHub repository deployment from the web UI
- Live deployment dashboard with project cards and preview URLs
- Real-time build log streaming via Socket.IO
- AWS ECS Fargate execution for isolated build jobs
- Artifact upload to Amazon S3
- Reverse proxy routing to serve deployed assets through a generated subdomain-style URL
- GitHub authentication for the dashboard experience

---

## 2. Tech Stack

### Frontend
- React 19
- Vite
- React Router DOM
- Axios for API calls
- Socket.IO client for log streaming
- Tailwind CSS
- Lucide React for icons

### Backend
- Node.js
- Express
- Passport.js
- Passport-GitHub2 for GitHub OAuth
- Express Session
- CORS
- dotenv
- simple-git

### Cloud / Infrastructure
- AWS ECS Fargate
- Amazon S3
- AWS SDK for JavaScript v3
- Reverse proxy using http-proxy

### Database / Messaging
- Redis / Valkey via ioredis
- Redis Pub/Sub for build log fan-out

### DevOps / Build Tools
- Docker build server container
- npm for dependency installation
- TypeScript compilation for the main backend service

---

## 3. System Architecture

The current implementation follows this flow:

```text
User
↓
React Frontend
↓
Express API Server
↓
AWS ECS Fargate
↓
Clone GitHub Repository
↓
npm install
↓
npm run build
↓
Upload build to Amazon S3
↓
Reverse Proxy
↓
Live Deployment URL
```

### End-to-end flow
1. The user opens the frontend, signs in with GitHub, and submits a repository URL from the deployment form.
2. The frontend calls the deployment API service, which sends the repository URL to the API server.
3. The API server triggers an ECS Fargate task that runs a containerized build job.
4. The build container clones the GitHub repository, installs dependencies, runs the build, and uploads the resulting static output to S3.
5. The frontend subscribes to a Socket.IO channel for the specific deployment ID and receives live log messages.
6. The reverse proxy routes requests to the correct project artifact path in S3 and serves the deployed frontend under a generated URL.

### Redis Pub/Sub
The build server publishes messages to Redis channels such as `logs:<projectId>`. The Socket server subscribes to those channels and forwards the messages to the frontend over Socket.IO. This is how the build logs are streamed in real time.

### Socket.IO
A dedicated Socket.IO server listens on port 9001 and handles client subscriptions to deployment log channels. Clients join a channel, and the server relays all Redis messages for that channel back to the UI.

### Reverse Proxy
The reverse proxy listens on port 8000 and uses the requested subdomain or hostname to determine the project ID. It rewrites the request to the S3 artifact path and proxies it to the correct output location.

### AWS ECS
The deployment server uses ECS Fargate to run a build container in AWS. This provides isolated execution for each deployment job and allows the system to build repositories outside the local machine.

### S3 storage
The build container uploads the generated `dist` output into S3 under a project-specific path such as `__outputs/<projectId>/...`. The reverse proxy then reads from that path.

### Real-time build logs
The build container emits logs to stdout and stderr. These are captured by the build script, published to Redis, and forwarded through Socket.IO to the dashboard UI.

---

## 4. Folder Structure

```text
RepoCloud/
├── AUTH_SETUP.md
├── backend/
│   ├── package.json
│   ├── README.md
│   ├── src/
│   │   ├── index.ts
│   │   ├── generateRandomId.ts
│   │   ├── config/
│   │   │   ├── passport.js
│   │   │   └── passport.ts
│   │   └── routes/
│   │       ├── authRoutes.ts
│   │       ├── authRoutes.js
│   │       └── authRoutes.d.ts
│   ├── api-server/
│   │   ├── index.js
│   │   └── package.json
│   ├── build-server/
│   │   ├── Dockerfile
│   │   ├── main.sh
│   │   ├── package.json
│   │   └── script.js
│   └── s3-reverse-proxy/
│       ├── index.js
│       └── package.json
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── index.css
│       ├── components/
│       ├── context/
│       ├── hooks/
│       ├── pages/
│       ├── routes/
│       ├── services/
│       └── utils/
└── README.md
```

### Important directories
- `backend/src` contains the main TypeScript Express application for GitHub authentication and a lightweight deployment route.
- `backend/api-server` contains the actual deployment orchestration service. It accepts deployment requests, starts ECS tasks, and coordinates Socket.IO and Redis integration.
- `backend/build-server` contains the build container logic. It clones the repository, runs install/build commands, captures logs, and uploads artifacts to S3.
- `backend/s3-reverse-proxy` contains the proxy service that routes requests to the correct S3 path for a given deployment ID.
- `frontend/src` contains the complete React app: pages, components, hooks, routes, services, and authentication state.
- `frontend/src/services` holds the API, authentication, deployment, and Socket.IO integration layers.
- `frontend/src/hooks` contains the deployment state logic that stores projects in localStorage and updates them as logs stream in.

---

## 5. Installation Guide

### Prerequisites
Before running RepoCloud locally, ensure the following are available:
- Node.js 18+ (20 or 22 recommended)
- npm
- Docker
- AWS CLI configured with access to your account
- A Redis or Aiven Valkey instance
- An AWS account with ECS and S3 access
- An ECS cluster and task definition for the builder container
- An S3 bucket for build artifacts
- IAM permissions for ECS, S3, and CloudWatch-style logging access
- GitHub OAuth application credentials

### Required environment variables
The repository currently uses environment variables in the frontend and the main backend auth service. The deployment pipeline files still contain hard-coded AWS credentials and resource identifiers, which should be moved to environment variables for production hardening.

#### Backend auth service
Create a backend `.env` file with:

```env
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
SESSION_SECRET=your-strong-session-secret
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

#### Frontend
Create a frontend `.env` file with:

```env
VITE_API_URL=http://localhost:3000
```

#### Reverse proxy
Create a `backend/s3-reverse-proxy/.env` file with:

```env
BASE_PATH=https://your-s3-bucket.s3.region.amazonaws.com/__outputs/
```

#### Build service
The build service currently reads `PROJECT_ID` and `GIT_REPOSITORY__URL` from the environment when invoked by ECS. The repository also expects Redis access and AWS credentials to be available to the container runtime.

### Install dependencies
```bash
cd backend
npm install

cd api-server
npm install

cd ../build-server
npm install

cd ../s3-reverse-proxy
npm install

cd ../../frontend
npm install
```

---

## 6. Environment Variables

### Main backend service
Used by [backend/src/index.ts](backend/src/index.ts) and [backend/src/routes/authRoutes.ts](backend/src/routes/authRoutes.ts):
- `GITHUB_CLIENT_ID` — GitHub OAuth client ID
- `GITHUB_CLIENT_SECRET` — GitHub OAuth client secret
- `SESSION_SECRET` — session secret for Express session middleware
- `FRONTEND_URL` — frontend URL used for OAuth redirect and CORS policy
- `NODE_ENV` — runtime mode, usually `development` or `production`

### Frontend
Used by [frontend/src/services/api.js](frontend/src/services/api.js) and [frontend/src/services/authService.js](frontend/src/services/authService.js):
- `VITE_API_URL` — base URL of the backend API service

### Reverse proxy
Used by [backend/s3-reverse-proxy/index.js](backend/s3-reverse-proxy/index.js):
- `BASE_PATH` — the S3 base URL for the deployed output directory

### Build server
Used by [backend/build-server/script.js](backend/build-server/script.js) and [backend/build-server/main.sh](backend/build-server/main.sh):
- `PROJECT_ID` — unique deployment identifier
- `GIT_REPOSITORY__URL` — repository URL passed through the ECS task override

### Deployment orchestration service
The current implementation hard-codes ECS cluster, task definition, subnets, security groups, Redis URL, and AWS credentials inside [backend/api-server/index.js](backend/api-server/index.js). In a production-grade version, these values should be moved to environment variables.

---

## 7. Local Setup

### 1. Configure AWS CLI
```bash
aws configure
```

Make sure the configured account has access to ECS, S3, and the VPC networking resources used by the build task.

### 2. Create the required environment files
Create the files described above in the backend and frontend folders.

### 3. Start the Redis connection
RepoCloud expects a Redis or Valkey service for pub/sub log delivery. If you are using an Aiven Valkey instance, make sure the connection string is available and reachable from the deployment server and the Socket server.

### 4. Start the API server
```bash
cd backend/api-server
node index.js
```
This service runs on port 9000 and also starts the Socket.IO server on port 9001.

### 5. Start the reverse proxy
```bash
cd backend/s3-reverse-proxy
node index.js
```
This service runs on port 8000.

### 6. Start the main backend auth service
```bash
cd backend
npm start
```
The main backend runs on port 3000 and serves the GitHub auth routes and the simple deploy endpoint.

### 7. Start the frontend
```bash
cd frontend
npm run dev
```
The frontend is available at `http://localhost:5173` by default.

### 8. Verify deployment
1. Open the frontend and sign in with GitHub.
2. On the dashboard, paste a public GitHub repository URL.
3. Submit the form.
4. Wait for the build to start and watch the logs stream.
5. Once the build completes, visit the generated URL for the deployment preview.

---

## 8. Usage Guide

### Start the application
Use the local setup steps above to launch the services. The intended development flow is:
- Start the deployment API and Socket server from `backend/api-server`
- Start the reverse proxy from `backend/s3-reverse-proxy`
- Start the auth backend from `backend`
- Start the frontend from `frontend`

### Deploy a GitHub repository
1. Open the dashboard.
2. Paste a repository URL such as `https://github.com/user/repo`.
3. Click the deployment button.
4. The frontend creates a local project record and navigates to the project detail view.

### View build logs
The project detail page subscribes to the deployment-specific log channel and renders log lines as they arrive. Logs include install output, build status messages, S3 upload progress, and completion messages.

### Access the deployed project
Once the build finishes successfully, the deployment URL is shown in the project detail page and can be opened in a new tab.

---

## 9. API Documentation

### Authentication endpoints

#### GET /auth/github
- Purpose: Initiates GitHub OAuth login.
- Request: No body.
- Response: Redirects the browser to GitHub.

#### GET /auth/github/callback
- Purpose: Handles the GitHub OAuth callback and completes the session.
- Request: GitHub callback query parameters.
- Response: Redirects to the frontend dashboard URL.

#### GET /auth/me
- Purpose: Returns the current authenticated user.
- Request: Requires an authenticated session.
- Response:
```json
{
  "id": 123,
  "username": "octocat",
  "avatar_url": "https://...",
  "displayName": "Octocat",
  "email": "octocat@example.com"
}
```

#### POST /auth/logout
- Purpose: Logs the current user out.
- Request: No body.
- Response:
```json
{
  "message": "Logged out successfully"
}
```

### Deployment endpoints

#### POST /deploy
- Purpose: Lightweight deployment endpoint in the main backend service.
- Request body:
```json
{
  "repoUrl": "https://github.com/user/repo"
}
```
- Response:
```json
{
  "id": "generated-project-id"
}
```
- Notes: This implementation clones the repository into an `output/<id>` folder and uses `simple-git`.

#### POST /project
- Purpose: Starts a deployment through AWS ECS Fargate.
- Request body:
```json
{
  "githubUrl": "https://github.com/user/repo"
}
```
- Response:
```json
{
  "status": "queued",
  "data": {
    "randomId": "generated-id",
    "url": "http://generated-id.localhost:8000"
  }
}
```
- Notes: This is the main deployment trigger used by the frontend deployment service.

---

## 10. Integration Process

The frontend, backend, Redis, Socket.IO, ECS, S3, and reverse proxy work together in the following way:

1. The React app collects the repository URL from the user.
2. The deployment service sends the URL to the API server over HTTP.
3. The API server triggers an ECS Fargate task with the repository URL and a generated project ID.
4. The ECS task runs the build container, which clones the repository and builds the project.
5. The build script publishes log lines to Redis using the `logs:<projectId>` channel.
6. The Socket.IO server subscribes to the Redis channel and pushes those messages to the frontend client.
7. After the build completes, the build container uploads the output files to S3 under the project-specific path.
8. The reverse proxy serves those files when a request arrives for the generated deployment URL.

---

## 11. State Management

Frontend state is handled in two layers:

- `AuthContext` manages authentication state for the app and exposes login/logout helpers.
- `useDeployements` manages deployment records, including project metadata, status, preview URL, build logs, and local persistence.

Projects are stored in `localStorage` under the `repocloud_projects` key. This allows the dashboard to persist deployments across page refreshes. When logs arrive from the Socket.IO server, the hook updates the relevant project record and re-renders the detail page instantly.

---

## 12. Real-Time Communication

The real-time log pipeline is implemented as follows:

1. The build container publishes logs using Redis Pub/Sub.
2. The Socket.IO server subscribes to matching Redis channels.
3. The frontend client joins a channel for the current deployment and receives the streamed log data.
4. The project detail page updates the log list and status text as messages arrive.

This approach keeps the deployment UI responsive while the build process runs in the background.

---

## 13. Challenges Faced

The implementation encountered several realistic production-style issues:

- Socket.IO lifecycle issues when reconnecting or switching between deployments
- Duplicate subscriptions to the same deployment log channel
- Reverse proxy routing issues when mapping a hostname to the correct S3 object path
- AWS ECS task execution problems related to networking, subnets, security groups, and public IP configuration
- Real-time log streaming problems caused by capturing stdout and stderr from the build process
- Synchronizing deployment status between the backend trigger, the local UI state, and the final success or failure condition
- CORS and cookie issues between the frontend and backend during authentication
- Environment configuration drift between local development and cloud deployment

---

## 14. Solutions Implemented

The repository addresses these issues in the current implementation:

- A singleton Socket.IO client is reused in the frontend to reduce reconnect churn.
- The frontend tracks subscribed channels and avoids duplicate subscription requests.
- The Socket server keeps a per-socket set of joined channels and supports explicit unsubscribe behavior.
- The reverse proxy uses the host name to derive a project ID and route requests to the correct S3 path.
- The ECS deployment request includes network configuration with public IP enabled so the container can clone repositories and upload artifacts.
- The build script captures stdout and stderr and publishes every chunk to Redis for streaming.
- The build status in the UI changes based on log content such as `Done...`, `Build is Complete`, or error phrases.
- The backend uses session-based authentication and CORS settings to support browser-based OAuth flow.
- The project stores deployment metadata in `localStorage` so the dashboard remains consistent across refreshes.

---

## 15. Testing

The repository currently relies more on manual verification than an automated test suite. The main validation steps are:

- API testing through direct HTTP requests to the auth and deployment endpoints
- End-to-end deployment testing by submitting a GitHub repository URL and checking that the ECS task starts
- Real-time log verification by observing the Socket.IO stream in the frontend detail page
- Reverse proxy verification by requesting the generated deployment URL and confirming the static site is served
- Deployment URL validation by confirming that the preview link opens the expected build output

The project would benefit from adding automated tests for the deployment API, the log streaming pipeline, and the reverse proxy routing rules.

---

## 16. Future Improvements

A realistic roadmap for RepoCloud includes:
- Move hard-coded AWS credentials, ECS values, and Redis URLs into environment variables and secrets management
- Add database-backed deployment history instead of relying on `localStorage`
- Add proper authentication and authorization for multi-user access
- Introduce deployment queues and job status persistence
- Add automated tests for API routes and deployment orchestration
- Add custom domains and HTTPS support for deployed projects
- Add more robust build artifact validation and rollback support
- Introduce Docker image caching and faster ECS startup times

---

## 17. Conclusion

RepoCloud is a practical example of a modern deployment platform built with React, Express, Redis, Socket.IO, AWS ECS, and S3. It demonstrates how a frontend can trigger builds, stream logs live, and expose a generated preview URL without requiring users to manage the underlying infrastructure manually. The current repository is a working prototype and integration layer that shows the complete flow from repository submission to deployed preview, while also highlighting the kinds of engineering challenges that appear when combining browser-based UI workflows with cloud-native build infrastructure.
