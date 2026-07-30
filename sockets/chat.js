const { Rooms, Users, Sessions, Messages } = require("../models");

const MESSAGE_LIMIT_PER_ROOM = 50;  // Message history limit

async function deleteOldMessages(roomId) {
  const messageCount = await Messages.count({
    where: { roomId },
  });

  const excessMessageCount = (messageCount - MESSAGE_LIMIT_PER_ROOM);
  if (excessMessageCount <= 0) {
    return;
  }

  const oldestMessages = await Messages.findAll({
    where: { roomId, },
    attributes: ["id"],
    order: [
      ["createdAt", "ASC"],
      ["id", "ASC"],
    ],
    limit: excessMessageCount,
    raw: true,
  });

  const oldestMessageIds = oldestMessages.map((message) => message.id);
  if (oldestMessageIds.length === 0) {
    return;
  }

  await Messages.destroy({
    where: { id: oldestMessageIds },
  });
}

function registerChatHandlers(io, socket) {
  socket.on("join-room", async ({ roomId }) => {
    try {
      // console.log("join-room received:", roomId);
      const parsedRoomId = Number(roomId);
      if (!Number.isInteger(parsedRoomId) || parsedRoomId < 1) {
        return socket.emit("chat-error", { error: "Invalid room ID.", });
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
    } catch (error) {
      console.error("Join room failed:", error.message);
      socket.emit("chat-error", { error: "Could not join room." });
    }
  });

  socket.on("send-message", async ({ text }) => {
    try {
      if (!socket.data.roomName) {
        //console.log("Join a room before sending messages.")
        return socket.emit("chat-error", { error: "Join a room before sending messages." });
      }

      const cleanText = text?.trim();
      if (!cleanText) {
        //console.log("Message cannot be empty.")
        return socket.emit("chat-error", { error: "Message cannot be empty." });
      }

      const user = socket.data.user;

      // Save the chat message into the DB 'sentAt' will automatically be made as 'createdAt'
      const savedMessage = await Messages.create({
        text: cleanText,
        userId: user.id,
        roomId: socket.data.roomId,
      });

      // Try to delete room messages if we are over the limit
      try {
        await deleteOldMessages(socket.data.roomId);
      } catch (error) {
        console.error("Failed to trim old messages:", error.message);
      }

      const messageSent = {
        id: savedMessage.id,
        userId: savedMessage.userId,
        roomId: savedMessage.roomId,
        displayName: user.displayName,
        text: savedMessage.text,
        sentAt: savedMessage.createdAt,
      }

      // console.log(messageSent)
      io.to(socket.data.roomName).emit("receive-message", messageSent);
    } catch (error) {
      console.error("Failed to send message failed:", error.message);
      socket.emit("chat-error", { error: "Could not send message." });
    }
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