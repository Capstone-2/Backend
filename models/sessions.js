const { DataTypes } = require("sequelize");
const db = require("../db")

const Sessions = db.define('Session', {
    name: {
        type: DataTypes.STRING,
        allowNull: true
    }
})

module.exports = Sessions;