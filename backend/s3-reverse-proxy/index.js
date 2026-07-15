import express from "express";
import httpProxy from "http-proxy";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });
const app = express();

const PORT = process.env.PORT || process.env.S3_PORT || 8000;

const proxy = httpProxy.createProxy(); //creating the proxy, it can forward request to another server

if (!process.env.BASE_PATH) {
  throw new Error("BASE_PATH is not defined");
}

//middleware
//handle all requests without a path also
app.use((req, res) => {
  // Example:
  // /abc123
  // /abc123/
  // /abc123/assets/index.js

  const parts = req.path.split("/").filter(Boolean);

  if (parts.length === 0) {
    return res.status(400).send("Missing project id");
  }
  const projectId = parts[0];
  const basePath = process.env.BASE_PATH.replace(/\/$/, "");
  const target = `${basePath}/${projectId}`;

  // Remove "/abc123" before forwarding to S3
  req.url = req.url.replace(`/${projectId}`, "") || "/";

  proxy.web(req, res, {
    target,
    changeOrigin: true,
  });
});

proxy.on("proxyReq", (proxyReq, req, res) => {
  //proxyReq build in event, runs just before proxy sends the request to S3
  const url = req.url;
  if (url === "/") proxyReq.path += "/index.html"; //changing /__outputs__/abc123/ => /__outputs__/abc123/index.html just before sending
});

app.listen(PORT, () =>
  console.log(`Reverse proxy server running on port ${PORT}`),
);
