import express from "express";
import uniqid from "uniqid";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { Server } from "socket.io";
import redis from "ioredis"; //to receive logs published by build container
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })
const app = express();
const PORT = 9000;
// First browser asks the backend whether i can POST from this origin
// OPTIONS /project
// Origin: http://localhost:5173
// Access-Control-Request-Method: POST
// Access-Control-Request-Headers: Content-Type 

//if the backend allows it checks this 
// res.setHeader("Access-Control-Allow-Origin", "*");
//   res.setHeader("Access-Control-Allow-Headers", "*");
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

//connecting to redis database
const subscriber = new redis(
  process.env.REDIS_URI,
); //rediss:// means SSL encrypted connection

//anyone can connect with this socket server 
const io = new Server({ cors: "*" });

//on new connection, if frontend says subscribe to logs123...
io.on("connection", (socket) => {
  // Track channels this socket has joined to avoid duplicate joins
  socket._joinedChannels = new Set();

  //on receiving event subscribe from the frontend, join this channel only
  socket.on("subscribe", (channel) => {
    if (socket._joinedChannels.has(channel)) {
      // ignore duplicate subscribe calls from same socket
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

io.listen(9001, () => console.log("Socket Server 9001"));

app.use(express.json());

//connecting to ECS
const ecsClient = new ECSClient({
  credentials: {
    accessKeyId: process.env.IAM_ACCESS_KEY,
    secretAccessKey: process.env.IAM_SECRET_KEY,
  },
});

const config = {
  CLUSTER: "arn:aws:ecs:ap-south-1:623244137506:cluster/RepoCloud",
  TASK: "arn:aws:ecs:ap-south-1:623244137506:task-definition/builder-task:3",
};

app.post("/project", async (req, res) => {
  console.log("Received POST /project request with body:", req.body);
  const randomId = uniqid();
  const githubUrl = req.body.githubUrl;

  if (!githubUrl) {
    console.error("Missing githubUrl in request body");
    return res.status(400).json({ error: "githubUrl is required" });
  }

  try {
    //filling the form before running the task container 
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
    const ecsResponse = await ecsClient.send(command); //rec req,start fargate,pull image,run container,clone,npm install,npm build,upload to s3
    console.log("AWS ECS task started successfully. Response ID:", ecsResponse.tasks?.[0]?.taskArn); //print Amazon Resource name, ARS of the task

    return res.json({
      status: "queued",
      data: { randomId, url: `http://${randomId}.localhost:8000` }, //future deployement url sent to frontend
    });
  } catch (error) {
    console.error("Failed to start AWS ECS Task. Details:", error);
    return res.status(500).json({
      error: "AWS ECS Task trigger failed",
      details: error.message || error,
    });
  }
});

//connecting api server to redis so it can receive build logs and forward to frontend
async function initRedisSubscribe() {
  console.log("Subscribing to logs....");
  subscriber.psubscribe("logs:*"); //psubscribe is pattern subscribe, listen to this pattern logs:..., listen to every redis channel starting with this
  // Simple per-channel dedupe cache to suppress identical messages sent rapidly
  const recentMessages = new Map(); // channel -> { lastMessage, lastTs }

  subscriber.on("pmessage", (pattern, channel, message) => {
    try {
      const now = Date.now();
      const entry = recentMessages.get(channel);
      if (entry && entry.lastMessage === message && now - entry.lastTs < 500) {
        // drop duplicate message sent within 500ms
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

app.listen(PORT, (req, res) => {
  console.log(`Api server running on port ${PORT}`);
});
