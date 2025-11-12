import 'dotenv/config'
console.log(process.env.HELLO)

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { addJobs } from "./redis.js";

await addJobs();

const app = express()
app.use(cors())

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000"
  }
});

const port = 4000

app.get('/', (req, res) => {
  res.send('Hello World!')
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