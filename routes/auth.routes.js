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
const { User } = require('../models');
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

// CREATE-IF-NEW — POST /auth/auth0

// findOrCreate looks for a row with this auth0Id. If it exists we get it back;
// if not, Sequelize creates it. That makes this safe to call on every login.
//   - auth0Id / email / name: from the token (trusted)
//   - username: from req.body (the app-specific field the user chose)
router.post('/auth0', async (req, res, next) => {
  try {
    const { auth0Id, email, name } = identityFromToken(req);
    const { username } = req.body;

    const [user, created] = await User.findOrCreate({
      where: { auth0Id },
      defaults: { auth0Id, username, email, name },
    });

    res.status(created ? 201 : 200).json(user); // 201 = Created, 200 = already existed
  } catch (err) {
    // Sequelize throws these when a validation rule (username length, email
    // format) or a unique constraint (username already taken) fails. Turn them
    // into a clean 400 instead of letting them fall through as a 500.
    if (
      err.name === 'SequelizeValidationError' ||
      err.name === 'SequelizeUniqueConstraintError'
    ) {
      return res
        .status(400)
        .json({ error: err.errors?.[0]?.message || 'Invalid user data' });
    }
    next(err);
  }
});

// READ ME — GET /auth/me

// Look the user up by the auth0Id from their token, so a user can only ever
// read their OWN record.
router.get('/me', async (req, res, next) => {
  try {
    const { auth0Id } = identityFromToken(req);
    const user = await User.findOne({ where: { auth0Id } });

    if (!user) {
      return res
        .status(404)
        .json({ error: 'User not found. Sync first with POST /auth/auth0.' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;