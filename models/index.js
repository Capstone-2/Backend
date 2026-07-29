const db = require("../db"); // Database connection
const Users = require("./Users");
const Rooms = require("./Rooms");
const Messages = require("./Messages")
const Sessions = require("./Sessions");

// Association
Users.hasMany(Rooms, {
  as: "createdRooms",
  foreignKey: "adminUserId",
  onDelete: "SET NULL"
})
Rooms.belongsTo(Users, {
  as: "admin",
  foreignKey: "adminUserId",
  onDelete: "SET NULL"
})

Users.belongsToMany(Rooms, { through: Sessions });
Rooms.belongsToMany(Users, { through: Sessions });

// Rooms to Messages Association
Rooms.hasMany(Messages, {foreignKey: 'roomId'});
Messages.belongsTo(Rooms, {foreignKey: 'roomId'});

// Users to Messages Association
Users.hasMany(Messages, {foreignKey: 'userId'});
Messages.belongsTo(Users, {foreignKey: 'userId'});

module.exports = {
  db,
  Users,
  Rooms,
  Sessions,
  Messages,
};
