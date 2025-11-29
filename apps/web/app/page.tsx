"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { socket } from "../client/socket";
// import { API_URL } from "@/lib/constants";
import { todoMvc } from "@/lib/workflows/todo-mvc";
import { ApiClientOperation, ApiServerOperation, DEFAULT_ACCESS_KEY } from "@cloudydaiyz/furu-api";

export default function Home() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [fooEvents, setFooEvents] = useState<any[]>([]);

  const sendClientOperation = (operation: ApiClientOperation) =>
    socket.emit("operation", operation);

  function onConnect() {
    console.log("sending access key");
    setIsConnected(true);
    sendClientOperation({
      opCode: 1,
      data: {
        accessKey: DEFAULT_ACCESS_KEY,
      }
    });
  }

  function onDisconnect() {
    setIsConnected(false);
    setIsAuthenticated(false);
  }

  function onFooEvent(value: any) {
    setFooEvents(previous => [...previous, value]);
  }

  useEffect(() => {
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('foo', onFooEvent);

    socket.on("operation", (operation: ApiServerOperation) => {
      console.log("operation", operation);
      if (operation.opCode === 1) {
        setIsAuthenticated(true);
      }
    });

    // fetch(API_URL).then(res => console.log(`fetched from server with status ${res.status}`));

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('foo', onFooEvent);
    };
  }, []);

  useEffect(() => {
    console.log('socket.connected 2', socket.connected);
    if (!isConnected) {
      onConnect();
    }
  }, [socket.connected])

  console.log('socket.connected', socket.connected);
  console.log('isConnected', isConnected);
  console.log('fooEvents', fooEvents);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            To get started, edit the page.tsx file.
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a starting point or more instructions? Head over to{" "}
            <a
              href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Templates
            </a>{" "}
            or the{" "}
            <a
              href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              className="font-medium text-zinc-950 dark:text-zinc-50"
            >
              Learning
            </a>{" "}
            center.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={16}
              height={16}
            />
            Deploy Now
          </a>
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid px-5 transition-colors hover:border-transparent hover:bg-black/4 dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
          <button
            type="button"
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid px-5 transition-colors hover:border-transparent hover:bg-black/4 dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[158px]"
            onClick={() => {
              if (isAuthenticated) {
                sendClientOperation({
                  opCode: 2,
                  data: {
                    workflow: todoMvc,
                  }
                });
              }
            }}
            disabled={!isAuthenticated}
          >
            Send command
          </button>
        </div>
      </main>
    </div>
  );
}
