/**
 * auth.routes.js — everything about WHO the user is.
 * app.js mounts this at /auth, so `.get('/me')` answers GET /auth/me.
 *
 *   PUBLIC (no token needed — this is how you GET a token):
 *     POST /auth/signup  ->  create an account with email + password
 *     POST /auth/login   ->  exchange email + password for a token cookie
 *     POST /auth/logout  ->  throw the cookie away
 *
 *   AUTH0 ONLY:
 *     POST /auth/auth0   ->  after an OAuth login, store that user in our db
 *
 *   EITHER CREDENTIAL (our cookie OR an Auth0 Bearer token):
 *     GET  /auth/me      ->  the logged-in user's row
 *
 * THE BIG IDEA — we never store passwords. bcrypt.hash turns a password into a
 * long string that CANNOT be turned back into the original (it is one-way, not
 * encryption — there is no "unhash"). To check a password later, we hash the
 * attempt the same way and compare the two hashes with bcrypt.compare.
 */

const express = require('express');
const bcrypt = require('bcrypt');
const { Users } = require('../models');
const { Op } = require("sequelize")
const { rateLimit } = require('express-rate-limit');
const {
  jwtCheck,
  requireAuth,
  identityFromToken,
  sendTokenCookie,
  clearTokenCookie,
  CLAIMS_NAMESPACE
} = require('../middleware/auth');
const loadCurrentUser = require('../middleware/loadCurrentUser');

// Protect EVERYTHING in this router.
// But, you should also use this jwtCheck middleware for any routes you want to protect!
// router.use(jwtCheck);
const router = express.Router();

const SALT_ROUNDS = 12;
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // 20 attempts per IP per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: '🛑 Too many attempts, please try again later.' },
});

// Turn Sequelize's validation/uniqueness errors into a clean 400 instead of
// letting them fall through to the error handler as a confusing 500.
const handleDbError = (error, response, next) => {
  if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
    return response.status(400).json({ error: error.errors?.[0]?.message || 'Invalid user data' });
  }
  return next(error);
}

// Our users table demands a username that is unique and 3–20 characters long.
// Auth0's nickname is neither guaranteed: two Google accounts can easily share
// "alex", and some are shorter than three characters. Without this, the second
// "alex" to log in would hit the unique constraint and never get a row —
// Auth0 would think they're logged in while our app showed them logged out.
//
// So: strip anything that isn't a letter/number/underscore, make sure it's long
// enough, then add a number if that name is already taken.
const uniqueUsername = async (preferred) => {
  const cleaned = (preferred || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 16);
  const base = cleaned.length >= 3 ? cleaned : 'user';

  let candidate = base;
  let suffix = 1;
  // Keep trying base, base1, base2... until we find one nobody has.
  while (await User.findOne({ where: { username: candidate } })) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }

  return candidate;
};

router.get("/test", (request, response) => {
  response.json({ message: "Auth router works" });
});

// ---------------------------------------------------------------------------
// SIGN UP — POST /auth/signup
// ---------------------------------------------------------------------------
router.post('/signup', authLimiter, async (request, response, next) => {
  try {
    const { username, email, password } = request.body;
    if (!username || !email || !password) {
      return response.status(400).json({ error: "Username, email, and password are all required."})
    }

    if (password.length < 6) {
      return response.status(400).json({ error: "Password must be at least 6 characters."})
    }

    const existing = await Users.findOne({
      where: {[ Op.or ]: [{email}, {username}]}
    })

    if (existing) {
      return response.status(409).json({error: existing.email === email
            ? 'An account with that email already exists'
            : 'That username is taken',
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await Users.create({username, email, passwordHash})
    sendTokenCookie(response, user);
  } catch(error) {
    handleDbError(error, response, next)
  }
})

// ---------------------------------------------------------------------------
// LOG IN — POST /auth/login
// ---------------------------------------------------------------------------
router.post('/login', async (request, response, next) => {
  try {
    // `identifier` is whatever the user typed in the "Email or username" box.
    // We also accept a bare `email` or `username` key so the endpoint is easy
    // to call from Postman/curl while you're testing.
    const { identifier, email, username, password } = request.body;
    const login = identifier || email || username;
    if (!login || !password) {
      return response.status(400).json({ error: 'Email/username and password are required' });
    }

    // One query, either column — the user shouldn't have to remember which
    // one they signed up with.
    const user = await Users.findOne({
      where: { [Op.or]: [{ email: login }, { username: login }] },
    });

    // Deliberately vague, and identical for "no such account" and "wrong
    // password". A precise message like "no account with that email" tells an
    // attacker which emails ARE registered — that's a free list of targets.
    const invalid = () => response.status(401).json({ error: 'Invalid email/username or password' });
    if (!user) return invalid();

    // An OAuth user has no passwordHash, so there is no password to check.
    // Point them at the button that actually works for their account.
    if (!user.passwordHash) {
      return response.status(400).json({
        error: 'This account uses social login — sign in with Auth0 instead.',
      });
    }

    // The heart of it: hash the attempt and compare. bcrypt reads the salt out
    // of the stored hash, so we never have to store or manage the salt ourselves.
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) return invalid();
    sendTokenCookie(response, user);

    response.json(user);
  } catch (error) {
    next(error);
  }
});

// ---------------------------------------------------------------------------
// SYNC AN AUTH0 USER — POST /auth/auth0
// ---------------------------------------------------------------------------
// Auth0-only: jwtCheck runs first, so we KNOW the caller holds a valid Auth0
// token. We look for a row with this auth0Id and create one if it's missing,
// which makes this safe for the frontend to call on EVERY login: the first
// time it creates the user, every time after that it just returns them.
router.post('/auth0', jwtCheck, async (request, response, next) => {
  try {
    //const auth0Id = request.auth.payload.sub;
    const { auth0Id, email, name } = identityFromToken(request);
    const existing = await Users.findOne({where: {auth0Id}});

    if (existing) return response.json(existing); // 200 = already existed

    const username = await uniqueUsername(request.body.username || name || email?.split('@')[0]);

    // passwordHash is intentionally absent — Auth0 owns this user's credential.
    const user = await Users.create({ auth0Id, username, email, name });
    response.status(201).json(user); // 201 = Created
  } catch (error) {
    // Sequelize throws these when a validation rule (username length, email
    // format) or a unique constraint (username already taken) fails. Turn them
    // into a clean 400 instead of letting them fall through as a 500.
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      return response.status(400).json({error: error.errors?.[0]?.message || 'Invalid user data'});
    }
    next(error);
  }
});

// ---------------------------------------------------------------------------
// LOG OUT — POST /auth/logout
// ---------------------------------------------------------------------------
// There's no server-side session to destroy — a JWT is stateless. "Logging
// out" means deleting the cookie so the browser stops sending it.
router.post('/logout', (request, response, next) => { 
  try {
    console.log
    clearTokenCookie(response);
    response.json({ message: 'Logged out' });
  } catch(error) {
    next(error)
  }
});

// READ ME — GET /auth/me

// Look the user up by the auth0Id from their token, so a user can only ever
// read their OWN record.
router.get('/me', requireAuth, async (request, response, next) => {
  try {
    response.json(request.user);
  } catch (error) {
    next(error);
  }
});

module.exports = router;