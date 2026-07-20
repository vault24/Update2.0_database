/**
 * Notifications WebSocket client
 *
 * Maintains a single WebSocket connection to the backend notifications
 * consumer (`ws/notifications/`) with automatic reconnection. Auth is handled
 * by the session cookie, which the browser sends with the WS handshake, so no
 * token needs to be passed here.
 *
 * The backend pushes JSON messages shaped like:
 *   { type: 'notification_created', notification: {...} }
 *   { type: 'notification_updated', notification: {...} }
 *   { type: 'unread_count', count: number }
 */

import { API_BASE_URL } from '@/config/api';

export interface NotificationsSocketHandlers {
  /** Called each time the socket (re)connects. Use it to re-sync state. */
  onOpen?: () => void;
  /** Called when the server pushes a newly-created notification. */
  onCreated?: (notification: unknown) => void;
  /** Called when the server pushes an update to an existing notification. */
  onUpdated?: (notification: unknown) => void;
}

export interface NotificationsSocket {
  /** Permanently close the socket and stop reconnecting. */
  close: () => void;
}

/**
 * Derive the WebSocket URL from the HTTP API base URL.
 * e.g. "http://localhost:8000/api" -> "ws://localhost:8000/ws/notifications/"
 */
function buildSocketUrl(): string {
  // `?portal=admin` tells the backend to authenticate this socket against
  // the admin session cookie (separate from the student portal's session).
  try {
    const url = new URL(API_BASE_URL, window.location.origin);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${url.host}/ws/notifications/?portal=admin`;
  } catch {
    // Fallback to the current origin if API_BASE_URL is malformed.
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}/ws/notifications/?portal=admin`;
  }
}

const RECONNECT_BASE_DELAY = 1000; // 1s
const RECONNECT_MAX_DELAY = 30000; // 30s

export function connectNotificationsSocket(
  handlers: NotificationsSocketHandlers = {},
): NotificationsSocket {
  const url = buildSocketUrl();

  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let attempts = 0;
  let closed = false;

  const clearReconnect = () => {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const scheduleReconnect = () => {
    if (closed) return;
    const delay = Math.min(
      RECONNECT_BASE_DELAY * 2 ** attempts,
      RECONNECT_MAX_DELAY,
    );
    attempts += 1;
    clearReconnect();
    reconnectTimer = setTimeout(open, delay);
  };

  function open() {
    if (closed) return;

    try {
      socket = new WebSocket(url);
    } catch {
      scheduleReconnect();
      return;
    }

    socket.onopen = () => {
      attempts = 0;
      handlers.onOpen?.();
    };

    socket.onmessage = (event) => {
      let data: { type?: string; notification?: unknown };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (data.type) {
        case 'notification_created':
          handlers.onCreated?.(data.notification);
          break;
        case 'notification_updated':
          handlers.onUpdated?.(data.notification);
          break;
        default:
          break;
      }
    };

    socket.onclose = () => {
      socket = null;
      scheduleReconnect();
    };

    socket.onerror = () => {
      // Let onclose drive the reconnection to avoid double-scheduling.
      socket?.close();
    };
  }

  open();

  return {
    close: () => {
      closed = true;
      clearReconnect();
      if (socket) {
        // Detach handlers so the manual close doesn't trigger a reconnect.
        socket.onclose = null;
        socket.onerror = null;
        socket.close();
        socket = null;
      }
    },
  };
}
