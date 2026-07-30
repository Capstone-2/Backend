const authRouter = require("./auth.routes")
const userRouter = require("./users")
const roomRouter = require("./rooms")
const sessionRouter = require("./sessions")

module.exports = { authRouter, userRouter, roomRouter, sessionRouter }