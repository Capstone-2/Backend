const { DataTypes } = require("sequelize");
const db = require("../db");

const Messages = db.define("Message", {
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
});

module.exports = Messages;
