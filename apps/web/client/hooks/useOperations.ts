import { API_URL } from '@/lib/constants';
import { ApiClientOperation, DEFAULT_ACCESS_KEY, ApiServerOperation } from '@cloudydaiyz/furu-api';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export const socket = io(API_URL);

interface UseOperationsProps {
  onServerOperation?: (operation: ApiServerOperation) => void;
  onConnect?: () => void;
}

export function useOperations({
  onServerOperation,
  onConnect: onConnectCallback,
}: UseOperationsProps) {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const sendClientOperation = (operation: ApiClientOperation) =>
    socket.emit("operation", operation);

  function onConnect() {
    console.log("onConnect");
    sendClientOperation({
      opCode: 1,
      data: {
        accessKey: DEFAULT_ACCESS_KEY,
      }
    });
    setIsConnected(true);
    onConnectCallback?.();
  }

  function onDisconnect() {
    console.log("onDisconnect");
    setIsConnected(false);
    setIsAuthenticated(false);
  }

  useEffect(() => {
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on("operation", (operation: ApiServerOperation) => {
      console.log("operation", operation);
      if (operation.opCode === 1) {
        setIsAuthenticated(true);
      }
      onServerOperation?.(operation);
    });

    // fetch(API_URL).then(res => console.log(`fetched from server with status ${res.status}`));

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  useEffect(() => {
    if (socket.connected && !isConnected) {
      onConnect();
    } else if (!socket.connected && isConnected) {
      onDisconnect();
    }
  }, [socket.connected]);

  return {
    isConnected,
    isAuthenticated,
    sendClientOperation,
  }
}