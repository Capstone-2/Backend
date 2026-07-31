const { DataTypes } = require("sequelize")
const db = require("../db/index")

const Users = db.define('User', {
    // Important!
    auth0Id: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    
    // The user's full name. Comes from Auth0 for OAuth users; optional for everyone.
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    // A name the user picks in OUR app (sent from the frontend).
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: { len: [3, 20] }, // must be 3–20 characters
    },

    // A display name the user picks for when entering a room only.
    displayName:{
        type: DataTypes.STRING,
        allowNull: true,
    },

    email:{
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {isEmail: true}
    },

    // NEVER the password itself — only bcrypt's one-way hash of it. Even if this
    // table leaked, the original passwords are not in it.
    passwordHash: {
        type: DataTypes.STRING,
        allowNull: true, // null for Auth0/OAuth users — Auth0 holds their credential
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

// Express calls toJSON automatically whenever you res.json(user). Overriding it
// here means the password hash can NEVER leak out of an endpoint by accident —
// we don't have to remember to strip it at every call site.
// NOTE TO SELF: THIS IS IMPORTANT!
Users.prototype.toJSON = function () {
  const values = { ...this.get() };
  delete values.passwordHash;
  return values;
};

module.exports = Users