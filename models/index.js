const db = require("../db"); // Database connection
const Users = require("./Users");
const Rooms = require("./Rooms");
const {
  User,
} = require("../../../../assignment/backend-review-task-api/models");
/* Call the files location so that would be our database connection,


*/

// Association

module.exports = {
  db,
  Users,
  Rooms,
};
