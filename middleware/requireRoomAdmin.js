const { Rooms } = require("../models");

// Middlware to check if a user is an admin for a room.
async function requireRoomAdmin(request, response, next) {
  try {
    const roomId = Number(request.params.id);
    if (!Number.isInteger(roomId) || roomId < 1) {
      return response.status(400).json({error: "Invalid room ID.",});
    }

    const room = await Rooms.findByPk(roomId);
    if (!room) {
      return response.status(404).json({error: "Room not found.",});
    }

    if (room.is_default) {
      return response.status(403).json({error: "Default rooms cannot be modified." });
    }

    if (room.adminUserId !== request.user.id) {
      return response.status(403).json({error: "Only the room administrator can modify this room." });
    }

    // Adds room to the request so we don't need to find it again.
    request.room = room;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = requireRoomAdmin;