import 'dotenv/config'
console.log(process.env.HELLO)

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { addJobs } from "./redis.js";
import { runServer, runClient, getSampleCommand, launchServer, type SocketConnection } from '@cloudydaiyz/controller';

const port = 4000;
const accessKey = "helloworld";

async function launchApi() {
  await new Promise<void>((res, rej) => {
    const server = launchServer(accessKey);
    server.on("error", (err) => rej(err));
    server.on('message', msg => {
      if (msg === "ready") {
        res();
      }
    });
  });
  console.log('resolved');

  // await addJobs();

  const app = express();
  app.use(cors());

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:3000"
    }
  });

  app.get('/', async (req, res) => {
    const { sender } = await runClient(accessKey);
    const commandOperation = await getSampleCommand();
    sender.sendClientOperation(commandOperation);
    res.send('Operation sent');
  })

  io.on("connection", (socket) => {
    console.log("New connection!");
    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });

  httpServer.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  });
}

launchApi();