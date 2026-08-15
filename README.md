# RepoCloud

> **Automated, Containerized Cloud Deployment & Real-Time Build Streaming Platform**

RepoCloud is a full-stack, cloud-native deployment platform engineered to automate the workflow from Git repository submission to live static web hosting. By seamlessly connecting user repositories with isolated container execution environments, RepoCloud eliminates manual compilation, dependency installation, and object storage uploads. Users submit a public GitHub repository URL via an intuitive React interface, initiating an isolated AWS ECS Fargate task that executes a containerized build process, streams raw terminal logs in real-time over WebSocket connections via Redis Pub/Sub, and deploys compiled static artifacts to Amazon S3, making the project instantly accessible via a custom subdomain reverse proxy.

---

## Table of Contents

- [1. Project Title](#1-project-title)
- [2. Project Overview](#2-project-overview)
- [3. Problem Statement](#3-problem-statement)
- [4. Objectives](#4-objectives)
- [5. Features](#5-features)
- [6. Complete Technology Stack](#6-complete-technology-stack)
- [7. Architecture](#7-architecture)
- [8. End-to-End Application Flow](#8-end-to-end-application-flow)
- [9. Repository / Folder Structure](#9-repository--folder-structure)
- [10. Frontend Architecture](#10-frontend-architecture)
- [11. Backend Architecture](#11-backend-architecture)
- [12. API Documentation](#12-api-documentation)
- [13. Authentication and Authorization](#13-authentication-and-authorization)
- [14. GitHub Integration](#14-github-integration)
- [15. Deployment System](#15-deployment-system)
- [16. Build Pipeline](#16-build-pipeline)
- [17. Docker](#17-docker)
- [18. AWS ECS / Fargate](#18-aws-ecs--fargate)
- [19. Amazon ECR](#19-amazon-ecr)
- [20. Amazon S3](#20-amazon-s3)
- [21. Reverse Proxy](#21-reverse-proxy)
- [22. Redis Pub/Sub](#22-redis-pubsub)
- [23. Real-Time Build Logs](#23-real-time-build-logs)
- [24. Database Design](#24-database-design)
- [25. Deployment State Machine](#25-deployment-state-machine)
- [26. Core Code](#26-core-code)
- [27. Important Algorithms and Logic](#27-important-algorithms-and-logic)
- [28. Environment Variables](#28-environment-variables)
- [29. Local Development Setup](#29-local-development-setup)
- [30. Docker Development](#30-docker-development)
- [31. AWS Deployment Setup](#31-aws-deployment-setup)
- [32. AWS CLI Commands](#32-aws-cli-commands)
- [33. Error Handling](#33-error-handling)
- [34. Security](#34-security)
- [35. Scalability](#35-scalability)
- [36. Performance](#36-performance)
- [37. Reliability](#37-reliability)
- [38. Design Decisions](#38-design-decisions)
- [39. Trade-offs](#39-trade-offs)
- [40. Testing](#40-testing)
- [41. Example Deployment](#41-example-deployment)
- [42. Logs and Observability](#42-logs-and-observability)
- [43. Screenshots](#43-screenshots)
- [44. Demo](#44-demo)
- [45. Project Challenges](#45-project-challenges)
- [46. Future Improvements](#46-future-improvements)
- [47. Project Statistics](#47-project-statistics)
- [48. Complete Data Flow](#48-complete-data-flow)
- [49. Code Walkthrough](#49-code-walkthrough)
- [50. Interview Explanation](#50-interview-explanation)
- [51. Glossary](#51-glossary)
- [52. Complete Project Summary](#52-complete-project-summary)

---

# 1. Project Title

* **Project Name:** RepoCloud
* **One-Line Description:** An automated Platform-as-a-Service (PaaS) that builds, streams terminal logs for, and hosts web applications from GitHub repositories using AWS ECS Fargate, S3, Redis Pub/Sub, and reverse proxies.
* **Detailed Description:** RepoCloud bridges the gap between source code hosting and production web deployment. It allows developers to authenticate via GitHub OAuth, paste any public repository URL, and initiate a serverless containerized build pipeline. Behind the scenes, an Express API server launches a custom Docker container inside an AWS ECS Fargate cluster. The container dynamically clones the target repository, installs dependencies, compiles production assets, streams standard output/error terminal logs through a Redis Pub/Sub channel to a Socket.IO WebSocket server, and uploads static artifacts to Amazon S3 with auto-detected MIME types. A custom NodeJS reverse proxy maps generated project IDs to S3 bucket keys, immediately serving live deployments under isolated preview paths.
* **What Problem the Project Solves:** Manual deployment requires provisioning virtual servers, configuring web servers (Nginx/Apache), handling SSL termination, manually pulling code updates, running build steps on target servers (risking dependency conflicts and resource exhaustion), and configuring routing. RepoCloud automates this entire lifecycle into a single click, providing sandboxed, serverless execution without infrastructure maintenance overhead.
* **Why the Project Was Built:** To explore distributed systems engineering, serverless container orchestration, event-driven real-time logging architectures, cross-origin web proxies, and OAuth integration patterns within modern web technology stacks.
* **What Makes the Project Technically Interesting:**
  1. **Distributed Decoupling:** Build containers operate in isolated AWS VPC tasks completely decoupled from the main Web API, communicating exclusively over Redis channels.
  2. **Real-Time Log Streaming Pipeline:** Terminal standard output streams (stdout/stderr) are captured live inside Docker, serialized into JSON, fanned out over Redis Pub/Sub, multiplexed via Socket.IO rooms, and rendered line-by-line in a virtualized browser console.
  3. **On-Demand Dynamic Infrastructure Orchestration:** ECS tasks are dynamically instantiated via AWS SDK v3 with task overrides injecting environment variables per deployment.
  4. **Transparent Reverse Proxying:** A dedicated HTTP reverse proxy dynamically rewrites incoming incoming request paths and transparently proxies traffic to AWS S3 object endpoints while ensuring proper index page resolution (`/index.html`).

---

# 2. Project Overview

RepoCloud operates as a lightweight alternative to platform services such as Vercel, Netlify, or AWS Amplify.

### Primary User Journey
1. **Authentication:** The user arrives at the landing page and authenticates using their GitHub account via Passport.js GitHub OAuth2 strategy.
2. **Repository Submission:** Once authenticated, the user accesses the protected Dashboard interface and submits a public GitHub repository URL.
3. **Task Orchestration:** The frontend sends a deployment request to the API Server (`/project`), which assigns a unique project ID (`uniqid`) and requests AWS ECS to spawn a serverless Fargate task running the builder Docker image.
4. **Real-Time Terminal View:** The user is immediately redirected to the Project Detail view (`/project/:id`), which opens a Socket.IO connection subscribing to the `logs:<projectId>` topic. Terminal build steps (`git clone`, `npm install`, `npm run build`, S3 uploads) stream directly onto the terminal UI.
5. **Preview Link Access:** Upon completion (`Done...`), the frontend updates the status to `Success` and presents an accessible deployment URL (`http://<projectId>.localhost:8000` or configured domain). The user can click to view their live web application hosted directly via S3 proxying.

### System Architecture Overview
The system is divided into five independent micro-services/micro-modules:
1. **Frontend Client:** React 19 + Vite + Tailwind CSS SPA handling state, routing, OAuth flows, and WebSocket subscriptions.
2. **Main Authentication Backend:** Express + TypeScript service handling OAuth session management (`/auth/*`), Passport.js serialization, and user identity endpoints (`/auth/me`).
3. **API Orchestration & Socket Server:** Express + Socket.IO + AWS SDK v3 backend (`api-server`) that accepts deployment requests, triggers AWS ECS Fargate tasks, listens to Redis Pub/Sub channels, and broadcasts logs to WebSocket clients.
4. **Build Server Container:** A Dockerized Node.js application deployed to AWS ECR/ECS that clones the git repository, runs `npm install && npm run build`, pushes terminal output to Redis, and uploads build artifacts (`dist/`) to Amazon S3 using multi-part stream handling and MIME lookup.
5. **S3 Reverse Proxy:** Express + `http-proxy` server listening on port 8000 that intercepts incoming deployment requests, extracts the target Project ID, rewrites paths, and proxies requests to S3.

---

# 3. Problem Statement

### The Original Problem
Deploying modern frontend JavaScript applications (React, Vue, Vite, Next static exports) traditionally requires developers to:
- Manually SSH into remote virtual machines (EC2, Droplets).
- Maintain system-level runtime dependencies (Node.js, npm, yarn, git).
- Execute manual builds that lock system CPU/RAM, potentially crashing other hosted processes.
- Manually copy built static assets to web root paths or cloud storage buckets.
- Configure complex web server host rules (Nginx server blocks, Caddyfile configs) to route hostnames or paths to static assets.

### Limitations of Conventional Approaches
- **Resource Contention:** Running build jobs on shared application servers can saturate CPU and memory, causing downtime for existing services.
- **Lack of Build Visibility:** Standard continuous integration scripts often execute silently in background jobs without real-time UI feedback.
- **Security Vulnerabilities:** Running untrusted third-party repository build scripts directly on application servers risks arbitrary shell code execution, file system corruption, and environmental variable exposure.

### How RepoCloud Solves the Problem
RepoCloud moves the build process into **ephemeral, isolated AWS ECS Fargate containers**. Each build runs in its own network boundary and filesystem memory limit. Standard output is captured and safely published to Redis without granting containers access to internal database or API infrastructure. Built assets are stored in Amazon S3, completely separating compute (build time) from storage and delivery (runtime serving via reverse proxy).

| Step | Before RepoCloud | After RepoCloud |
| :--- | :--- | :--- |
| **Server Provisioning** | Manual EC2/VPS setup & maintenance | Automatic serverless ECS Fargate task provisioning |
| **Isolation** | Shared server filesystem (Risk of conflict) | 100% Isolated Docker container sandbox |
| **Log Visibility** | Hidden build logs or delayed CI email alerts | Sub-millisecond real-time terminal streaming via WebSockets |
| **Asset Storage** | Local disk storage (Scaling bottleneck) | Highly resilient, scalable Amazon S3 Object Storage |
| **Routing** | Manual Nginx virtual host configuration | Automated subdomain/path dynamic reverse proxy routing |

---

# 4. Objectives

### Functional Objectives
- **Automated Repository Building:** Automatically pull, compile, and package public GitHub repositories upon submission.
- **Real-Time Log Streaming:** Stream terminal output line-by-line during the build process to the client browser without page reloads.
- **Subdomain / Path Web Hosting:** Instantly serve compiled static distributions (`dist`) under generated unique preview URLs.
- **OAuth Authentication:** Secure user access and session management via GitHub login.
- **Deployment Tracking:** Maintain local and session deployment state for easy navigation back to past project builds.

### Technical Objectives
- **Container Isolation:** Ensure untrusted repository code executes within sandboxed Docker containers with non-root security and restricted AWS IAM roles.
- **Stateless API Design:** Maintain stateless orchestration servers capable of scaling horizontally while delegating build workloads to AWS ECS.
- **Decoupled Architecture:** Separate the build process (Build Server), user API (API Server), static serving (Reverse Proxy), and client UI into independent modules.
- **Event-Driven Communication:** Utilize Redis Pub/Sub to decouple build containers from client WebSocket connection management.
- **Scalable Object Storage:** Store static assets in Amazon S3 for 99.999999999% data durability and unlimited concurrent web request handling.

---

# 5. Features

### 1. One-Click GitHub Repository Deployment
- **What it does:** Allows users to paste any public GitHub repository URL (e.g., `https://github.com/user/repository`) into the dashboard and initiate a cloud build.
- **Why it exists:** Simplifies the build trigger process down to a single input field.
- **How it works internally:** `DeployForm.jsx` captures input, invokes `deploymentService.createDeployment(githubUrl)`, which sends `POST /project` to `api-server/index.js`. The server generates a unique ID via `uniqid()`, builds an AWS SDK `RunTaskCommand` with environment overrides (`GIT_REPOSITORY__URL`, `PROJECT_ID`), and executes the Fargate task.
- **Components involved:** `DeployForm.jsx`, `useDeployements.js`, `deploymentService.js`, `api-server/index.js`, AWS ECS.
- **Edge cases:** Invalid URLs, missing `githubUrl` parameter, private repositories failing git clone (returns terminal error in log stream).

### 2. Live Real-Time Build Log Streaming
- **What it does:** Displays live terminal output (`git clone`, `npm install`, `npm run build`, file upload progress) directly in a dark-mode terminal UI.
- **Why it exists:** Provides instant feedback on build progress, aiding in debugging build errors.
- **How it works internally:** The build container's `script.js` listens to child process `stdout` and `stderr` streams via Node's `child_process.exec`. Log lines are published to Redis channel `logs:<PROJECT_ID>`. The `api-server` pattern-subscribes (`psubscribe("logs:*")`) to Redis, receives messages, and broadcasts them via Socket.IO to connected room clients. The React `ProjectDetailPage.jsx` appends new lines to state and auto-scrolls the terminal component (`BuildLogs.jsx`).
- **Components involved:** `script.js`, Redis Pub/Sub, `api-server/index.js`, `logSocket.js`, `ProjectDetailPage.jsx`, `BuildLogs.jsx`.
- **Edge cases:** Rapid duplicate log messages (filtered via 500ms deduplication cache in `api-server`), network disconnections (Socket.IO automatic reconnection logic).

### 3. GitHub OAuth Authentication
- **What it does:** Authenticates users via their GitHub account, preserving session identity.
- **Why it exists:** Protects dashboard routes and associates user sessions.
- **How it works internally:** Clicking "Continue with GitHub" redirects the browser to `/auth/github`. `backend/src/index.ts` uses `passport-github2` to request OAuth authorization from GitHub. Upon approval, GitHub redirects to `/auth/github/callback`, Passport serializes the profile into an Express Session cookie (`express-session`), and redirects the browser back to `/dashboard`.
- **Components involved:** `LoginPage.jsx`, `authService.js`, `backend/src/index.ts`, `passport.ts`, `authRoutes.ts`.
- **Edge cases:** Unauthenticated users accessing `/dashboard` are intercepted by `ProtectedRoute.jsx` and redirected to `/login`.

### 4. Dynamic Reverse Proxy Routing
- **What it does:** Serves static output files uploaded to S3 directly through a unified deployment URL (e.g. `http://localhost:8000/<projectId>`).
- **Why it exists:** Allows users to preview deployed applications seamlessly without configuring web servers or public S3 bucket policies.
- **How it works internally:** The `s3-reverse-proxy/index.js` Express server extracts the `projectId` from request path `/projectId/asset.js`. It strips `/projectId` from `req.url`, prepends the S3 base path (`BASE_PATH/<projectId>`), and proxies the HTTP GET request to AWS S3 using `http-proxy`. If `req.url` is `/`, it rewrites the S3 target path to include `/index.html`.
- **Components involved:** `s3-reverse-proxy/index.js`, Amazon S3 bucket.
- **Edge cases:** Requests for root paths `/` automatically append `index.html` via `proxy.on("proxyReq")` event handler.

### 5. Persistent Deployment History Dashboard
- **What it does:** Displays past deployments, their build status (Building, Success, Failed), repo URL, and preview link.
- **Why it exists:** Enables users to access historical deployments and check logs across sessions.
- **How it works internally:** `useDeployements.js` syncs project metadata to browser `localStorage` under `repocloud_projects`. Upon status changes detected during log parsing (e.g., matching `"Done..."` or `"npm ERR!"`), the project record status is updated in state and persisted to `localStorage`.
- **Components involved:** `DashboardPage.jsx`, `DeploymentHistory.jsx`, `ProjectCard.jsx`, `useDeployements.js`.
- **Edge cases:** Corrupted `localStorage` data is caught via `try...catch` JSON parsing blocks.

---

# 6. Complete Technology Stack

### Frontend
- **React 19 (`^19.2.6`):** UI component library rendering views, managing state, and reacting to WebSocket events.
- **Vite (`^8.0.12`):** Modern bundler providing hot-module replacement and optimized asset building.
- **React Router DOM (`^7.16.0`):** Client-side routing library managing navigation across `/`, `/login`, `/dashboard`, and `/project/:id`.
- **Axios (`^1.16.1`):** Promise-based HTTP client pre-configured with CORS `withCredentials: true` for API requests.
- **Socket.IO Client (`^4.8.3`):** Client-side WebSocket library managing persistent channels, reconnect attempts, and event listeners.
- **Tailwind CSS (`^4.3.0`):** Utility-first styling engine driving dark mode aesthetics, responsive layouts, and gradient effects.
- **Lucide React (`^1.17.0`):** Icon suite providing modern UI icons (AlertCircle, CheckCircle2, RefreshCw, ExternalLink, ArrowLeft).

### Backend
- **Node.js (v18+ / v20+ / v24.x):** JavaScript execution runtime for backend microservices and container scripts.
- **Express.js (`^5.2.1`):** Lightweight web framework powering main Auth services, API Orchestration, and Reverse Proxy routes.
- **TypeScript (`^6.0.3`):** Strongly-typed wrapper around Express backend routes and Passport configuration (`backend/src`).
- **Passport.js (`^0.7.0`) & Passport-GitHub2 (`^0.1.12`):** OAuth 2.0 authentication middleware mapping GitHub profiles to Express session stores.
- **Express Session (`^1.19.0`):** Server-side session middleware issuing HTTP-only, secure cookies.
- **CORS (`^2.8.6`):** Cross-Origin Resource Sharing middleware enabling credentials across port domains (`http://localhost:5173` to `http://localhost:3000` / `9000`).
- **Dotenv (`^17.4.2`):** Environment configuration reader loading environment variables into `process.env`.
- **Uniqid (`^5.4.0`):** Unique hex ID generator creating deployment keys (e.g. `1b9d6bcd-8b7e-4d0d...`).
- **Simple-Git (`^3.36.0`):** Lightweight git interface used for fallback repository cloning.

### Cloud & Infrastructure
- **AWS ECS (Elastic Container Service) Fargate:** Serverless container orchestration platform running isolated build jobs on demand.
- **Amazon S3 (Simple Storage Service):** Distributed object store storing compiled deployment static assets (`__outputs/<PROJECT_ID>/...`).
- **AWS SDK for JavaScript v3 (`@aws-sdk/client-ecs`, `@aws-sdk/client-s3`):** Modular AWS SDKs for triggering task runs and pushing file streams to S3.
- **http-proxy (`^1.18.1`):** High-performance HTTP proxying library enabling reverse proxy file serving from S3.

### Messaging & Cache
- **Redis / Valkey (`ioredis ^5.11.1`):** In-memory event bus and key-value store powering real-time Pub/Sub message channels (`logs:<projectId>`).

### Development & Tooling
- **Docker CLI:** Containerization engine building the `build-server` image (`FROM ubuntu:focal`).
- **Git & GitHub:** Version control platform and OAuth authentication identity provider.
- **Mime-Types (`^3.0.2`):** Content-Type lookup utility setting accurate headers (`text/html`, `text/css`, `application/javascript`) during S3 uploads.

---

# 7. Architecture

### System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client Layer
        User([User Browser])
        ReactUI[React 19 SPA Frontend]
    end

    subgraph Authentication Service
        AuthServer[Express / TS Auth Backend :3000]
        GitHubOAuth[GitHub OAuth2 API]
    end

    subgraph API & Real-Time Orchestration
        APIServer[Express API Server :9000]
        SocketServer[Socket.IO Server :9001]
        RedisPubSub[(Redis / Valkey Pub/Sub)]
    end

    subgraph AWS Cloud Infrastructure
        ECS[AWS ECS Fargate Cluster]
        ECR[Amazon ECR / Docker Hub]
        S3[Amazon S3 Bucket: repocloud-...]
    end

    subgraph Reverse Proxy Layer
        RevProxy[S3 Reverse Proxy Server :8000]
    end

    User -->|1. Interact / Paste URL| ReactUI
    ReactUI -->|2. Authenticate| AuthServer
    AuthServer <-->|3. OAuth Flow| GitHubOAuth
    ReactUI -->|4. POST /project| APIServer
    APIServer -->|5. RunTaskCommand| ECS
    ECS -->|6. Pull Container Image| ECR
    
    subgraph Isolated Fargate Task Container
        MainSh[main.sh ENTRYPOINT]
        GitClone[git clone repo]
        ScriptJs[Node.js script.js]
        NPMBuild[npm install && npm run build]
    end

    ECS --> MainSh
    MainSh --> GitClone
    GitClone --> ScriptJs
    ScriptJs --> NPMBuild
    
    ScriptJs -->|7. Publish stdout/stderr| RedisPubSub
    RedisPubSub -->|8. psubscribe logs:*| APIServer
    APIServer -->|9. io.to channel emit| SocketServer
    SocketServer -->|10. WebSocket log stream| ReactUI
    
    ScriptJs -->|11. PutObjectCommand upload dist/| S3
    ReactUI -->|12. Access Deployment URL| RevProxy
    RevProxy -->|13. Proxy GET request| S3
    S3 -->|14. Return Static Asset| RevProxy
    RevProxy -->|15. Render App in Browser| User
```

### Component Breakdown

| Component | Responsibility | Inputs | Outputs | Primary Dependencies | Communication Method | Failure Mode |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **React Frontend** | Renders UI, handles routing, captures inputs, displays real-time terminal | User interactions, WebSocket messages, API responses | HTTP requests, WebSocket subscriptions | React 19, Axios, Socket.IO Client | REST API, WebSockets | Displays connection error alerts; falls back to static error state |
| **Auth Server (`:3000`)** | Manages GitHub OAuth handshake, creates Express sessions, returns current user profile | GET `/auth/github`, Callback queries | Session Cookie, User profile JSON | Passport-GitHub2, Express Session | HTTP GET/POST | Redirects to `/login?error=true` |
| **API Server (`:9000/9001`)** | Accepts deploy requests, calls AWS ECS `RunTaskCommand`, relays Redis logs to Socket.IO | POST `/project`, Redis Pub/Sub log messages | Task ARN JSON response, WebSocket log events | `@aws-sdk/client-ecs`, `ioredis`, `socket.io` | AWS SDK, Redis TCP, WebSockets | Returns HTTP 500 error; logs failure details |
| **Build Container** | Isolated Ubuntu environment cloning code, running `npm build`, streaming logs, uploading to S3 | Environment variables: `GIT_REPOSITORY__URL`, `PROJECT_ID` | Redis log events, S3 uploaded artifacts | Docker, Node.js, `@aws-sdk/client-s3`, `ioredis` | Redis TCP, AWS S3 API | Emits stderr log to Redis; container terminates with exit code 1 |
| **Redis Server** | In-memory message broker routing pub/sub log lines | Published log strings on `logs:<PROJECT_ID>` | Broadcasted messages to subscriber clients | Redis / Valkey | TCP Socket | Log streaming halts; build still attempts completion and S3 upload |
| **S3 Storage** | Durable storage for compiled frontend build outputs (`dist/`) | S3 `PutObjectCommand` file streams | Binary/Text static file contents | Amazon S3 | AWS S3 REST API | Returns 404/403 XML error to reverse proxy |
| **Reverse Proxy (`:8000`)** | Intercepts HTTP requests, extracts project ID, rewrites paths to match S3 key structure | Client HTTP GET requests (e.g. `/projectId/index.html`) | Proxied HTTP responses containing static assets | `http-proxy`, Express | HTTP Reverse Proxy | Returns 400 "Missing project id" or 404 from S3 |

---

# 8. End-to-End Application Flow

```text
User Actions & System Sequence:

[1. Authentication]
User -> Clicks "Continue with GitHub" on LoginPage
     -> Browser redirects to Auth Backend (:3000/auth/github)
     -> Auth Backend redirects to GitHub OAuth Authorization Page
     -> User grants permission
     -> GitHub redirects to Callback Endpoint (:3000/auth/github/callback)
     -> Auth Backend creates Express Session cookie, sets HTTP-only cookie
     -> Auth Backend redirects browser to Frontend Dashboard (/dashboard)

[2. Deployment Request]
User -> Pastes "https://github.com/user/my-react-app" into DeployForm
     -> Clicks "Start Deployment" button
     -> Frontend executes POST :9000/project with { githubUrl }
     -> API Server generates Project ID ("abc123xyz")
     -> API Server sends RunTaskCommand to AWS ECS Fargate Cluster
     -> API Server returns HTTP 200 with { status: "queued", data: { randomId: "abc123xyz", url: "http://localhost:8000/abc123xyz" } }
     -> Frontend saves Project record into localStorage and redirects to /project/abc123xyz

[3. Log Subscription & Build Execution]
Frontend -> Initializes Socket.IO connection to ws://127.0.0.1:9001
         -> Emits "subscribe" event with channel "logs:abc123xyz"
AWS ECS  -> Spawns Fargate Task using Docker Image
Container -> Executes ENTRYPOINT ["/home/app/main.sh"]
         -> main.sh runs `git clone https://github.com/user/my-react-app /home/app/output`
         -> main.sh executes `exec node script.js`
script.js -> Publishes log string "Build started..." to Redis channel "logs:abc123xyz"
         -> Spawns child process `cd /home/app/output && npm install && npm run build`
         -> Child process standard output streams data chunks
         -> script.js publishes stdout/stderr chunks to Redis "logs:abc123xyz"
Redis    -> Fans out published messages to subscribed API Server
API Server-> Receives message, emits Socket.IO event to room "logs:abc123xyz"
Frontend -> Socket.IO listener catches event, updates state, appends line to BuildLogs UI terminal component

[4. S3 Artifact Upload & Completion]
script.js -> Child process completes with exit code 0
         -> Reads folder contents of `/home/app/output/dist` recursively
         -> Iterates through files:
              - Determines MIME type using `mime-types` library
              - Executes S3 PutObjectCommand to bucket "repocloud-..." key "__outputs/abc123xyz/<filename>"
              - Publishes log line "uploaded file <filename>" to Redis
         -> Publishes log line "Done..." to Redis
         -> Closes Redis publisher connection
Frontend -> Log parser detects "Done...", updates project status in localStorage to "Success"
         -> Enables "Visit Website" button in UI

[5. Serving Application via Proxy]
User -> Clicks "Visit Website" button (URL: http://localhost:8000/abc123xyz)
Browser -> Sends GET http://localhost:8000/abc123xyz
Reverse Proxy -> Intercepts request in Express middleware
              -> Extracts projectId = "abc123xyz"
              -> Rewrites request target to "https://repocloud-....s3.amazonaws.com/__outputs/abc123xyz"
              -> Rewrites path "/" to "/index.html" via `proxy.on("proxyReq")` handler
              -> Proxies request to S3, receives static file contents, streams response back to Browser
User -> Sees live running React application in browser!
```

---

# 9. Repository / Folder Structure

```text
RepoCloud/
├── .gitignore                      # Git exclusion rules for node_modules, build outputs, and env files
├── AUTH_SETUP.md                   # Technical integration documentation for Auth routes
├── README.md                       # Comprehensive project documentation
├── backend/                        # Root backend directory
│   ├── .env                        # Environment variable configuration for backend services
│   ├── package.json                # Main backend root dependencies and script entry points
│   ├── tsconfig.json               # TypeScript compiler configuration options
│   ├── api-server/                 # Deployment orchestration and Socket.IO real-time server
│   │   ├── index.js                # Express app triggering ECS Fargate tasks and subscribing to Redis
│   │   ├── package.json            # Dependencies: @aws-sdk/client-ecs, express, ioredis, socket.io
│   │   └── summary.md              # Architectural breakdown of the API server module
│   ├── build-server/               # Container build script infrastructure
│   │   ├── Dockerfile              # Ubuntu-based Dockerfile installing Node.js 24.x and Git
│   │   ├── main.sh                 # Entrypoint shell script executing git clone and script launch
│   │   ├── script.js               # Node process running npm build, streaming logs, uploading to S3
│   │   └── package.json            # Container dependencies: @aws-sdk/client-s3, ioredis, mime-types
│   ├── s3-reverse-proxy/           # HTTP reverse proxy serving deployments from S3
│   │   ├── index.js                # Express server utilizing http-proxy for URL rewriting and S3 fetching
│   │   └── package.json            # Dependencies: express, http-proxy, dotenv
│   ├── src/                        # TypeScript source code for GitHub OAuth backend service
│   │   ├── index.ts                # Main Express app initialising sessions, CORS, Passport, and routes
│   │   ├── generateRandomId.ts     # Helper utility for ID generation
│   │   ├── config/                 # Passport strategy setup
│   │   │   ├── passport.js         # Compiled JavaScript strategy export
│   │   │   └── passport.ts         # Passport GitHubStrategy configuration
│   │   └── routes/                 # Express route handlers
│   │       ├── authRoutes.js       # Compiled JS route handlers
│   │       ├── authRoutes.ts       # GitHub OAuth initiator and callback routes
│   │       └── authRoutes.d.ts     # Type definitions for auth routes
│   └── tests/                      # Automated test suite
│       ├── auth.test.js            # Integration test for GitHub auth endpoint redirection
│       └── project.test.js         # Placeholder for project API endpoint testing
└── frontend/                       # React 19 single-page client application
    ├── .env                        # Frontend environment variable specifying API base URL
    ├── .env.example                # Example environment template
    ├── .gitignore                  # Frontend git ignore configuration
    ├── eslint.config.js            # Flat ESLint rules for React code quality
    ├── index.html                  # HTML5 entry template containing root element mount target
    ├── package.json                # Dependencies: React 19, Vite, Tailwind CSS, Lucide, Socket.IO Client
    ├── vercel.json                 # Single Page Application rewrite rules for production hosting
    ├── vite.config.js              # Vite configuration loading Tailwind CSS plugin
    ├── public/                     # Static public web assets
    │   └── favicon.svg             # Application SVG favicon icon
    └── src/                        # React source application code
        ├── App.jsx                 # Main application wrapper with Router and AuthProvider
        ├── main.jsx                # DOM mount entry point loading styles and App component
        ├── index.css               # Global CSS import directive importing Tailwind CSS
        ├── assets/                 # SVGs and images used in landing pages
        ├── components/             # Reusable UI component modules
        │   ├── BuildLogs.jsx       # Terminal emulator component with line syntax highlighting & auto-scroll
        │   ├── CTA.jsx             # Call-to-action banner prompting login
        │   ├── DashboardPreview.jsx# Visual mockup component illustrating deployment workflows
        │   ├── DeployForm.jsx      # Input form capturing GitHub repository URL and initiating builds
        │   ├── DeploymentHistory.jsx# Container component rendering list of past projects
        │   ├── Features.jsx        # Grid component displaying platform feature cards
        │   ├── Footer.jsx          # Copyright footer component
        │   ├── Hero.jsx            # Hero section with animated gradient headers and action buttons
        │   ├── HowItWorks.jsx      # Step-by-step workflow overview component
        │   ├── Navbar.jsx          # Top navigation bar displaying brand logo, links, and user session status
        │   └── ProjectCard.jsx     # Card component rendering project title, badge status, and preview links
        ├── context/                # React Context state management
        │   ├── AuthContext.js      # Module re-export wrapper
        │   └── AuthContext.jsx     # Provider component holding global user, auth status, login/logout logic
        ├── hooks/                  # Custom React hooks
        │   ├── useAuth.js          # Hook re-exporting AuthContext context getter
        │   └── useDeployements.js  # Custom hook managing project list state, localStorage sync, and updates
        ├── pages/                  # Page-level view components
        │   ├── DashboardPage.jsx   # Primary user portal showing DeployForm and DeploymentHistory
        │   ├── LandingPage.jsx     # Marketing home page compiling Hero, Features, HowItWorks, CTA, Footer
        │   ├── LoginPage.jsx       # Auth login page providing "Continue with GitHub" button
        │   └── ProjectDetailPage.jsx# Detailed deployment view connecting to Socket.IO real-time log streams
        ├── routes/                 # Navigation route guards
        │   ├── AppRoutes.jsx       # Router configuration mapping paths to page views
        │   └── ProtectedRoute.jsx  # Security wrapper redirecting unauthenticated users to `/login`
        ├── services/               # External service integration clients
        │   ├── api.js              # Pre-configured Axios instance pointing to VITE_API_URL
        │   ├── authApi.js          # Dedicated Axios instance for Auth requests
        │   ├── authService.js      # Auth API client containing getCurrentUser, logout, loginWithGithub
        │   ├── deploymentService.js# API service client calling POST /project
        │   └── logSocket.js        # Socket.IO singleton manager establishing persistent WebSocket channels
        └── utils/                  # Utility helper modules
```

---

# 10. Frontend Architecture

The frontend is designed as a modern Single Page Application (SPA) leveraging React 19, Vite, and Tailwind CSS.

### State & Lifecycle Flow

```text
User Interaction
   │
   ▼
React Page / Component (DeployForm.jsx)
   │
   ▼
Custom Hook Call (useDeployements -> createProject)
   │
   ▼
Service Execution (deploymentService -> API POST /project)
   │
   ▼
State Modification & LocalStorage Persistence (repocloud_projects)
   │
   ▼
Navigation (ProjectDetailPage.jsx)
   │
   ▼
Real-Time Log Subscription (logSocket.js -> Socket.IO event message)
   │
   ▼
UI State Update & Dynamic Auto-Scroll (BuildLogs.jsx)
```

### Key Frontend Subsystems
- **Authentication State (`AuthContext.jsx`):** On initial page mount, `AuthProvider` calls `authService.getCurrentUser()`. If successful, `user` data is set and `isAuthenticated` becomes `true`. If unauthenticated, state reverts to `null` and `ProtectedRoute.jsx` blocks access to `/dashboard` and `/project/:id`.
- **Deployment State Management (`useDeployements.js`):** Encapsulates CRUD operations over deployment objects. State is stored in component state and automatically synced to `localStorage` under `repocloud_projects`. Status updates (`Building` -> `Success` / `Failed`) update both in-memory state and `localStorage`.
- **WebSocket Singleton Client (`logSocket.js`):** Prevents duplicate socket connections by exporting a singleton instance connected to `http://127.0.0.1:9001`. Maintains a `Set` of subscribed channels (`subscribedChannels`) and handles automatic re-subscribing on connection drops (`socket.on("connect")`).
- **Terminal View Component (`BuildLogs.jsx`):** Renders streaming log arrays inside a dark terminal container with macOS-style control dots. Parses log string keywords to dynamically apply Tailwind color styling:
  - `text-red-400`: Error messages, failure events, stderr outputs.
  - `text-green-400`: Upload confirmation messages, `Done...`, `Build is Complete`.
  - `text-purple-400`: Installation steps, `npm install`, build steps.
  - `text-zinc-300`: Standard diagnostic log messages.

---

# 11. Backend Architecture

The backend consists of three distinct Node.js Express server modules, isolating responsibilities for Authentication, Deployment Orchestration, and Static Proxying.

### Request Lifecycle in API Server

```text
Incoming HTTP Request (POST /project)
   │
   ▼
Express CORS Middleware (Validates Origin against process.env.FRONTEND_URL)
   │
   ▼
Express JSON Parser Middleware (Parses req.body)
   │
   ▼
Route Controller Handler (app.post("/project"))
   │
   ▼
Validation (Checks presence of githubUrl)
   │
   ▼
Unique ID Generation (uniqid() -> randomId)
   │
   ▼
AWS ECS Client Send (RunTaskCommand with container overrides)
   │
   ▼
HTTP JSON Response Output ({ status: "queued", data: { randomId, url } })
```

### Server Responsibilities Summary
1. **Main Auth Server (`backend/src/index.ts` - Port 3000):** Focuses on OAuth session handling via Express-Session and Passport.js.
2. **Orchestration Server (`backend/api-server/index.js` - Port 9000/9001):** Interfaces directly with AWS ECS and manages Socket.IO server instances.
3. **Reverse Proxy Server (`backend/s3-reverse-proxy/index.js` - Port 8000):** Acts as a dynamic gateway mapping incoming HTTP request paths directly to AWS S3 object keys.

---

# 12. API Documentation

### 1. Initiate GitHub OAuth Login
* **HTTP Method:** `GET`
* **Endpoint:** `/auth/github`
* **Server Port:** `3000`
* **Purpose:** Initiates the Passport.js GitHub OAuth authentication flow.
* **Authentication Required:** No.
* **Response:** `302 Found` (Redirects browser to `https://github.com/login/oauth/authorize`).

### 2. GitHub OAuth Callback
* **HTTP Method:** `GET`
* **Endpoint:** `/auth/github/callback`
* **Server Port:** `3000`
* **Purpose:** Passport callback endpoint processing GitHub code exchange, retrieving profile details, establishing session cookie.
* **Authentication Required:** No.
* **Response:** `302 Found` (Redirects browser to `${FRONTEND_URL}/dashboard`).

### 3. Get Current User Profile
* **HTTP Method:** `GET`
* **Endpoint:** `/auth/me`
* **Server Port:** `3000`
* **Purpose:** Returns authenticated user profile data derived from current session cookie.
* **Authentication Required:** Yes (Valid Session Cookie).
* **Response Code:** `200 OK` (Success), `401 Unauthorized` (Failure).
* **Example Response:**
```json
{
  "id": "149762467",
  "username": "Sahil1607cms",
  "avatar_url": "https://avatars.githubusercontent.com/u/149762467?v=4",
  "displayName": "Sahil Srivastava",
  "email": "user@example.com"
}
```

### 4. User Logout
* **HTTP Method:** `POST`
* **Endpoint:** `/auth/logout`
* **Server Port:** `3000`
* **Purpose:** Clears session data and destroys session cookie.
* **Authentication Required:** Yes.
* **Response Code:** `200 OK`.
* **Example Response:**
```json
{
  "message": "Logged out successfully"
}
```

### 5. Create Project Deployment
* **HTTP Method:** `POST`
* **Endpoint:** `/project`
* **Server Port:** `9000`
* **Purpose:** Triggers a containerized AWS ECS Fargate build task for the specified GitHub repository.
* **Authentication Required:** No (Currently open API endpoint).
* **Request Headers:** `Content-Type: application/json`
* **Request Body:**
```json
{
  "githubUrl": "https://github.com/user/react-demo-app"
}
```
* **Response Codes:** `200 OK` (Queued), `400 Bad Request` (Missing parameter), `500 Internal Server Error` (AWS ECS Trigger failure).
* **Example Response:**
```json
{
  "status": "queued",
  "data": {
    "randomId": "1b9d6bcd-8b7e-4d0d-a59d-648172750244",
    "url": "http://localhost:8000/1b9d6bcd-8b7e-4d0d-a59d-648172750244"
  }
}
```

---

# 13. Authentication and Authorization

Authentication is built using Passport.js with the `passport-github2` strategy and `express-session`.

### Login Flow Sequence

```text
User -> Clicks "Continue with GitHub"
     -> GET /auth/github
     -> Redirected to GitHub OAuth Consent Screen
     -> User accepts permissions (scope: ["user:email"])
     -> Redirected to GET /auth/github/callback?code=...
     -> Passport exchanges code for GitHub Access Token
     -> Profile object returned to serializeUser callback
     -> Session saved in Express session store (Cookie: connect.sid)
     -> Redirected to /dashboard
```

### Security Configurations in `backend/src/index.ts`
- **Session Cookie Attributes:**
  - `httpOnly: true`: Prevents client-side JavaScript access to session cookies, mitigating XSS attacks.
  - `secure: true`: Enforces transmission over HTTPS connections.
  - `sameSite: "none"`: Allows cross-origin session cookie sharing between backend domains and frontend SPAs.
  - `maxAge: 24 * 60 * 60 * 1000`: Sets session expiration to 24 hours.
- **Proxy Support:** `app.set("trust proxy", 1)` ensures Express correctly detects HTTPS request protocols when deployed behind load balancers (e.g., Render, AWS ALB).

---

# 14. GitHub Integration

RepoCloud integrates with GitHub in two distinct ways:
1. **OAuth Identity Integration:** Uses Passport GitHub Strategy to authenticate developers and fetch profile pictures, display names, and email addresses.
2. **Repository Source Cloning:** The build container receives the repository URL (`GIT_REPOSITORY__URL`) and executes native `git clone` inside the isolated container workspace:
   ```bash
   git clone "$GIT_REPOSITORY__URL" /home/app/output
   ```

### Core Passport Configuration (`backend/src/config/passport.ts`)

```typescript
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";

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
```

---

# 15. Deployment System

The deployment system separates request orchestration from task execution.

```text
Repository URL
      │
      ▼
Generation of Project ID (uniqid)
      │
      ▼
ECS Task Creation (RunTaskCommand)
      │
      ▼
Container Spawning (Ubuntu Container)
      │
      ▼
Git Clone Target Repository
      │
      ▼
Execute Installation (`npm install`)
      │
      ▼
Execute Compilation (`npm run build`)
      │
      ▼
Stream Terminal Output to Redis Channel (`logs:<projectId>`)
      │
      ▼
Read Output Directory (`dist/`)
      │
      ▼
Upload Asset Stream to S3 (`__outputs/<projectId>/...`)
      │
      ▼
Complete Build Signal (`Done...`)
      │
      ▼
Serving via Proxy (`http://localhost:8000/<projectId>`)
```

- **Deployment Identity:** Every deployment is assigned a unique alphanumeric ID via `uniqid()`. This ID identifies Redis channels (`logs:<id>`), S3 prefix keys (`__outputs/<id>/`), and preview URL routing paths.
- **Status Persistence:** The frontend tracks deployment status in `localStorage` under `Building`, `Success`, or `Failed`.

---

# 16. Build Pipeline

The build container executes a multi-step build sequence defined in `main.sh` and `script.js`.

```text
[Step 1: Container Startup] -> Entrypoint main.sh triggered
[Step 2: Code Retrieval]    -> Shell executes `git clone "$GIT_REPOSITORY__URL" /home/app/output`
[Step 3: Script Invocation] -> Shell executes `exec node script.js`
[Step 4: Build Execution]   -> script.js executes `cd /home/app/output && npm install && npm run build`
[Step 5: Log Streaming]     -> Node child process hooks stdout & stderr, publishing chunks to Redis
[Step 6: Folder Traversal]  -> script.js reads directory structure of `/home/app/output/dist`
[Step 7: S3 Uploading]      -> Iterates through build files, looks up MIME types, uploads via PutObjectCommand
[Step 8: Finalization]      -> Publishes "Done..." log line, closes Redis client connection, container exits
```

---

# 17. Docker

The builder container runs in a lightweight, isolated Ubuntu environment.

### Dockerfile (`backend/build-server/Dockerfile`)

```dockerfile
FROM ubuntu:focal

RUN apt-get update && \
    apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y nodejs
RUN apt-get install git -y

WORKDIR /home/app

COPY package*.json .

RUN npm install

COPY main.sh main.sh
COPY script.js script.js

RUN chmod +x main.sh
RUN chmod +x script.js

ENTRYPOINT [ "/home/app/main.sh" ]
```

### Instruction Explanation
- `FROM ubuntu:focal`: Uses Ubuntu 20.04 LTS as the base OS environment.
- `RUN apt-get update && apt-get install -y curl...`: Downloads and installs Node.js version 24.x and Git.
- `WORKDIR /home/app`: Sets the working directory inside the container.
- `COPY package*.json . && RUN npm install`: Copies container dependencies (`@aws-sdk/client-s3`, `ioredis`, `mime-types`) and installs them.
- `COPY main.sh script.js`: Copies the entrypoint script and Node build script.
- `RUN chmod +x...`: Grants execution permissions to shell scripts.
- `ENTRYPOINT [ "/home/app/main.sh" ]`: Specifies the command executed when the container starts.

---

# 18. AWS ECS / Fargate

AWS ECS Fargate allows RepoCloud to execute containerized builds serverlessly without managing virtual machines.

### ECS Orchestration Code (`backend/api-server/index.js`)

```javascript
const command = new RunTaskCommand({
  cluster: config.CLUSTER,
  taskDefinition: config.TASK,
  launchType: "FARGATE",
  count: 1,
  networkConfiguration: {
    awsvpcConfiguration: {
      assignPublicIp: "ENABLED",
      subnets: [
        "subnet-09a64efc6aba28d90",
        "subnet-0d686e817d583e6c1",
        "subnet-0d609ac4b1b77f88d",
      ],
      securityGroups: ["sg-066b752f481ed198d"],
    },  
  },
  overrides: {
    containerOverrides: [          
      {
        name: "build-server-image",
        environment: [
          { name: "GIT_REPOSITORY__URL", value: githubUrl },
          { name: "PROJECT_ID", value: randomId },
        ],
      },
    ],
  },
});
```

### Parameter Breakdown
- `launchType: "FARGATE"`: Instructs AWS to provision serverless compute resources on demand.
- `assignPublicIp: "ENABLED"`: Gives the container a public IP so it can clone GitHub repos, download npm packages, connect to Redis, and upload files to S3.
- `containerOverrides`: Dynamically injects the target `GIT_REPOSITORY__URL` and generated `PROJECT_ID` into the container environment for the build run.

---

# 19. Amazon ECR

Amazon ECR (Elastic Container Registry) hosts the Docker image compiled from `backend/build-server/Dockerfile`.

### Build, Tag, and Push Commands
```bash
# 1. Authenticate Docker CLI to AWS ECR registry
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 623244137506.dkr.ecr.ap-south-1.amazonaws.com

# 2. Build local Docker image
docker build -t builder-task ./backend/build-server

# 3. Tag image for ECR repository
docker tag builder-task:latest 623244137506.dkr.ecr.ap-south-1.amazonaws.com/builder-task:latest

# 4. Push container image to AWS ECR
docker push 623244137506.dkr.ecr.ap-south-1.amazonaws.com/builder-task:latest
```

---

# 20. Amazon S3

Amazon S3 hosts compiled static distribution files.

### S3 Directory Structure
```text
repocloud-623244137506-ap-south-1-an/ (S3 Bucket)
└── __outputs/
    ├── 1b9d6bcd-8b7e-4d0d-a59d-648172750244/
    │   ├── index.html
    │   ├── favicon.ico
    │   └── assets/
    │       ├── index-Dk3n28d.js
    │       └── index-C93k2s.css
    └── 8f3c2aaa-712b-422a-881c-01991278199d/
        └── index.html
```

### S3 Upload Code (`backend/build-server/script.js`)

```javascript
const distFolderPath = path.join(__dirname, "output", "dist");
const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true });

for (const file of distFolderContents) {
  const filePath = path.join(distFolderPath, file);
  if (fs.lstatSync(filePath).isDirectory()) continue;

  const command = new PutObjectCommand({
    Bucket: "repocloud-623244137506-ap-south-1-an",
    Key: `__outputs/${PROJECT_ID}/${file}`,
    Body: fs.createReadStream(filePath),
    ContentType: mime.lookup(filePath) || "application/octet-stream",
  });

  await s3Client.send(command);
}
```

---

# 21. Reverse Proxy

The reverse proxy (`backend/s3-reverse-proxy/index.js`) listens on port 8000 and maps incoming project URLs to Amazon S3 bucket keys.

### Reverse Proxy Code (`backend/s3-reverse-proxy/index.js`)

```javascript
import express from "express";
import httpProxy from "http-proxy";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });
const app = express();
const PORT = process.env.PORT || process.env.S3_PORT || 8000;

const proxy = httpProxy.createProxy();

if (!process.env.BASE_PATH) {
  throw new Error("BASE_PATH is not defined");
}

app.use((req, res) => {
  const parts = req.path.split("/").filter(Boolean);

  if (parts.length === 0) {
    return res.status(400).send("Missing project id");
  }
  const projectId = parts[0];
  const basePath = process.env.BASE_PATH.replace(/\/$/, "");
  const target = `${basePath}/${projectId}`;

  req.url = req.url.replace(`/${projectId}`, "") || "/";

  proxy.web(req, res, {
    target,
    changeOrigin: true,
  });
});

proxy.on("proxyReq", (proxyReq, req, res) => {
  const url = req.url;
  if (url === "/") proxyReq.path += "/index.html";
});

app.listen(PORT, () => console.log(`Reverse proxy server running on port ${PORT}`));
```

---

# 22. Redis Pub/Sub

Redis acts as a decoupled message bus connecting build containers to the Socket.IO server.

```text
Build Container (Publisher)
  │
  ▼  Redis PUBLISH `logs:<projectId>` '{"log": "npm install..."}'
Redis Server Channel
  │
  ▼  Redis PSUBSCRIBE `logs:*`
API Server (Subscriber)
  │
  ▼  io.to("logs:<projectId>").emit("message", logData)
Socket.IO Connection
  │
  ▼
Browser UI Terminal (BuildLogs.jsx)
```

---

# 23. Real-Time Build Logs

### Server Log Broadcaster (`backend/api-server/index.js`)

```javascript
async function initRedisSubscribe() {
  subscriber.psubscribe("logs:*");
  const recentMessages = new Map();

  subscriber.on("pmessage", (pattern, channel, message) => {
    try {
      const now = Date.now();
      const entry = recentMessages.get(channel);
      if (entry && entry.lastMessage === message && now - entry.lastTs < 500) {
        return; // Deduplicate rapid identical log entries
      }
      recentMessages.set(channel, { lastMessage: message, lastTs: now });
      io.to(channel).emit("message", message);
    } catch (err) {
      console.error("Error processing Redis message:", err);
    }
  });
}
```

---

# 24. Database Design

RepoCloud currently uses **browser `localStorage`** for client-side deployment history tracking and **Express Session Memory Store** for user session state.

```mermaid
erDiagram
    USER {
        string id PK "GitHub User ID"
        string username "GitHub Handle"
        string displayName "Full User Name"
        string avatar_url "GitHub Avatar URL"
        string email "User Email"
    }

    DEPLOYMENT {
        string id PK "Project UUID / Uniqid"
        string name "Derived Project Name"
        string repoUrl "Target GitHub Repository"
        string status "Building | Success | Failed"
        string url "Generated Preview Link"
        array logs "Stored Build Log Strings"
        datetime createdAt "ISO Timestamp"
    }

    USER ||--o{ DEPLOYMENT : triggers
```

---

# 25. Deployment State Machine

```text
                ┌──────────────┐
                │  SUBMITTED   │
                └──────┬───────┘
                       │ POST /project
                       ▼
                ┌──────────────┐
                │   BUILDING   │
                └──────┬───────┘
                       │
         ┌─────────────┴─────────────┐
         │                           │
  "Done..." detected           Error / Failure detected
         │                           │
         ▼                           ▼
  ┌──────────────┐           ┌──────────────┐
  │   SUCCESS    │           │    FAILED    │
  └──────────────┘           └──────────────┘
```

---

# 26. Core Code

### API Server (`backend/api-server/index.js`)
```javascript
app.post("/project", async (req, res) => {
  const randomId = uniqid();
  const githubUrl = req.body.githubUrl;

  if (!githubUrl) {
    return res.status(400).json({ error: "githubUrl is required" });
  }

  try {
    const command = new RunTaskCommand({
      cluster: config.CLUSTER,
      taskDefinition: config.TASK,
      launchType: "FARGATE",
      count: 1,
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: "ENABLED",
          subnets: ["subnet-09a64efc6aba28d90", "subnet-0d686e817d583e6c1", "subnet-0d609ac4b1b77f88d"],
          securityGroups: ["sg-066b752f481ed198d"],
        },  
      },
      overrides: {
        containerOverrides: [          
          {
            name: "build-server-image",
            environment: [
              { name: "GIT_REPOSITORY__URL", value: githubUrl },
              { name: "PROJECT_ID", value: randomId },
            ],
          },
        ],
      },
    });

    const ecsResponse = await ecsClient.send(command);
    return res.json({
      status: "queued",
      data: { randomId, url: `${process.env.REVERSE_PROXY_URL}/${randomId}` },
    });
  } catch (error) {
    return res.status(500).json({ error: "AWS ECS Task trigger failed", details: error.message });
  }
});
```

---

# 27. Important Algorithms and Logic

### Recursive Directory Traversal & S3 Upload (`backend/build-server/script.js`)

```javascript
const distFolderPath = path.join(__dirname, "output", "dist");
const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true });

for (const file of distFolderContents) {
  const filePath = path.join(distFolderPath, file);
  if (fs.lstatSync(filePath).isDirectory()) continue;

  const command = new PutObjectCommand({
    Bucket: "repocloud-623244137506-ap-south-1-an",
    Key: `__outputs/${PROJECT_ID}/${file}`,
    Body: fs.createReadStream(filePath),
    ContentType: mime.lookup(filePath) || "application/octet-stream",
  });

  await s3Client.send(command);
}
```
* **Algorithm Efficiency:** Uses `fs.createReadStream(filePath)` to stream large files directly to S3 without loading entire file buffers into container memory, preventing RAM exhaustion on large build outputs.

---

# 28. Environment Variables

| Variable | Location | Purpose | Example Value | Required |
| :--- | :--- | :--- | :--- | :--- |
| `GITHUB_CLIENT_ID` | Backend (`.env`) | GitHub OAuth Client App ID | `Iv1.8a92...` | Yes |
| `GITHUB_CLIENT_SECRET` | Backend (`.env`) | GitHub OAuth Client Secret | `3k2j9s8...` | Yes |
| `SESSION_SECRET` | Backend (`.env`) | Secret key for signing Express session cookies | `super-secret-key` | Yes |
| `FRONTEND_URL` | Backend (`.env`) | URL of frontend SPA for CORS and OAuth redirects | `http://localhost:5173` | Yes |
| `VITE_API_URL` | Frontend (`.env`) | Base URL pointing to Main Backend Auth service | `http://localhost:3000` | Yes |
| `REDIS_URI` | API Server (`.env`)| TLS Connection String for Redis/Valkey instance | `rediss://default:pwd@host:port` | Yes |
| `BASE_PATH` | Reverse Proxy (`.env`)| S3 base HTTP path prefix for serving artifacts | `https://bucket.s3.region.amazonaws.com/__outputs/` | Yes |
| `IAM_ACCESS_KEY` | API / Build (`.env`)| AWS IAM User Access Key | `AKIAIOSFODNN7EXAMPLE` | Yes |
| `IAM_SECRET_KEY` | API / Build (`.env`)| AWS IAM User Secret Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | Yes |

---

# 29. Local Development Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Sahil1607cms/RepoCloud.git
cd RepoCloud

# Install backend dependencies
cd backend && npm install

# Install API Server dependencies
cd api-server && npm install

# Install Reverse Proxy dependencies
cd ../s3-reverse-proxy && npm install

# Install Frontend dependencies
cd ../../frontend && npm install
```

### 2. Configure Environment Files
- Create `backend/.env` with your GitHub OAuth credentials and session secrets.
- Create `frontend/.env` setting `VITE_API_URL=http://localhost:3000`.
- Create `backend/s3-reverse-proxy/.env` setting `BASE_PATH=https://<your-bucket>.s3.<region>.amazonaws.com/__outputs/`.

### 3. Run Services
In separate terminal windows:
```bash
# Terminal 1: Auth Backend
cd backend && npm start

# Terminal 2: API & Socket Server
cd backend/api-server && node index.js

# Terminal 3: Reverse Proxy
cd backend/s3-reverse-proxy && node index.js

# Terminal 4: Frontend Client
cd frontend && npm run dev
```

---

# 30. Docker Development

To build and test the build server container locally:

```bash
# Build image locally
docker build -t repocloud-builder ./backend/build-server

# Run container locally with test environment variables
docker run -e GIT_REPOSITORY__URL="https://github.com/user/test-repo" \
           -e PROJECT_ID="test-123" \
           -e REDIS_URI="rediss://..." \
           -e IAM_ACCESS_KEY="your-access-key" \
           -e IAM_SECRET_KEY="your-secret-key" \
           repocloud-builder
```

---

# 31. AWS Deployment Setup

1. **S3 Bucket Creation:** Create an S3 bucket named `repocloud-...`. Enable public read permissions or set an appropriate bucket policy.
2. **ECR Repository:** Create an ECR repository named `builder-task`.
3. **ECS Fargate Cluster:** Create an ECS cluster named `RepoCloud`.
4. **Task Definition:** Create a Fargate task definition (`builder-task`) configured with 1 vCPU, 2 GB RAM, and container name `build-server-image`.
5. **VPC Subnets & Security Groups:** Configure VPC subnets with outbound internet access to enable git cloning and S3 uploads.

---

# 32. AWS CLI Commands

```bash
# Authenticate ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin 623244137506.dkr.ecr.ap-south-1.amazonaws.com

# Build & Push Builder Image
docker build -t builder-task ./backend/build-server
docker tag builder-task:latest 623244137506.dkr.ecr.ap-south-1.amazonaws.com/builder-task:latest
docker push 623244137506.dkr.ecr.ap-south-1.amazonaws.com/builder-task:latest

# Manually Trigger ECS Task via CLI
aws ecs run-task \
  --cluster RepoCloud \
  --task-definition builder-task:3 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-09a64efc6aba28d90],securityGroups=[sg-066b752f481ed198d],assignPublicIp=ENABLED}"
```

---

# 33. Error Handling

- **Git Clone Failures:** Captured via `p.stderr` in `script.js` and pushed to Redis. Renders red error text in client terminal.
- **Build Compilation Failures:** `script.js` emits stderr output lines containing `npm ERR!` or `exit code`. The client parses these keywords and switches status to `Failed`.
- **AWS ECS Task Trigger Errors:** `api-server` catches SDK failures and returns an HTTP 500 error payload with error details.
- **Missing Project Proxy Requests:** The reverse proxy checks path length and returns an HTTP 400 "Missing project id" error if no ID is present.

---

# 34. Security

- **Container Isolation:** Every build executes in a ephemeral, sandboxed Docker container isolated within an AWS VPC.
- **HTTP-Only Session Cookies:** Session tokens cannot be accessed via client-side JavaScript (`httpOnly: true`).
- **Secret Protection:** Production keys are loaded via environment variables rather than committed to source repositories.

---

# 35. Scalability

- **Serverless Scaling:** AWS ECS Fargate automatically provisions compute capacity for concurrent build tasks.
- **Stateless Routers:** The API server and Reverse Proxy maintain no local state and can scale horizontally behind load balancers.
- **S3 Durability:** Static asset serving delegates file requests directly to Amazon S3's highly distributed infrastructure.

---

# 36. Performance

- **Streamed Uploads:** Build artifacts are streamed to S3 using `fs.createReadStream` to maintain minimal RAM usage.
- **WebSocket Streaming:** Log events are pushed immediately to client sockets over WebSockets, bypassing slow HTTP polling loops.

---

# 37. Reliability

- **Socket Reconnection:** `logSocket.js` re-establishes dropped WebSocket connections automatically (up to 5 attempts) and re-subscribes to active log channels.
- **Log Deduplication:** `api-server` suppresses duplicate Redis log messages emitted within 500ms windows to reduce UI rendering churn.

---

# 38. Design Decisions

- **Why Docker & Fargate?** Provides reproducible build environments with complete compute and filesystem isolation for untrusted repositories.
- **Why Redis Pub/Sub?** Decouples ephemeral build containers from long-lived client WebSocket connections.
- **Why S3 & Reverse Proxy?** Separates expensive build operations from static asset delivery while maintaining custom subdomain routing.

---

# 39. Trade-offs

| Decision | Advantage | Disadvantage | Rationale |
| :--- | :--- | :--- | :--- |
| **ECS Fargate vs EC2** | Zero server management; total isolation | Higher per-minute compute cost | Preferred security and zero idle infrastructure cost |
| **S3 vs Local Filesystem** | Unlimited scalable storage | Network latency during upload step | Enables horizontal scaling across build nodes |
| **Redis Pub/Sub vs Polling** | Instant real-time terminal feedback | Requires dedicated Redis instance | Essential for modern developer platform experience |

---

# 40. Testing

### Existing Tests (`backend/tests/auth.test.js`)
Uses `supertest` and `jest` to verify HTTP redirection behavior on the `/auth/github` endpoint.

```javascript
import request from "supertest";
import app from "../app";

describe("GitHub Authentication", () => {
  test("GET /auth/github should redirect user to GitHub", async () => {
    const response = await request(app).get("/auth/github");
    expect(response.status).toBe(302);
  });
});
```

---

# 41. Example Deployment

```text
1. User logs in using GitHub OAuth.
2. User enters repository: https://github.com/user/my-vite-app
3. User clicks "Start Deployment".
4. API Server receives request, assigns project ID "proj-99", triggers ECS Fargate Task.
5. Fargate task executes `git clone` and `npm run build`.
6. Live terminal logs stream onto user screen:
   - "Build started..."
   - "npm install finished..."
   - "uploading index.html..."
   - "Done..."
7. Status changes to "Success" and displays link: http://localhost:8000/proj-99
8. User clicks link and views live application hosted via S3 proxy.
```

---

# 42. Logs and Observability

- **Client Terminal:** Real-time terminal output displayed via `BuildLogs.jsx`.
- **AWS CloudWatch:** Container standard output and task status events logged directly to CloudWatch logs.
- **Server Console:** Express servers output formatted connection and error events to standard out.

---

# 43. Screenshots

## Dashboard Overview
![Dashboard Placeholder](frontend/src/assets/hero.png)

---

# 44. Demo

- **Local Preview Server:** `http://localhost:5173`
- **Reverse Proxy Gateway:** `http://localhost:8000/<projectId>`

---

# 45. Project Challenges

- **Real-Time Log Fanout:** Solution: Utilized Redis Pub/Sub pattern subscriptions (`psubscribe("logs:*")`) coupled with Socket.IO room channels.
- **Proxying S3 Subpaths:** Solution: Implemented Express path extraction coupled with `http-proxy` path rewriting and `proxyReq` event handlers to append `index.html`.

---

# 46. Future Improvements

- [ ] Database integration (PostgreSQL / MongoDB) for multi-tenant deployment persistence.
- [ ] Build artifact caching (caching `node_modules` across runs).
- [ ] Custom domain mapping and automatic TLS SSL certificate issuance.
- [ ] Support for non-standard build outputs (`build/`, `out/`, `public/`).

---

# 47. Project Statistics

- **Frontend Components:** 11 (`BuildLogs`, `DeployForm`, `ProjectCard`, `Navbar`, etc.)
- **Frontend Pages:** 4 (`LandingPage`, `LoginPage`, `DashboardPage`, `ProjectDetailPage`)
- **Backend Microservices:** 3 (`backend/src`, `api-server`, `s3-reverse-proxy`)
- **AWS Services Integrated:** 4 (ECS Fargate, ECR, S3, IAM)

---

# 48. Complete Data Flow

```mermaid
sequenceDiagram
    participant User as User Browser
    participant React as React SPA
    participant Auth as Auth Server (:3000)
    participant API as API Server (:9000)
    participant ECS as AWS ECS Fargate
    participant Redis as Redis Pub/Sub
    participant S3 as Amazon S3
    participant Proxy as Reverse Proxy (:8000)

    User->>React: Click Deploy (repo URL)
    React->>API: POST /project { githubUrl }
    API->>ECS: Send RunTaskCommand
    API-->>React: Return { randomId, url }
    React->>React: Navigate to /project/:id
    React->>API: Socket.IO join channel "logs:id"
    ECS->>ECS: git clone & npm run build
    ECS->>Redis: Publish stdout/stderr to "logs:id"
    Redis->>API: Message received on "logs:id"
    API->>React: Emit Socket.IO message
    React->>User: Render log line in terminal UI
    ECS->>S3: Upload compiled files to __outputs/id/
    ECS->>Redis: Publish "Done..."
    React->>User: Mark status "Success" & show link
    User->>Proxy: GET http://localhost:8000/id
    Proxy->>S3: Proxy request to S3 bucket key
    S3-->>Proxy: Stream static files
    Proxy-->>User: Render live application
```

---

# 49. Code Walkthrough

1. **Submission:** User enters URL in `DeployForm.jsx`, calling `createProject(repoUrl)` inside `useDeployements.js`.
2. **API Handshake:** `deploymentService.js` sends `POST /project` to `api-server/index.js`.
3. **Container Launch:** `api-server` generates `randomId`, calls AWS SDK `RunTaskCommand`, and responds to client.
4. **Log Streaming:** Container runs `script.js`, publishing `p.stdout` chunks to Redis channel `logs:<PROJECT_ID>`. `api-server` receives Redis pub/sub messages and emits them to Socket.IO room `logs:<PROJECT_ID>`.
5. **UI Update:** `ProjectDetailPage.jsx` receives WebSocket log events, updating `BuildLogs.jsx` and detecting completion keywords (`Done...`).
6. **Serving Assets:** Accessing `http://localhost:8000/<PROJECT_ID>` hits `s3-reverse-proxy/index.js`, which proxies the request to S3 object key `__outputs/<PROJECT_ID>/index.html`.

---

# 50. Interview Explanation

### 30-Second Summary
RepoCloud is a full-stack, cloud-native deployment platform that automates building and hosting static web apps from GitHub repositories. It uses Express and AWS SDK to launch isolated Docker containers on AWS ECS Fargate, streams build logs in real time to a React UI via Redis Pub/Sub and Socket.IO, and serves compiled static assets from Amazon S3 through a custom NodeJS reverse proxy.

### 2-Minute Summary
RepoCloud acts as a lightweight alternative to platform services like Vercel or Netlify. When a user authenticates via GitHub OAuth and submits a repository URL, the system generates a unique project ID and triggers an on-demand AWS ECS Fargate container. The container sandboxes the execution environment, cloning the repo, running `npm install && npm run build`, streaming terminal logs live over a Redis Pub/Sub event bus to a Socket.IO WebSocket server, and uploading built static assets directly to Amazon S3. A custom HTTP reverse proxy strips project IDs from incoming request paths and transparently routes incoming web traffic to the S3 bucket assets, allowing instant preview deployments.

### 5-Minute Technical Summary
Architecture-wise, RepoCloud separates user authentication, build orchestration, execution compute, messaging, object storage, and reverse proxying into decoupled microservices. The main auth backend handles GitHub OAuth2 via Passport.js and sets HTTP-only session cookies. The API server handles deployment triggers by calling AWS SDK v3 `RunTaskCommand` with task environment overrides (`GIT_REPOSITORY__URL`, `PROJECT_ID`). 

The build container runs on an Ubuntu image in AWS ECS Fargate with assigned public network interfaces. A shell script executes `git clone`, followed by a Node.js process (`script.js`) that captures process stdout/stderr streams and publishes JSON payloads to Redis channels (`logs:<projectId>`). The API server pattern-subscribes (`psubscribe("logs:*")`) to Redis messages and emits them to connected Socket.IO room clients, where React updates state and auto-scrolls a virtualized terminal UI. 

Upon build completion, `script.js` uses `mime-types` to look up MIME headers and streams build outputs recursively to Amazon S3 using `PutObjectCommand`. The reverse proxy server intercepts incoming HTTP traffic, parses the project ID from the path, rewrites target paths to S3 bucket keys, and automatically appends `index.html` on root requests using `http-proxy`.

### Likely Interview Questions & Answers

1. **Q: Why use Redis Pub/Sub between the container and API server instead of direct HTTP/WebSocket connections?**
   * **A:** Decoupling build containers from client WebSockets prevents containers from needing to track client connection IP addresses or handle socket disconnections. Containers simply publish logs to a light Redis channel and terminate, allowing the API server to manage long-lived browser sockets independently.

2. **Q: How does the system handle security and arbitrary code execution?**
   * **A:** Untrusted repository build scripts are strictly isolated inside ephemeral AWS ECS Fargate tasks with dedicated VPC networking and constrained IAM roles, keeping host systems and internal application databases completely isolated.

3. **Q: How does the Reverse Proxy handle static asset paths like CSS or JavaScript files?**
   * **A:** The proxy extracts the leading `projectId` segment from incoming request paths (e.g. `/abc123/assets/index.js`), strips `/abc123`, and proxies the remainder (`/assets/index.js`) to the S3 target path `BASE_PATH/abc123/assets/index.js`.

---

# 51. Glossary

- **ECS Fargate:** AWS's serverless compute engine for containers that runs Docker containers without needing to manage virtual machines.
- **Pub/Sub (Publish/Subscribe):** A messaging pattern where message senders (publishers) push messages to logical channels without knowing who the receivers (subscribers) are.
- **Reverse Proxy:** An intermediate server that receives incoming client requests, forwards them to appropriate destination servers (such as S3), and returns the fetched resources back to clients.
- **MIME Type:** A standard indicator (e.g., `text/html`, `application/javascript`) sent in HTTP headers that tells browsers how to process file contents.
- **Socket.IO:** A library providing low-latency, bidirectional, event-based communication between web clients and Node.js servers over WebSockets.

---

# 52. Complete Project Summary

RepoCloud demonstrates a modern cloud-native deployment pipeline combining React 19, Node.js Express microservices, AWS ECS Fargate, Amazon S3, Redis Pub/Sub, and dynamic reverse proxying. By isolating build workloads in ephemeral serverless containers, streaming real-time terminal diagnostics over WebSockets, and transparently routing incoming requests to object storage assets, RepoCloud provides a robust, scalable architecture for continuous deployment and instant web application hosting.
