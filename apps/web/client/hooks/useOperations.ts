import { API_ACCESS_KEY, API_URL } from '@/lib/constants';
import { ApiClientOperation, ApiServerOperation } from '@cloudydaiyz/furu-api';
import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

export const socket = io(API_URL);

interface UseOperationsProps {
  onServerOperation?: (operation: ApiServerOperation) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useOperations({
  onServerOperation,
  onConnect: onConnectCallback,
  onDisconnect: onDisconnectCallback,
}: UseOperationsProps) {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const sendClientOperation = (operation: ApiClientOperation) =>
    socket.emit("operation", operation);

  function onConnect() {
    sendClientOperation({
      opCode: 1,
      data: {
        accessKey: API_ACCESS_KEY,
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
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on("operation", onOperation);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('operation', onOperation);
    };
  }, []);

  return {
    isConnected,
    isAuthenticated,
    sendClientOperation,
  }
}