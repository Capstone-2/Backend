const express = require("express");
const router = express.Router();
const { Users } = require("../models")
const { jwtCheck, CLAIMS_NAMESPACE } = require('../middleware/auth');

// Add jwtCheck to a route for it to require a JWT token in the header to be accessed.

// Finds user by the auth payload and adds the DB entry to the request if it was a success.
async function loadCurrentUser(request, response, next) {
  try {
    const auth0Id = request.auth.payload.sub;
    const foundUser = await Users.findOne({
      where: { auth0Id, },
    });

    if (!foundUser) {
      return response.status(404).json({
        error: "Authenticated user has not been synchronized.",
      });
    }

    request.user = foundUser;
    next();
  } catch (error) {
    next(error);
  }
}

// Get all users public profile like id & displayName (Must not include any private info)
router.get("/", async (request, response, next) => {
  try {
    const users = await Users.findAll();
    const publicInfo = users.map(user => ({
      userId: user.id,
      name: user.name,
      displayName: user.displayName,
    }));
    response.json(publicInfo);
  } catch (error) {
    next(error)
  }
})

// Get a single users info (Must be protected)
router.get('/me', jwtCheck, loadCurrentUser, async (request, response, next) => {
  try {
    response.json(request.user);
  } catch (error) {
    next(error);
  }
});

// Get a specific user
router.get("/:id", async (req, res, next) => {
  try {
    const user = await Users.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});


// Update user profile (Must be protected & only allow certain fields to be changed.)
router.patch("/me", jwtCheck, loadCurrentUser,  async (request, response, next) => {
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
router.delete('/me', jwtCheck, loadCurrentUser, async (request, response, next) => {
  try {
    request.user.destroy()
    response.json({ message: "Successfully deleted user!"});
  } catch (error) {
    next(error);
  }
});

module.exports = router