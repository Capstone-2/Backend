const { DataTypes} = require("sequelize")
const db = require("../db/index")

const Users = db.define('User', {
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