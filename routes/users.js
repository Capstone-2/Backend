const express = require("express");
const router = express.Router();
const { Users } = require("../models")

// Get all users
router.get("/", async (req, res, next) => {
    try{
        const user = await Users.findAll();
        res.json(user)
    }catch(error){
        next(error)
    }
})

// Get a specific user
router.get("/:id", async (req, res, next) => {
    try {
      const user = await Users.findByPk(req.params.id);
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      res.json(user);
    } catch(error) {
      next(error);
    }
  });
  
  
  // Update user profile
  router.patch("/:id", async (req, res, next) => {
    try {
      const user = await Users.findByPk(req.params.id);
  
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
  
      await user.update(req.body);
  
      res.json(user);
    } catch(error) {
      next(error);
    }
  });

module.exports = router