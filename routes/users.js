const express = require("express");
const router = express.Router();
const { Users } = require("../models")
const { requireAuth } = require('../middleware/auth');

// Add requireAuth to a route for it to require a JWT token in the header to be accessed.

// Returns only public info we want from users
function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    school: user.school,
    totalStudyTime: user.totalStudyTime,
  };
}

// Returns private info that only the authenticated user should be able to see.
function toPrivateUser(user) {
  return {
    ...toPublicUser(user),
    email: user.email,
    activeStudyTime: user.activeStudyTime,
  };
}


// Get all users public profile like id & displayName (Must not include any private info)
router.get("/", async (request, response, next) => {
  try {
    const users = await Users.findAll();
    const publicInfo = users.map(user => (toPublicUser(user)));
    response.json(publicInfo);
  } catch (error) {
    next(error)
  }
})

// Get a single users info (Must be protected)
router.get('/me', requireAuth, async (request, response, next) => {
  try {
    const privateInfo = toPrivateUser(request.user)
    response.json(privateInfo);
  } catch (error) {
    next(error);
  }
});


router.get("/", async (request, response, next) => {
  try {
    const users = await Users.findAll();
    const publicInfo = users.map(user => (toPublicUser(user)));
    response.json(publicInfo);
  } catch (error) {
    next(error)
  }
})

// Get a specific user
router.get("/:id", async (request, response, next) => {
  try {
    const user = await Users.findByPk(request.params.id);
    if (!user) {
      return response.status(404).json({ error: "User not found" });
    }

    const publicInfo = toPublicUser(user)
    response.json(publicInfo);
  } catch (error) {
    next(error);
  }
});


// Update user profile (Must be protected & only allow certain fields to be changed.)
router.patch("/me", requireAuth,  async (request, response, next) => {
  try {
    const allowedUpdates = {}
    if (request.body.displayName !== undefined) {
      allowedUpdates.displayName = request.body.displayName;
    }
    if (request.body.school !== undefined) {
      allowedUpdates.school = request.body.school;
    }

    if (!request.user) {
      return response.status(404).json({ error: "User not found" });
    }

    await request.user.update(allowedUpdates)

    const updatedUser = {
      userId: request.user.id,
      name: request.user.name,
      displayName: request.user.displayName,
    }
    response.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

// Allow the user to delete their own profile (Must be protected)
router.delete('/me', requireAuth, async (request, response, next) => {
  try {
    await request.user.destroy()
    response.json({ message: "Successfully deleted user!"});
  } catch (error) {
    next(error);
  }
});

module.exports = router