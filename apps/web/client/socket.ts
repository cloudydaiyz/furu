import { API_URL } from '@/lib/constants';
import { io } from 'socket.io-client';

export const socket = io(API_URL);