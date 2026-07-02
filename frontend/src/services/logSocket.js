import { io } from "socket.io-client";

// Create a singleton Socket.IO client to be reused across the app
let socket = null;
const subscribedChannels = new Set();

export function getLogSocket() {
  if (!socket) {
    socket = io("http://127.0.0.1:9001", {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socket.on("connect", () => {
      console.log("Log socket connected", socket.id);
      // Re-subscribe to channels after reconnect
      subscribedChannels.forEach((channel) => {
        socket.emit("subscribe", channel);
      });
    });

    socket.on("disconnect", (reason) => {
      console.log("Log socket disconnected", reason);
    });
  }
  return socket;
}

export function subscribeLogChannel(channel) {
  const socket = getLogSocket();
  if (!subscribedChannels.has(channel)) {
    subscribedChannels.add(channel);
    socket.emit("subscribe", channel);
  }
}

export function unsubscribeLogChannel(channel) {
  const socket = getLogSocket();
  if (subscribedChannels.has(channel)) {
    subscribedChannels.delete(channel);
    socket.emit("unsubscribe", channel);
  }
}

export function closeLogSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    subscribedChannels.clear();
  }
}
