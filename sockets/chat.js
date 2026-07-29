function registerChatHandlers(io, socket) {
  socket.on("join-room", ({ roomId, userId, displayName }) => {
    const room = `room-${roomId}`;
    socket.join(room);
    socket.data.userId = userId;
    socket.data.displayName = displayName;
    socket.data.room = room;

    socket.to(room).emit("user-joined", { userId, displayName });
  });

  socket.on("send-message", ({ roomId, text }) => {
    const room = `room-${roomId}`;
    io.to(room).emit("receive-message", {
      userId: socket.data.userId,
      displayName: socket.data.displayName,
      text,
      sentAt: new Date().toISOString(),
    });
  });

  socket.on("leave-room", ({ roomId }) => {
    const room = `room-${roomId}`;
    socket.leave(room);
    socket.to(room).emit("user-left", {
      userId: socket.data.userId,
      displayName: socket.data.displayName,
    });
  });

  socket.on("disconnect", () => {
    if (socket.data.room) {
      socket.to(socket.data.room).emit("user-left", {
        userId: socket.data.userId,
        displayName: socket.data.displayName,
      });
    }
  });
}

module.exports = { registerChatHandlers };