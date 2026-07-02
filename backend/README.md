# RepoCloud Backend - API & Services Documentation

## Table of Contents
- [Project Overview](#project-overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Running the Services](#running-the-services)
- [API Documentation](#api-documentation)
- [Infrastructure Requirements](#infrastructure-requirements)

---

## Project Overview

RepoCloud is a cloud-based CI/CD platform that automates GitHub repository builds and deployments. The backend consists of multiple microservices that work together to:

1. Accept GitHub repository URLs from users
2. Clone and build projects in isolated Docker containers
3. Upload build artifacts to AWS S3
4. Serve projects via subdomains through an S3 reverse proxy
5. Stream real-time build logs via WebSocket connections

---

## Architecture

### Service Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                    │
└────────────┬──────────────────────────────────┬─────────────┘
             │                                  │
    API Calls│                          WebSocket│
             │                                  │
    ┌────────▼─────────────┐         ┌─────────▼─────────┐
    │   API Server         │         │ Socket.IO Server  │
    │   (Port 9000)        │         │ (Port 9001)       │
    │                      │         │                   │
    │  - Receives requests │         │ - Real-time logs  │
    │  - Validates GitHub  │         │ - Build status    │
    │  - Triggers builds   │         │ - Error streams   │
    └──────────┬───────────┘         └─────────────────────┘
               │
         AWS ECS│
               │
    ┌──────────▼──────────────────┐
    │   Build Server (Docker)      │
    │   - Git clone                │
    │   - npm install              │
    │   - npm run build            │
    │   - Upload to S3             │
    └──────────────────────────────┘
               │
               │ (Upload artifacts)
               │
    ┌──────────▼──────────────────┐
    │   AWS S3                     │
    │ (__outputs/ bucket)          │
    └──────────────────────────────┘
               │
    ┌──────────▼──────────────────┐
    │ S3 Reverse Proxy             │
    │ (Port 8000)                  │
    │ - Subdomain routing          │
    │ - Proxies to S3              │
    └──────────────────────────────┘
               │
    ┌──────────▼──────────────────┐
    │  Client Browsers             │
    │  (project-id.domain.com)     │
    └──────────────────────────────┘
```

### Key Technologies

- **API Server**: Express.js, Node.js
- **Container Orchestration**: AWS ECS Fargate
- **Real-time Communication**: Socket.IO
- **Message Queue**: Redis/Valkey
- **File Storage**: AWS S3
- **Build Environment**: Docker

---

## Prerequisites

### System Requirements

- Node.js v22.x or higher
- npm v10.x or higher
- Docker (for running build containers)
- Git

### AWS Resources

- ECS Cluster (Fargate)
- ECS Task Definition for build service
- S3 Bucket for outputs
- IAM credentials with appropriate permissions

### External Services

- Redis/Valkey instance (for pub/sub messaging)
- GitHub repository access

### Required Environment Secrets

- AWS Access Key ID
- AWS Secret Access Key
- Redis/Valkey connection string

---

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Navigate to backend directory
cd backend

# Install root dependencies
npm install

# Install dependencies for each service
cd api-server && npm install && cd ..
cd build-server && npm install && cd ..
cd s3-reverse-proxy && npm install && cd ..
```

### 2. Build TypeScript (if applicable)

```bash
# From backend root
npm run build
```

### 3. Configure AWS Credentials

```bash
# Option 1: Via environment variables (see Environment Variables section)
# Option 2: Via AWS CLI
aws configure

# Option 3: Via credentials file (~/.aws/credentials)
```

### 4. Docker Setup for Build Server

```bash
# Build the Docker image for the build server
cd build-server
docker build -t repocloud-builder:latest .
cd ..

# Tag and push to your Docker registry
# docker tag repocloud-builder:latest <your-registry>/repocloud-builder:latest
# docker push <your-registry>/repocloud-builder:latest
```

---

## Environment Variables

### API Server Environment

Create a `.env` file in the `api-server` directory:

```env
# Server Configuration
PORT=9000
SOCKET_PORT=9001

# AWS Configuration
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>

# ECS Configuration
ECS_CLUSTER_ARN=arn:aws:ecs:ap-south-1:623244137506:cluster/RepoCloud
ECS_TASK_DEFINITION=arn:aws:ecs:ap-south-1:623244137506:task-definition/builder-task:3

# VPC Configuration (Fargate requires VPC)
ECS_SUBNETS=subnet-09a64efc6aba28d90,subnet-0d686e817d583e6c1,subnet-0d609ac4b1b77f88d
ECS_SECURITY_GROUPS=sg-066b752f481ed198d

# Redis Configuration
REDIS_URL=rediss://default:<password>@valkey-instance:22051

# Feature Flags
LOG_LEVEL=debug
CORS_ORIGIN=http://localhost:5173,https://yourdomain.com
```

### Build Server Environment

Set via ECS Task Definition overrides:

```env
GIT_REPOSITORY__URL=<github-repo-url>
PROJECT_ID=<unique-project-id>
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
REDIS_URL=rediss://default:<password>@valkey-instance:22051
```

### S3 Reverse Proxy Environment

Create a `.env` file in the `s3-reverse-proxy` directory:

```env
PORT=8000
S3_BUCKET=repocloud-623244137506-ap-south-1-an
S3_BASE_PATH=https://repocloud-623244137506-ap-south-1-an.s3.ap-south-1.amazonaws.com/__outputs/
AWS_REGION=ap-south-1
```

---

## Running the Services

### Option 1: Run Individual Services (Development)

#### Terminal 1 - API Server

```bash
cd backend/api-server
npm install
node index.js

# Output: Api server running on port 9000
# Output: Socket Server 9001
```

#### Terminal 2 - Build Server (Local Testing)

```bash
# Note: Build server typically runs in Docker via ECS
# For local testing:
cd backend/build-server
npm install
export GIT_REPOSITORY__URL="https://github.com/user/repo"
export PROJECT_ID="test-project-123"
node script.js
```

#### Terminal 3 - S3 Reverse Proxy

```bash
cd backend/s3-reverse-proxy
npm install
node index.js

# Output: Reverse proxy server running on port 8000
```

### Option 2: Docker Compose (Production-like)

```bash
# From backend root
docker-compose up -d

# View logs
docker-compose logs -f api-server
docker-compose logs -f s3-reverse-proxy
```

### Option 3: AWS ECS Deployment

The build server runs automatically via ECS Fargate when triggered through the API server.

```bash
# The API server sends RunTaskCommand to ECS
# No manual deployment needed - fully automated
```

---

## API Documentation

### Base URL

**Development**: `http://localhost:9000`
**Production**: `https://api.yourdomain.com`

### Authentication

Currently, the API does not implement authentication. Consider adding authentication middleware before production deployment.

### Common Headers

```json
{
  "Content-Type": "application/json",
  "Accept": "application/json"
}
```

---

### Endpoint: Create Deployment

Creates a new deployment by triggering a build for a GitHub repository.

#### Request

```
POST /project
```

**Content-Type**: `application/json`

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `githubUrl` | string | Yes | Full GitHub repository URL (e.g., `https://github.com/user/repo`) |

#### Request Body Example

```json
{
  "githubUrl": "https://github.com/facebook/react"
}
```

#### Response - Success (202 Accepted)

```json
{
  "status": "queued",
  "data": {
    "randomId": "abc123def456",
    "url": "http://abc123def456.localhost:8000"
  }
}
```

**Status Code**: `200 OK` (Note: Should be 202 Accepted for async operations)

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | Deployment status: `"queued"` |
| `data.randomId` | string | Unique project identifier |
| `data.url` | string | Temporary URL to access project after build |

#### Response - Error (400 Bad Request)

```json
{
  "error": "GitHub URL is required",
  "code": "INVALID_REQUEST"
}
```

**Status Code**: `400 Bad Request`

#### Example cURL Request

```bash
curl -X POST http://localhost:9000/project \
  -H "Content-Type: application/json" \
  -d '{
    "githubUrl": "https://github.com/user/repo"
  }'
```

#### Example JavaScript/Fetch Request

```javascript
const response = await fetch('http://localhost:9000/project', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    githubUrl: 'https://github.com/user/repo'
  })
});

const data = await response.json();
console.log('Project ID:', data.data.randomId);
console.log('Access URL:', data.data.url);
```

#### Deployment Flow

1. Client sends POST request with GitHub URL
2. API Server generates unique `randomId`
3. API Server triggers ECS task with:
   - `GIT_REPOSITORY__URL`: GitHub URL
   - `PROJECT_ID`: randomId
4. Build Server (in Docker):
   - Clones repository
   - Runs `npm install`
   - Runs `npm run build`
   - Publishes build logs to Redis
5. Build artifacts uploaded to S3 at `__outputs/{randomId}/`
6. Project accessible at `http://{randomId}.localhost:8000`

---

### WebSocket Connection: Real-time Build Logs

Real-time build logs are streamed via Socket.IO on port 9001.

#### Connection

**Server**: `http://localhost:9001`

#### Event: Subscribe to Project Logs

```javascript
const socket = io('http://localhost:9001');

socket.emit('subscribe', 'logs:abc123def456');
socket.on('message', (msg) => {
  console.log('Log:', msg);
});
```

#### Log Message Format

```json
{
  "log": "npm install started...\n"
}
```

or

```json
{
  "log": "Error: Package not found\n"
}
```

#### Example Client Code

```javascript
import io from 'socket.io-client';

function watchBuildLogs(projectId) {
  const socket = io('http://localhost:9001');
  
  socket.on('connect', () => {
    console.log('Connected to log server');
    socket.emit('subscribe', `logs:${projectId}`);
  });
  
  socket.on('message', (message) => {
    console.log('Build log:', message);
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from log server');
  });
}

watchBuildLogs('abc123def456');
```

---

### Error Handling

#### Standard Error Response Format

```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {}
}
```

#### Common Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `INVALID_REQUEST` | 400 | Missing required parameters |
| `INVALID_GITHUB_URL` | 400 | Invalid GitHub URL format |
| `ECS_TASK_FAILED` | 500 | Failed to start ECS task |
| `REDIS_CONNECTION_ERROR` | 503 | Redis connection failed |
| `S3_UPLOAD_FAILED` | 500 | Failed to upload to S3 |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |

---

## Infrastructure Requirements

### AWS Services

#### 1. ECS Cluster

```yaml
Name: RepoCloud
LaunchType: FARGATE
VPC: <your-vpc>
Subnets: 
  - subnet-09a64efc6aba28d90
  - subnet-0d686e817d583e6c1
  - subnet-0d609ac4b1b77f88d
SecurityGroups:
  - sg-066b752f481ed198d
```

#### 2. ECS Task Definition

```yaml
Name: builder-task
Revision: 3
LaunchType: FARGATE
CPU: 1024 (1 vCPU)
Memory: 2048 (2 GB)
Container:
  Name: build-server-image
  Image: <your-registry>/repocloud-builder:latest
  Essential: true
  Environment:
    - GIT_REPOSITORY__URL
    - PROJECT_ID
    - AWS_REGION
    - AWS_ACCESS_KEY_ID
    - AWS_SECRET_ACCESS_KEY
```

#### 3. S3 Bucket

```yaml
Name: repocloud-623244137506-ap-south-1-an
Region: ap-south-1
PublicAccess: BlockPublicAccess disabled for specific keys
Versioning: Enabled
Lifecycle: Archive after 90 days (optional)
```

#### 4. Security Group Ingress Rules

```
- Port 9000 (API Server): From Application Load Balancer
- Port 9001 (Socket.IO): From Client IPs (typically all)
- Port 8000 (Reverse Proxy): From CDN / Public
- Egress: All traffic allowed to S3, ECR, CloudWatch
```

### Redis/Valkey Instance

```yaml
Connection: rediss://default:password@valkey-instance:22051
EvictionPolicy: allkeys-lru
Memory: 1GB (minimum for production)
Persistence: Enabled (RDB)
Replication: Single-node (can scale to cluster)
```

### IAM Permissions

**ECS Task Execution Role** needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
```

**ECS Task Role** needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::repocloud-*",
        "arn:aws:s3:::repocloud-*/*"
      ]
    }
  ]
}
```

---

## Troubleshooting

### Build Fails Silently

- Check Redis connection: `redis-cli ping`
- Verify ECS task logs in CloudWatch
- Confirm GitHub repository is public or credentials are configured

### Logs Not Streaming

- Ensure Socket.IO server is running on port 9001
- Check Redis pub/sub channel: `redis-cli subscribe logs:*`
- Verify project ID matches in subscription

### S3 Upload Fails

- Confirm S3 bucket exists and credentials have `s3:PutObject`
- Check S3 bucket policies allow uploads
- Verify IAM role attached to ECS task

### Reverse Proxy Returns 404

- Ensure project ID exists in S3 at `__outputs/{projectId}/`
- Check S3 bucket CORS configuration for subdomain access
- Verify `index.html` exists in the dist folder

---

## Monitoring & Logging

### CloudWatch Logs

```bash
# View API server logs
aws logs tail /ecs/repocloud-api-server --follow

# View build server logs
aws logs tail /ecs/builder-task --follow
```

### Redis Monitoring

```bash
# Monitor Redis commands
redis-cli MONITOR

# Check Redis memory
redis-cli INFO memory

# List all keys
redis-cli KEYS "*"
```

### Performance Metrics

- **Build Time**: Average 2-5 minutes per project
- **S3 Upload**: Depends on artifact size
- **API Response**: < 200ms for project creation
- **WebSocket Latency**: < 50ms for log delivery

---

## Security Considerations

⚠️ **Before Production Deployment**:

1. ✅ Add authentication/authorization middleware
2. ✅ Validate GitHub URLs to prevent injection attacks
3. ✅ Implement rate limiting on `/project` endpoint
4. ✅ Use HTTPS for all connections
5. ✅ Rotate AWS credentials regularly
6. ✅ Enable VPC private subnets for build servers
7. ✅ Add request validation and sanitization
8. ✅ Implement CORS policies properly
9. ✅ Use environment variables for all secrets
10. ✅ Enable CloudTrail for AWS API auditing

---

## Support & Contributing

For issues, feature requests, or contributions:

- Open an issue on GitHub
- Submit pull requests to the `develop` branch
- Contact the development team

---

## License

ISC License - See LICENSE file for details

---

**Last Updated**: June 2026
**Version**: 1.0.0
