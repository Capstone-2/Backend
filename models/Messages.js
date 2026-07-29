const { DataTypes } = require("sequelize");
const db = require("../db");

const Messages = db.define("Message", {
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

module.exports = Messages;
