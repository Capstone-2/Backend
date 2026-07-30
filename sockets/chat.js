const { Rooms, Users, Sessions, Messages} = require("../models");

function registerChatHandlers(io, socket) {
  socket.on("join-room", async ({ roomId }) => {
    try {
      // console.log("join-room received:", roomId);
      const parsedRoomId = Number(roomId);
      if (!Number.isInteger(parsedRoomId) || parsedRoomId < 1) {
        return socket.emit("chat-error", {error: "Invalid room ID.",});
      }

      const foundRoom = await Rooms.findByPk(parsedRoomId);
      if (!foundRoom) {
        return socket.emit("chat-error", {
          error: "Room not found.",
        });
      }
      
      // Keep one active study room per socket.
      if (socket.data.roomName) {
        socket.leave(socket.data.roomName);
      }

      const roomName = `room-${parsedRoomId}`;
      socket.join(roomName);
      socket.data.roomId = parsedRoomId;
      socket.data.roomName = roomName;

      const user = socket.data.user;
      socket.to(roomName).emit("user-joined", {
        userId: user.id,
        displayName: user.displayName,
      });
    } catch(error) {
      console.error("Join room failed:", error.message);
      socket.emit("chat-error", {error: "Could not join room."});
    }
  });

  socket.on("send-message", ({ text }) => {
    if (!socket.data.roomName) {
      //console.log("Join a room before sending messages.")
      return socket.emit("chat-error", {error: "Join a room before sending messages."});
    }

    const cleanText = text?.trim();
    if (!cleanText) {
      //console.log("Message cannot be empty.")
      return socket.emit("chat-error", {error: "Message cannot be empty."});
    }

    const user = socket.data.user;
    const messageSent = {
      id: `${socket.id}-${Date.now()}`,
      userId: user.id,
      displayName: user.displayName,
      text: cleanText,
      sentAt: new Date().toISOString(),
    }

    // console.log(messageSent)
    io.to(socket.data.roomName).emit("receive-message", messageSent);
  });

  socket.on("leave-room", () => {
    const roomName = socket.data.roomName;
    if (!roomName) {
      return;
    }

    const user = socket.data.user;
    socket.leave(roomName);
    socket.to(roomName).emit("user-left", {
      userId: user.id,
      displayName: user.displayName,
    });

    socket.data.roomId = null;
    socket.data.roomName = null;
  });
}

module.exports = { registerChatHandlers };