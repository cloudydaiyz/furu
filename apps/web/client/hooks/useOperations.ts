import { ApiClientOperation, ApiServerOperation } from '@cloudydaiyz/furu-api';
import { useState, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

interface UseOperationsProps {
  apiUrl: string;
  apiAccessKey: string;
  onServerOperation?: (operation: ApiServerOperation) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useOperations({
  apiUrl,
  apiAccessKey,
  onServerOperation,
  onConnect: onConnectCallback,
  onDisconnect: onDisconnectCallback,
}: UseOperationsProps) {
  const socket = useRef<Socket>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const sendClientOperation = (operation: ApiClientOperation) =>
    socket.current?.emit("operation", operation);

  function onConnect() {
    sendClientOperation({
      opCode: 1,
      data: {
        accessKey: apiAccessKey,
      }
    });
    setIsConnected(true);
    onConnectCallback?.();
  }

  function onDisconnect() {
    setIsConnected(false);
    setIsAuthenticated(false);
    onDisconnectCallback?.();
  }

  function onOperation(operation: ApiServerOperation) {
    console.log("operation", operation);
    if (operation.opCode === 1) {
      setIsAuthenticated(true);
    }
    onServerOperation?.(operation);
  }

  useEffect(() => {
    if (!socket.current) {
      socket.current = io(apiUrl);
    }

    socket.current.on('connect', onConnect);
    socket.current.on('disconnect', onDisconnect);
    socket.current.on("operation", onOperation);

    return () => {
      socket.current?.off('connect', onConnect);
      socket.current?.off('disconnect', onDisconnect);
      socket.current?.off('operation', onOperation);
    };
  }, []);

  return {
    isConnected,
    isAuthenticated,
    sendClientOperation,
  }
}