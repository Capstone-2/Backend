// sockets/webrtc.js — signaling relay for WebRTC video/audio.
// The server never touches video or audio data — it only relays connection
// setup messages between two specific browsers so they can connect directly.

function registerWebRTCHandlers(io, socket){


     // Fires when a user turns their camera on.
  // We don't touch any video here — we just tell everyone else in the
  // room "this person's camera is available now", so their browsers
  // know to start a connection attempt with this user.

  socket.on("camera-on", () => {
    try{
        if(!socket.data.roomName) {
            return socket.emit("webrtc-error", {error: "Join a room before enabling your camera."});
        }

        const user = socket.data.user;
        // console.log("camera-on received from:", user.displayName);
        socket.to(socket.data.roomName).emit("peer-camera-on", {
            userId: user.id,
            displayName: user.displayName,
        });

    } catch (error){
        console.log("camera-on failed:",error.message);
        socket.emit("webrtc-error", {error: "Could not announce camera."});
    }
  });

    // Fires when a user turns their camera off.
  // Tells the room so other browsers know to close their connection
  // to this user's video (no point keeping a dead connection open).
  socket.on("camera-off", () => {
    try {
      if (!socket.data.roomName) return;

      const user = socket.data.user;
      socket.to(socket.data.roomName).emit("peer-camera-off", {
        userId: user.id,
      });
    } catch (error) {
      console.error("camera-off failed:", error.message);
    }
  });

   // Part 1 of the WebRTC "handshake" between two specific browsers.
  // targetUserId matters here — unlike chat messages, this must only
  // reach ONE person, not the whole room, since each pair of users
  // negotiates their own private connection.
  socket.on("webrtc-offer", ({ targetUserId, offer }) => {
    try {
      if (!socket.data.roomName) return;

      io.to(socket.data.roomName).emit("webrtc-offer", {
        fromUserId: socket.data.user.id, // who this offer is from
        targetUserId,                     // who it's meant for
        offer,                            // the actual connection data, opaque to us
      });
    } catch (error) {
      console.error("webrtc-offer relay failed:", error.message);
    }
  });

   // Part 2 of the handshake — the reply to an offer above.
  // Same targeting logic: only the original offer-sender should act on this.
  socket.on("webrtc-answer", ({ targetUserId, answer }) => {
    try {
      if (!socket.data.roomName) return;

      io.to(socket.data.roomName).emit("webrtc-answer", {
        fromUserId: socket.data.user.id,
        targetUserId,
        answer,
      });
    } catch (error) {
      console.error("webrtc-answer relay failed:", error.message);
    }
  });

    // Extra network info exchanged during connection setup (how to actually
  // reach each other over the network). Usually fires several times per
  // connection — that's normal, not a bug.
  socket.on("webrtc-ice-candidate", ({ targetUserId, candidate }) => {
    try {
      if (!socket.data.roomName) return;

      io.to(socket.data.roomName).emit("webrtc-ice-candidate", {
        fromUserId: socket.data.user.id,
        targetUserId,
        candidate,
      });
    } catch (error) {
      console.error("webrtc-ice-candidate relay failed:", error.message);
    }
  });

    // When a socket disconnects (tab closed, refresh, etc.), tell the room
  // this user's camera is effectively off too, so peers clean up their
  // connections instead of holding onto a dead one.
  socket.on("disconnect", () => {
    if (socket.data.roomName && socket.data.user) {
      socket.to(socket.data.roomName).emit("peer-camera-off", {
        userId: socket.data.user.id,
      });
    }
  });

}

module.exports = { registerWebRTCHandlers };