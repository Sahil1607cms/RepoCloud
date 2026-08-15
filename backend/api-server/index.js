//frontend logSocket.js connects to this socket backend server
import http from "http";
import express from "express";
import uniqid from "uniqid";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { Server } from "socket.io";
import redis from "ioredis"; //to receive logs published by build container
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { Project } from "./models/Project.js";

dotenv.config({ path: "../.env" });
const app = express();
const PORT = process.env.PORT || process.env.API_SERVER_PORT || 9000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/repocloud";

// In-memory deployment store fallback when MongoDB is disconnected or offline
const memoryProjectsStore = new Map();

const isMongoConnected = () => mongoose.connection.readyState === 1;

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.error("MongoDB connection notice (using in-memory store fallback):", err.message || err));

const server = http.createServer(app);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

//connecting to redis database
const subscriber = new redis(process.env.REDIS_URI); //rediss:// means SSL encrypted connection

//anyone can connect with this socket server 
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket._joinedChannels = new Set();

  //on receiving event subscribe from the frontend, join this channel only
  socket.on("subscribe", (channel) => {
    if (socket._joinedChannels.has(channel)) {
      return;
    }
    socket._joinedChannels.add(channel);
    socket.join(channel);
    socket.emit("message", `Joined ${channel}`);
  });

  // allow clients to unsubscribe when they switch projects
  socket.on("unsubscribe", (channel) => {
    try {
      if (socket._joinedChannels.has(channel)) {
        socket._joinedChannels.delete(channel);
        socket.leave(channel);
        socket.emit("message", `Left ${channel}`);
      }
    } catch (err) {
      console.error("Error during unsubscribe:", err);
    }
  });

  socket.on("disconnect", () => {
    socket._joinedChannels.clear();
  });
});

app.use(express.json());

//connecting to ECS
const ecsClient = new ECSClient({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.IAM_ACCESS_KEY,
    secretAccessKey: process.env.IAM_SECRET_KEY,
  },
});

const config = {
  CLUSTER: "arn:aws:ecs:ap-south-1:623244137506:cluster/RepoCloud",
  TASK: "arn:aws:ecs:ap-south-1:623244137506:task-definition/builder-task:4",
};

// GET /projects - Fetch all projects stored in MongoDB or memory store
app.get("/projects", async (req, res) => {
  try {
    let mongoProjects = [];
    if (isMongoConnected()) {
      mongoProjects = await Project.find().sort({ createdAt: -1 });
    }
    
    const dbProjectIds = new Set(mongoProjects.map((p) => p.projectId || p.id));
    const memoryProjects = Array.from(memoryProjectsStore.values()).filter(
      (p) => !dbProjectIds.has(p.id) && !dbProjectIds.has(p.projectId)
    );

    const allProjects = [...mongoProjects.map(p => p.toJSON ? p.toJSON() : p), ...memoryProjects];
    return res.json(allProjects);
  } catch (error) {
    console.error("MongoDB fetch failed, returning in-memory projects:", error.message);
    const memoryProjects = Array.from(memoryProjectsStore.values()).reverse();
    return res.json(memoryProjects);
  }
});

// GET /projects/:id - Fetch single project by projectId
app.get("/projects/:id", async (req, res) => {
  const { id } = req.params;

  if (memoryProjectsStore.has(id)) {
    return res.json(memoryProjectsStore.get(id));
  }

  try {
    if (isMongoConnected()) {
      const project = await Project.findOne({ projectId: id });
      if (project) {
        const jsonProj = project.toJSON();
        memoryProjectsStore.set(id, jsonProj);
        return res.json(jsonProj);
      }
    }
  } catch (error) {
    console.error(`MongoDB query failed for project ${id}:`, error.message);
  }

  return res.status(404).json({ error: "Project not found" });
});

