const { DataTypes } = require("sequelize");
const db = require("../db");

const Sessions = db.define("Session", {
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM("host", "student"),
    defaultValue: "student",
  },
  //will add a timer later, maybe front end
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
});

module.exports = Sessions;
