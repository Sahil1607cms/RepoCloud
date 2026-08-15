import { exec } from "child_process"; //for running shell commands
import path from "path";
import fs from "fs";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mime from "mime-types";
//we have to do this is module js , we can skip it in commonjs
import { fileURLToPath } from "url";
import redis from "ioredis";                  //publishing purpose
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

const serviceUri =  process.env.REDIS_URI
const publisher = new redis(serviceUri);      //conecting to redis

const __filename = fileURLToPath(import.meta.url); //gives  file:///app/scripts.js => /app/script.js
const __dirname = path.dirname(__filename);        //extracting only the directory from the filename

const s3Client = new S3Client({
  region: "ap-south-1",
});
const PROJECT_ID = process.env.PROJECT_ID;

const publishLog = (log) => {
  publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify({ log }));
};

async function init(params) {
  console.log("Running builder script.js");
  publishLog("Build started...");
  //putting source code in this directory in s3 bucket
  const outDirPath = path.join(__dirname, "output"); // /app/outputs

  //building inside container to provide data isolation
  const p = exec(`cd ${outDirPath} && npm install && npm run build`);
  //exec starts a child process

  //streaming build logs
  //stdout is read stream
  //data event tellsto receive chunks when they are available
  p.stdout.on("data", function (data) { //data inbuilt event of node js streams
    console.log(data.toString());
    publishLog(data.toString());
  });

  p.stderr.on("data", function (data) {
    console.log("Error=>", data.toString());
    publishLog(`Error: ${data.toString()}`);
  });

  //after upload on s3 is finished
  p.on("close", async function () {
    console.log("Build is Complete");
    publishLog("Build is Complete");
    const distFolderPath = path.join(__dirname, "output", "dist");
    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    });

    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue; //skip if directory

      console.log("uploading", filePath);
      publishLog(`uploading file ${file}`);

      const command = new PutObjectCommand({
        Bucket: "repocloud-623244137506-ap-south-1-an",
        Key: `__outputs/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath), //better than loading entire file into memory
        ContentType: mime.lookup(filePath),
      });

      await s3Client.send(command);
      console.log("uploaded", filePath);
      publishLog(`uploaded file ${file}`);
    }
    console.log("Done...");

    await publisher.publish(
      `logs:${PROJECT_ID}`,
      JSON.stringify({ log: "Done..." }),
    );

    await publisher.quit();
  });
}

init();
