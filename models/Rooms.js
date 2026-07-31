const { DataTypes } = require("sequelize");
const db = require("../db");

const RoomsModel = db.define("Room", {
  adminUserId: {
    type: DataTypes.INTEGER,
    allowNull: true, // If we want public default rooms then some rooms need to have a null admin user.
  },
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
    defaultValue: "/default.jpg",
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
  is_default: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
});

module.exports = RoomsModel;