// POST /project - Create new project deployment & trigger ECS task
app.post("/project", async (req, res) => {
  console.log("Received POST /project request with body:", req.body);
  const randomId = uniqid();
  const githubUrl = req.body.githubUrl;

  if (!githubUrl) {
    console.error("Missing githubUrl in request body");
    return res.status(400).json({ error: "githubUrl is required" });
  }

  let projectName = "Unnamed Project";
  try {
    const parts = githubUrl.split("/");
    projectName = parts[parts.length - 1].replace(".git", "") || "New Project";
  } catch (err) {}

  const deploymentUrl = `${process.env.REVERSE_PROXY_URL || "http://localhost:8000"}/${randomId}`;

  const projectData = {
    id: randomId,
    projectId: randomId,
    name: projectName,
    repoUrl: githubUrl,
    status: "Building",
    url: deploymentUrl,
    logs: [],
    createdAt: new Date().toISOString(),
  };

  memoryProjectsStore.set(randomId, projectData);

  if (isMongoConnected()) {
    try {
      const projectDoc = await Project.create({
        projectId: randomId,
        name: projectName,
        repoUrl: githubUrl,
        status: "Building",
        url: deploymentUrl,
        logs: [],
      });
      console.log("Project deployment created in MongoDB:", projectDoc.projectId);
    } catch (dbErr) {
      console.error("Failed to save project to MongoDB (saved to memory store):", dbErr.message);
    }
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

    console.log("Attempting to send command to AWS ECS cluster...");
    const ecsResponse = await ecsClient.send(command);
    console.log("AWS ECS task started successfully. Response ID:", ecsResponse.tasks?.[0]?.taskArn);

    return res.json({
      status: "queued",
      data: {
        randomId,
        url: deploymentUrl,
        project: projectData,
      },
    });
  } catch (error) {
    console.error("Failed to start AWS ECS Task. Details:", error);
    return res.json({
      status: "queued_local",
      data: {
        randomId,
        url: deploymentUrl,
        project: projectData,
        warning: "AWS ECS trigger notice: " + error.message,
      },
    });
  }
});

// PATCH /projects/:id - Update project fields (status/logs)
app.patch("/projects/:id", async (req, res) => {
  const { id } = req.params;
  const { status, logs, name, repoUrl, url } = req.body;

  const existing = memoryProjectsStore.get(id) || {
    id,
    projectId: id,
    name: name || "Unnamed Project",
    repoUrl: repoUrl || "",
    status: status || "Building",
    url: url || `${process.env.REVERSE_PROXY_URL || "http://localhost:8000"}/${id}`,
    logs: logs || [],
    createdAt: new Date().toISOString(),
  };

  const updatedProject = {
    ...existing,
    ...(status !== undefined && { status }),
    ...(logs !== undefined && { logs }),
    ...(name !== undefined && { name }),
    ...(repoUrl !== undefined && { repoUrl }),
    ...(url !== undefined && { url }),
  };

  memoryProjectsStore.set(id, updatedProject);

  if (isMongoConnected()) {
    try {
      const updateData = {};
      if (status !== undefined) updateData.status = status;
      if (logs !== undefined) updateData.logs = logs;
      if (name !== undefined) updateData.name = name;
      if (repoUrl !== undefined) updateData.repoUrl = repoUrl;
      if (url !== undefined) updateData.url = url;

      await Project.findOneAndUpdate(
        { projectId: id },
        { $set: updateData },
        { new: true, upsert: true }
      );
    } catch (error) {
      console.error(`Failed to update project ${id} in MongoDB:`, error.message);
    }
  }

  return res.json(updatedProject);
});

// DELETE /projects/:id - Delete project deployment
app.delete("/projects/:id", async (req, res) => {
  const { id } = req.params;
  memoryProjectsStore.delete(id);

  if (isMongoConnected()) {
    try {
      await Project.findOneAndDelete({ projectId: id });
    } catch (error) {
      console.error(`Failed to delete project ${id} from MongoDB:`, error.message);
    }
  }

  return res.json({ message: "Project deleted successfully", id });
});

//connecting api server to redis so it can receive build logs and forward to frontend
async function initRedisSubscribe() {
  console.log("Subscribing to logs....");
  subscriber.psubscribe("logs:*");
  const recentMessages = new Map();

  subscriber.on("pmessage", (pattern, channel, message) => {
    try {
      const now = Date.now();
      const entry = recentMessages.get(channel);
      if (entry && entry.lastMessage === message && now - entry.lastTs < 500) {
        return;
      }
      recentMessages.set(channel, { lastMessage: message, lastTs: now });

      io.to(channel).emit("message", message);
    } catch (err) {
      console.error("Error processing Redis message:", err);
    }
  });
}

initRedisSubscribe();

console.log("REDIS_URI:", process.env.REDIS_URI);

server.listen(PORT, () => {
  console.log(`API + Socket server running on ${PORT}`);
});

