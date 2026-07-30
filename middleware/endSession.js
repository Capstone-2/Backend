const {db, Sessions, Users} = require("../models");

async function endSession(sessionId, userId) {
  return db.transaction(async (transaction) => {
    const session = await Sessions.findOne({
      where: {
        id: sessionId,
        userId,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!session) {
      const error = new Error("Study session not found.");
      error.status = 404;
      throw error;
    }

    if (session.endedAt !== null) {
      const error = new Error("This study session has already ended.");
      error.status = 409;
      throw error;
    }

    const endedAt = new Date();
    const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000));

    await session.update({endedAt, durationSeconds,}, {
        transaction,
    });

    await Users.increment({totalStudyTime: durationSeconds,},{
        where: {id: userId,},
        transaction,
    });

    return session;
  });
}

module.exports = {endSession};