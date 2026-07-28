const sequelize = require("sequelize")

const DB_CONNECTION_URL = process.env.DB_URL || process.env.LOCAL_DB_URL 

const db = new sequelize(DB_CONNECTION_URL, {
    dialect: postgres,
    logging: false, 
    dialectOptions: process.env.DB_URL
    ? { ssl: { require: true, rejectUnauthorized: false} }
    : {}
});

module.exports = db