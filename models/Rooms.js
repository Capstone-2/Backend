const { DataTypes, Sequelize } = require("sequlize");
const db = require("../db");

const RoomsModel = db.define("room", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  image: {
    type: DataTypes.TEXT,
    //a default image
    allowNull: true,
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { isIn: [[2, 4, 8, 16]] },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { len: [4, 4] },
  },
});

module.exports = RoomsModel;
