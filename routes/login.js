const express = require("express")
const router = express.Router()
const morgan = require("morgan")
const cors = require("cors")

// ---------- API routes ----------
router.get('/login', (request, response, next) => {
  // NOTE - cookies are only set for browser only - can't test POST on postman - so i'm using query with a GET for demo but it should be a POST sent by a user
  const name = req.query.username;
  // NOTE - some login check here! --> assume we authenticate the user successfully!
  // sign a token: the user's info lives INSIDE the token, not on the server

  const userPayload = { username: name };   // This can be everything in the user table?  
  const token = jwt.sign(userPayload, SECRET, { expiresIn: '15m' }); // encode it!
  console.log('Signed token:', token);

  // NOTE - for the demo we hand the token back via a cookie so the browser auto-sends it,
  // but it's the JOB OF THE CLIENT to handle the JWT
  // OPTIONS:
  //  1. client stores the JWT in the cookie
  //  2. client stores the JWT in localstorage (without cookies)
  //  3. client stores the JWT in sessionStorage (without cookies)
  //  4. client stores the JWT in-memory client side (without cookies)

  response.cookie('token', token, {
    httpOnly: true,
    // secure: true,
    // sameSite: true,
    // maxAge: 15_000,
  });

  response.send(`you are now logged in as ${name}!`);
});

module.exports = router