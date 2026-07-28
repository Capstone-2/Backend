// middleware/auth.js — verifies the Auth0 access token on protected routes.
// The express-oauth2-jwt-bearer package does the hard part (fetching Auth0's
// public keys and checking the token's signature). We just configure it.

const { auth } = require('express-oauth2-jwt-bearer');

// Custom claims (like the user's email) must be namespaced with a URL-like
// string, or Auth0 strips them from the token. This MUST match the namespace
// used in your Auth0 Post-Login Action.
const CLAIMS_NAMESPACE = 'https://myapp.example.com';

// Fail loudly at startup if the Auth0 env vars are missing, instead of letting
// every request 401 with no clue why. Copy .env.example to .env and fill these in.
if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
  throw new Error('Missing Auth0 env vars — set AUTH0_DOMAIN and AUTH0_AUDIENCE in .env.');
}

// jwtCheck is middleware. Put it on any route — or a whole router — to protect it:

//   router.use(jwtCheck)                     // protect every route in a router
//   app.get('/secret', jwtCheck, handler)    // protect a single route

// On success it attaches the decoded token to req.auth.payload
// (req.auth.payload.sub is the Auth0 user id). On failure it throws a 401
// BEFORE your handler runs, so protected code never sees an invalid request.
const jwtCheck = auth({
  audience: process.env.AUTH0_AUDIENCE, // the API identifier you set in Auth0
  issuerBaseURL: `https://${process.env.AUTH0_DOMAIN}/`, // your Auth0 domain
  tokenSigningAlg: 'RS256',
});

module.exports = { jwtCheck, CLAIMS_NAMESPACE };