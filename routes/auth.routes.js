/**
 * auth.routes.js — endpoints that connect a logged-in Auth0 user to our
 * database. app.js mounts this at /auth, so `.get('/me')` answers GET /auth/me.
 *
 *   POST /auth/auth0  ->  create the user if they don't exist yet, return their row
 *   GET  /auth/me     ->  return the logged-in user's row
 *
 *   You may add more later!
 *
 * Both routes are PROTECTED. `router.use(jwtCheck)` runs first and verifies the
 * Auth0 access token, so if the token is missing or invalid the request never
 * reaches the handlers below.
 */

const express = require('express');
const { Users } = require('../models');
const { jwtCheck, CLAIMS_NAMESPACE } = require('../middleware/auth');

const router = express.Router();

// Protect EVERYTHING in this router.
// But, you should also use this jwtCheck middleware for any routes you want to protect!
router.use(jwtCheck);

// Pull the user's identity out of the VERIFIED token — we never trust the
// client for these, because Auth0 signed them.
//   - sub: the Auth0 user id (always present) -> stored as auth0Id
//   - email / name: CUSTOM CLAIMS added by our Auth0 Post-Login Action
function identityFromToken(req) {
  const claims = req.auth.payload;
  return {
    auth0Id: claims.sub,
    email: claims[`${CLAIMS_NAMESPACE}/email`] || null,
    name: claims[`${CLAIMS_NAMESPACE}/name`] || null,
  };
}

router.get("/test", (req, res) => {
  res.json({ message: "Auth router works" });
});

// CREATE-IF-NEW — POST /auth/auth0

// findOrCreate looks for a row with this auth0Id. If it exists we get it back;
// if not, Sequelize creates it. That makes this safe to call on every login.
//   - auth0Id / email / name: from the token (trusted)
//   - username: from req.body (the app-specific field the user chose)
router.post('/auth0', jwtCheck, async (request, response, next) => {
  try {
    const auth0Id = request.auth.payload.sub;

    // Profile values are not used as authenticated identity.
    const { name, email } = request.body;
    if (!name || !email) {
      return response.status(400).json({
        error: "Name and email are required.",
      });
    }

    const [user, created] = await Users.findOrCreate({
      where: { auth0Id, },
      defaults: { auth0Id, name, email, school: null, },
    });

    response.status(created ? 201 : 200).json(user); // 201 = Created, 200 = already existed
  } catch (error) {
    // Sequelize throws these when a validation rule (username length, email
    // format) or a unique constraint (username already taken) fails. Turn them
    // into a clean 400 instead of letting them fall through as a 500.
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return response
        .status(400)
        .json({ error: error.errors?.[0]?.message || 'Invalid user data' });
    }
    next(error);
  }
});

// READ ME — GET /auth/me

// Look the user up by the auth0Id from their token, so a user can only ever
// read their OWN record.
router.get('/me', async (req, res, next) => {
  try {
    const auth0Id = req.auth.payload.sub;
    const user = await Users.findOne({ where: { auth0Id } });

    if (!user) {
      return res.status(404).json({ 
        error: 'Authenticated user not found. Sync first with POST /auth/auth0.' 
      });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;