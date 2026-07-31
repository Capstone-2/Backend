const { Rooms, Users, Sessions, Messages } = require("../models");
const { endSession } = require("../middleware/endSession")

const MESSAGE_LIMIT_PER_ROOM = 100;  // Message history limit

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

async function endSocketStudySession(socket) {
  const userId = socket.data.user?.id;
  const roomId = socket.data.roomId;

  if (!userId || !roomId) {
    return null;
  }

  const activeSession = await Sessions.findOne({
    where: {userId, roomId, endedAt: null}
  });

  if (!activeSession) {
    return null;
  }

  try {
    return await endSession(activeSession.id, userId);
  } catch (error) {
    // The REST stop route may have ended it at nearly
    // the same moment as the socket disconnected.
    if (error.status === 404 || error.status === 409) {
      return null;
    }
    throw error;
  }
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

  socket.on("leave-room", async () => {
    const roomName = socket.data.roomName;
    if (!roomName) {
      return;
    }

    const user = socket.data.user;

    try {
      const endedSession = await endSocketStudySession(socket)
      if (endedSession) {
        console.log("Study session ended on room leave:", endedSession.id)
      }
    } catch(error) {
      console.error("Failed to end session on room leave:", error.message)
      socket.emit("chat-error", {error: "You left the room, but your study session could not be ended."})
    }

    socket.leave(roomName);
    socket.to(roomName).emit("user-left", {
      userId: user.id,
      displayName: user.displayName,
    });

    socket.data.roomId = null;
    socket.data.roomName = null;
  });

  socket.on("disconnect", async (reason) => {
    const roomName = socket.data.roomName;
    const user = socket.data.user;

    try {
      const endedSession = await endSocketStudySession(socket);
      if (endedSession) {
        console.log("Study session ended on disconnect:", endedSession.id, reason);
      }
    } catch (error) {
      console.error("Failed to end session on disconnect:", error.message);
    }

    if (roomName && user) {
      io.to(roomName).emit("user-left", {
        userId: user.id,
        displayName: user.displayName,
      });
    }

    socket.data.roomId = null;
    socket.data.roomName = null;
  });
}

module.exports = { registerChatHandlers };