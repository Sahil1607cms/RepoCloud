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

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

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
  TASK: "arn:aws:ecs:ap-south-1:623244137506:task-definition/builder-task:3",
};

// GET /projects - Fetch all projects stored in MongoDB
app.get("/projects", async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    return res.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects from MongoDB:", error);
    return res.status(500).json({ error: "Failed to fetch projects" });
  }
});

// GET /projects/:id - Fetch single project by projectId from MongoDB
app.get("/projects/:id", async (req, res) => {
  try {
    const project = await Project.findOne({ projectId: req.params.id });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json(project);
  } catch (error) {
    console.error(`Failed to fetch project ${req.params.id}:`, error);
    return res.status(500).json({ error: "Failed to fetch project" });
  }
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

  const deploymentUrl = `${process.env.REVERSE_PROXY_URL}/${randomId}`;

  // Persist new project deployment to MongoDB
  let projectDoc = null;
  try {
    projectDoc = await Project.create({
      projectId: randomId,
      name: projectName,
      repoUrl: githubUrl,
      status: "Building",
      url: deploymentUrl,
      logs: [],
    });
    console.log("Project deployment created in MongoDB:", projectDoc.projectId);
  } catch (dbErr) {
    console.error("Failed to save project to MongoDB:", dbErr);
  }

  try {
    // filling the form before running the task container 
    const command = new RunTaskCommand({
      cluster: config.CLUSTER,          //start the task in this cluster
      taskDefinition: config.TASK,      //which task to use
      launchType: "FARGATE",            //fargate manages the server automatically
      count: 1,                         //only start one container
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: "ENABLED",    //giving the container internet access because clone,download npm, upload s3 is required
          subnets: [
            "subnet-09a64efc6aba28d90",
            "subnet-0d686e817d583e6c1",
            "subnet-0d609ac4b1b77f88d",
          ],
          securityGroups: ["sg-066b752f481ed198d"], //containers firewall 
        },  
      },
      overrides: {
        containerOverrides: [           //temporarily overriding the task definition for this run only          
          {
            name: "build-server-image", //it should match the name in the ecs task definition
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
        project: projectDoc ? projectDoc.toJSON() : null,
      },
    });
  } catch (error) {
    console.error("Failed to start AWS ECS Task. Details:", error);
    return res.status(500).json({
      error: "AWS ECS Task trigger failed",
      details: error.message || error,
    });
  }
});

// PATCH /projects/:id - Update project fields (status/logs) in MongoDB
app.patch("/projects/:id", async (req, res) => {
  try {
    const { status, logs, name, repoUrl, url } = req.body;
    const updateData = {};
    if (status !== undefined) updateData.status = status;
    if (logs !== undefined) updateData.logs = logs;
    if (name !== undefined) updateData.name = name;
    if (repoUrl !== undefined) updateData.repoUrl = repoUrl;
    if (url !== undefined) updateData.url = url;

    const project = await Project.findOneAndUpdate(
      { projectId: req.params.id },
      { $set: updateData },
      { new: true }
    );

    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json(project);
  } catch (error) {
    console.error(`Failed to update project ${req.params.id}:`, error);
    return res.status(500).json({ error: "Failed to update project" });
  }
});

// DELETE /projects/:id - Delete project deployment from MongoDB
app.delete("/projects/:id", async (req, res) => {
  try {
    const project = await Project.findOneAndDelete({ projectId: req.params.id });
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    return res.json({ message: "Project deleted successfully", id: req.params.id });
  } catch (error) {
    console.error(`Failed to delete project ${req.params.id}:`, error);
    return res.status(500).json({ error: "Failed to delete project" });
  }
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
