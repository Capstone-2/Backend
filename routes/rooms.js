const express = require("express");
const roomsRouter = express.Router();
const { Rooms, Users } = require("../models");

roomsRouter.get("/", async (req, res, next) => {
  try {
    const rooms = await Rooms.findAll();
    if (!rooms) {
      return res.status(404).json("no rooms here");
    }
    res.status(200).json(rooms);
  } catch (error) {
    next(error);
  }
});

roomsRouter.get("/:id", async (req, res, next) => {
  try {
    const room = await Rooms.findByPk(Number(req.params.id), {
      include: {
        model: Users,
      },
    });
    if (!room) {
      return res.status(404).json("didn't find the room");
    }
    res.status(200).json(room);
  } catch (error) {
    next(error);
  }
});

roomsRouter.post("/", async (req, res, next) => {
  try {
    const roomData = req.body;
    //const userId = Number(req.body.userId)]
    //post a room, but also include the userId who posts
    const newRoom = await Rooms.create(roomData);
    if (!newRoom) {
      return res.status(404).json("fail to create");
    }
    res.status(200).json(newRoom);
  } catch (error) {
    next(error);
  }
});

//patch a room's name, image, capacity
roomsRouter.patch("/:id", async (req, res, next) => {
  try {
    const newRoom = req.body;
    const room = await Rooms.findByPk(Number(req.params.id));
    if (!room) {
      return res.status(404).json("fail to update the room");
    }
    await room.update(newRoom);
    res.status(200).json(room);
  } catch (error) {
    next(error);
  }
});

roomsRouter.delete("/:id", async (req, res, next) => {
  try {
    //FOR LATER:check userId first, if the user is delete their own room
    const room = await Rooms.findByPk(Number(req.params.id));

    if (!room) {
      return res.status(404).json("fail to delete the room");
    }

    await room.destroy();

    res.status(200).send("deleted");
  } catch (error) {
    next(error);
  }
});

module.exports = roomsRouter;
