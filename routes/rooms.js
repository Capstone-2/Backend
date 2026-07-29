const express = require("express");
const roomsRouter = express.Router();
const { Rooms, Users } = require("../models");

// Auth protection
const { jwtCheck } = require("../middleware/auth");
const loadCurrentUser = require("../middleware/loadCurrentUser");
const requireRoomAdmin = require("../middleware/requireRoomAdmin");

roomsRouter.get("/", async (request, response, next) => {
  try {
    // Public info get the room and the user designated as the admin for that room.
    const rooms = await Rooms.findAll({
      attributes: {exclude: ["password"]},
      include: {
        model: Users,
        as: "admin",
        attributes: ["id", "name", "displayName"],
      },
    });
    if (!rooms) {
      return response.status(404).json("no rooms here");
    }
    response.status(200).json(rooms);
  } catch (error) {
    next(error);
  }
});

roomsRouter.get("/:id", async (request, response, next) => {
  try {
    const room = await Rooms.findByPk(Number(request.params.id), {
      include: {model: Users, attributes: ["id", "name", "displayName"],},
    });
    if (!room) {
      return response.status(404).json("Failed to find room");
    }
    response.status(200).json(room);
  } catch (error) {
    next(error);
  }
});

roomsRouter.post("/", jwtCheck, loadCurrentUser, async (request, response, next) => {
  try {
    const roomData = request.body;
    //const userId = Number(req.body.userId)]
    //post a room, but also include the userId who posts
    const newRoom = await Rooms.create({
      name: roomData.name,
      description: roomData.description,
      image: roomData.image,
      capacity: roomData.capacity,
      adminUserId: request.user.id, // IMPORTANT
    });

    if (!newRoom) {
      return response.status(404).json("Failed to create a room.");
    }
    response.status(201).json(newRoom);
  } catch (error) {
    next(error);
  }
});

//patch a room's name, image, capacity
roomsRouter.patch("/:id", jwtCheck, loadCurrentUser, requireRoomAdmin, async (request, response, next) => {
  try {
    const updates = {}

    if (request.body.name !== undefined) {
      updates.name = request.body.name;
    }

    if (request.body.description !== undefined) {
      updates.description =
        request.body.description;
    }

    if (request.body.image !== undefined) {
      updates.image = request.body.image;
    }

    if (request.body.capacity !== undefined) {
      updates.capacity = request.body.capacity;
    }

    await request.room.update(updates);
    response.status(200).json(request.room);
  } catch (error) {
    next(error);
  }
});

roomsRouter.delete("/:id", jwtCheck, loadCurrentUser, requireRoomAdmin, async (request, response, next) => {
  try {
    const room = request.room
    if (!room) {
      return response.status(404).json("Failed to delete a room.");
    }

    await room.destroy();
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = roomsRouter;
