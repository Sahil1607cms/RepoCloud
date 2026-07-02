# RepoCloud API Server

## Purpose

This server is the orchestrator of RepoCloud. It has two primary responsibilities:

1. Accept deployment requests from the frontend.
2. Stream live build logs from Redis to the frontend using Socket.IO.

---

# Tech Stack

* Express.js
* Socket.IO
* AWS ECS (Fargate)
* Redis (ioredis)
* AWS SDK v3

---

# Architecture

```text
Frontend
    │
    │ POST /project
    ▼
Express API Server
    │
    ├── Starts AWS ECS Fargate Task
    │
    └── Subscribes to Redis Logs
            │
            ▼
        Socket.IO
            │
            ▼
        Frontend Live Logs
```

---

# Responsibilities

## 1. Express Server

Runs on port **9000**.

Responsible for exposing REST APIs.

Main endpoint:

```
POST /project
```

---

## 2. CORS

Allows frontend to access the backend.

```js
app.use(cors());
```

---

## 3. Socket.IO Server

Runs on port **9001**.

Used for real-time communication.

Frontend subscribes using:

```js
socket.emit("subscribe", "logs:<projectId>");
```

Server:

```js
socket.on("subscribe", (channel) => {
    socket.join(channel);
});
```

Purpose:

* Every deployment has its own room.
* Users only receive logs of their own deployment.

---

## 4. Redis Subscriber

This server **does not publish** logs.

It only subscribes.

```js
subscriber.psubscribe("logs:*");
```

Whenever a builder publishes:

```
logs:abc123
```

Redis notifies this API server.

The server forwards the message to Socket.IO:

```js
io.to(channel).emit("message", message);
```

---

## 5. POST /project

Flow:

Frontend

↓

Send GitHub URL

↓

Generate Project ID

↓

Create RunTaskCommand

↓

AWS ECS starts Builder Container

↓

Return Project ID

Example request:

```json
{
    "githubUrl":"https://github.com/user/project"
}
```

Example response:

```json
{
    "status":"queued",
    "data":{
        "randomId":"abc123",
        "url":"http://abc123.localhost:8000"
    }
}
```

---

## 6. AWS ECS

Uses

```
RunTaskCommand
```

to start one Fargate container.

Environment variables passed to container:

```
GIT_REPOSITORY__URL
PROJECT_ID
```

Builder container uses these values to:

* Clone repository
* Build project
* Publish logs
* Upload build files

---

## 7. Network Configuration

Fargate task needs:

* Subnets
* Security Group
* Public IP

Public IP allows:

* GitHub clone
* npm install
* S3 upload

---

## 8. Error Handling

Uses:

```js
try {
   ...
}
catch(error){
   ...
}
```

Returns

```
500 Internal Server Error
```

if ECS task creation fails.

---

# End-to-End Flow

```text
Frontend
      │
      │ POST /project
      ▼
Express API
      │
      │ Generate Project ID
      │
      ▼
AWS ECS (Fargate)
      │
      ▼
Builder Container
      │
      │ Clone Repo
      │ npm install
      │ npm run build
      │ Upload to S3
      │ Publish Logs
      ▼
Redis
      │
      ▼
API Server (Subscriber)
      │
      ▼
Socket.IO
      │
      ▼
Frontend
```

---

# Interview Points

* Express handles REST APIs.
* Socket.IO provides real-time communication.
* Redis Pub/Sub is used for log streaming.
* This API server **only subscribes** to Redis; the builder container publishes logs.
* `socket.join(channel)` creates deployment-specific rooms.
* `io.to(channel).emit()` sends logs only to the correct user.
* `RunTaskCommand` starts an AWS ECS Fargate task.
* Environment variables (`GIT_REPOSITORY__URL`, `PROJECT_ID`) are injected into the builder container.
* Each deployment gets a unique Project ID used for logs, deployment tracking, and URLs.
