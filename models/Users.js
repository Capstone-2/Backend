const { DataTypes } = require("sequelize")
const db = require("../db/index")

const Users = db.define('User', {
    // Important!
    auth0Id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },

    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },

    email:{
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {isEmail: true}
    },

    school:{
        type: DataTypes.STRING,
        allowNull: true,
    },

    totalStudyTime:{
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },

    activeStudyTime:{
        type:DataTypes.INTEGER,
        defaultValue: 0 
    }
})

module.exports = Users