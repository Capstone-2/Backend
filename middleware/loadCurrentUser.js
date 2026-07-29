const { Users } = require("../models");

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

module.exports = loadCurrentUser;