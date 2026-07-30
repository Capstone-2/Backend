const { DataTypes } = require("sequelize");
const db = require("../db")

const Sessions = db.define('Session', {
    startedAt: {
        type: DataTypes.DATE,
        allowNull: false,
    },

    endedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },

    durationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
})

module.exports = Sessions;
