import express from "express";
import dotenv from "dotenv";
import {
  S3Client,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

dotenv.config({ path: "../.env" });
const app = express();

const PORT = process.env.PORT || process.env.S3_PORT || 8000;

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",

  credentials: {
    accessKeyId: process.env.IAM_ACCESS_KEY,
    secretAccessKey: process.env.IAM_SECRET_KEY,
  },
});

const BUCKET = process.env.S3_BUCKET;

if (!BUCKET) {
  throw new Error("S3_BUCKET is not defined");
}

//middleware
//handle all requests without a path also
app.use(async (req, res) => {
  try {
    // Example:
    // /1ke9b624msulrnb9
    // /1ke9b624msulrnb9/assets/index.js

    const parts = req.path.split("/").filter(Boolean);

    if (parts.length === 0) {
      return res.status(400).send("Missing project id");
    }

    const projectId = parts[0];

    // Everything after the project ID
    let filePath = parts.slice(1).join("/");

    // /projectId -> index.html
    if (!filePath) {
      filePath = "index.html";
    }

    const key = `__outputs/${projectId}/${filePath}`;

    console.log("Fetching S3 object:", key);

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);

    if (!response.Body) {
      return res.status(404).send("File not found");
    }

    // Forward content type
    if (response.ContentType) {
      res.setHeader("Content-Type", response.ContentType);
    }

    // Forward cache information if available
    if (response.CacheControl) {
      res.setHeader("Cache-Control", response.CacheControl);
    }

    // Stream S3 object directly to browser
    response.Body.pipe(res);

  } catch (error) {
    console.error("S3 proxy error:", error);

    if (error.name === "NoSuchKey") {
      return res.status(404).send("File not found");
    }

    return res.status(500).json({
      error: "Failed to retrieve file from S3",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Reverse proxy server running on port ${PORT}`);
});