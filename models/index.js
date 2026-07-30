const db = require("../db"); // Database connection
const Users = require("./Users");
const Rooms = require("./Rooms");
const Sessions = require("./sessions");

// Association

Users.belongsToMany(Rooms, { through: Sessions, foreignKey: "userId" });
Rooms.belongsToMany(Users, { through: Sessions, foreignKey: "roomId" });

module.exports = {
  db,
  Users,
  Rooms,
  Sessions,
};
