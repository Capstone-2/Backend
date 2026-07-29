const db = require("../db"); // Database connection
const Users = require("./Users");
const Rooms = require("./Rooms");
const Sessions = require("./sessions")

// Association 

 Users.belongsToMany(Rooms,{through: Sessions})
 Rooms.belongsToMany(Users,{through: Sessions})



module.exports = {
  db,
  Users,
  Rooms,
  Sessions,
};
