const express = require("express");
const sessionsRouter = express.Router();

const { Users, Rooms, Sessions } = require("../models");
const { requireAuth } = require("../middleware/auth");
const { endSession } = require("../middleware/endSession")
const { emitRoomUsers } = require("../sockets/chat");

sessionsRouter.post("/", requireAuth, async (request, response, next) => {
    try {
        const roomId = Number(request.body.roomId);
        if (!Number.isInteger(roomId) || roomId < 1) {
            return response.status(400).json({
                error: "Invalid room ID.",
            });
        }

        const room = await Rooms.findByPk(roomId);
        if (!room) {
            return response.status(404).json({
                error: "Room not found.",
            });
        }

        const activeSession = await Sessions.findOne({
            where: {
                userId: request.user.id,
                endedAt: null,
            },
        });

        if (activeSession) {
            return response.status(409).json({
                error: "You already have an active study session.",
                session: activeSession,
            });
        }

        const newSession = await Sessions.create({
            userId: request.user.id,
            roomId,
            startedAt: new Date(),
            endedAt: null,
            durationSeconds: null,
        });

        const io = request.app.get("io");
        if (io) {
            await emitRoomUsers(io, `room-${roomId}`);
        }

        response.status(201).json(newSession);
    } catch (error) {
        next(error);
    }
})

sessionsRouter.patch("/:id/end", requireAuth, async (request, response, next) => {
    try {
        const sessionId = Number(request.params.id);
        if (!Number.isInteger(sessionId) || sessionId < 1) {
            return response.status(400).json({
                error: "Invalid session ID.",
            });
        }

        const endedSession = await endSession(sessionId, request.user.id);
        const io = request.app.get("io");
        if (io) {
            await emitRoomUsers(io, `room-${endedSession.roomId}`);
        }

        response.status(200).json(endedSession);
    } catch (error) {
        next(error);
    }
}
);

module.exports = sessionsRouter;