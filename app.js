require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser")
const { rateLimit } = require("express-rate-limit");

const { db, Rooms, Users, Sessions, Messages} = require("./models");
const { authRouter, userRouter, roomRouter, sessionRouter } = require("./routes")
const { jwtCheck, requireAuth, getUserFromLocalToken, getUserFromAuth0Payload, COOKIE_NAME, CLAIMS_NAMESPACE } = require('./middleware/auth'); // verifies Auth0 tokens

const http = require("http");
const {Server} = require("socket.io");
const {registerChatHandlers} = require("./sockets/chat");
const {registerWebRTCHandlers} = require("./sockets/webrtc");

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});

function runExpressMiddleware(middleware, request) {
  return new Promise((resolve, reject) => {
    const response = {
      setHeader() {},
      getHeader() {return undefined},
      removeHeader() {},
    };

    middleware(request, response, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function createAuthRequest(socket, token) {
  const headers = {
    ...socket.request.headers,
    authorization: `Bearer ${token}`,
  };

  return {
    headers,
    method: socket.request.method || "GET",
    url: socket.request.url || "/socket.io/",
    originalUrl: socket.request.url || "/socket.io/",
    protocol: socket.request.socket?.encrypted ? "https" : "http",
    socket: socket.request.socket,
    app,
    query: {},
    body: {},

    get(headerName) {
      return headers[headerName.toLowerCase()];
    },

    header(headerName) {
      return headers[headerName.toLowerCase()];
    },

    is() {
      return false;
    },
  };
}

function getCookieValue(cookieHeader, cookieName) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const trimmedCookie = cookie.trim();
    const separatorIndex = trimmedCookie.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const name = trimmedCookie.slice(0, separatorIndex);
    const value = trimmedCookie.slice(separatorIndex + 1);
    if (name === cookieName) {
      return decodeURIComponent(value);
    }
  }

  return null;
}

io.use(async (socket, next) => {
  try {
    const auth0Token = socket.handshake.auth?.token;
    let user = null;

    if (auth0Token) {
      /*
       * Door 1: Auth0
       *
       * Auth0 users explicitly send their
       * access token in handshake.auth.
       */
      const authRequest = createAuthRequest(socket, auth0Token);
      await runExpressMiddleware(jwtCheck, authRequest);
      user = await getUserFromAuth0Payload(authRequest.auth?.payload);
    } else {
      /*
       * Door 2: local password login
       *
       * The browser sends our HttpOnly
       * JWT in the handshake's Cookie
       * header.
       */
      const cookieHeader = socket.request.headers.cookie;
      const localToken = getCookieValue(cookieHeader, COOKIE_NAME);

      if (!localToken) {
        return next(new Error("Authentication required"));
      }

      user = await getUserFromLocalToken(localToken);
    }
    
    if (!user) {
      return next(new Error("Authenticated user not found"));
    }

    socket.data.user = {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      icon: user.icon || null,
    };

    next();
  } catch (error) {
    console.error("Socket authentication failed:", error.message);
    next(new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id, socket.data.user.id, socket.data.user.displayName);
  registerChatHandlers(io, socket);
  registerWebRTCHandlers(io, socket); // handles video signaling
} );

// Deployed apps sit behind a proxy (Render, ...). This tells Express
// to trust it, so rate-limiting sees the real visitor IP and secure cookies work.
app.set("trust proxy", 1);

// Stop any one IP from spamming the server.
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max requests per IP in that window
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "🛑 Too many requests, please try again later." },
});

// ---------- Middleware ----------
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", // let our React frontend call this API
    credentials: true, // allow cookies (needed once you add login/auth)
  }),
);
app.use(morgan('dev'))
app.use(express.json({ limit: '10kb' }))
app.use(limiter)
app.use(cookieParser())

// Routers
app.use("/auth", authRouter);
app.use("/users", userRouter);
app.use("/rooms", roomRouter)
app.use("/sessions", sessionRouter)

app.get("/", (request, response, next) => {
  try {
    response.json({ status: 200, msg: "Hello There looks like its working!" });
  } catch (error) {
    next(error);
  }
});

app.get('/api/protected', requireAuth, (request, response) => {
  response.json({
    message: '🔒 Your token is valid — you reached a protected route!',
    userId: request.user.id,
    username: request.user.username,
    // How did they log in? Handy to see the two doors working.
    via: request.user.auth0Id ? 'auth0' : 'password',
  });
});

// ---------- error handler ----------
// Express knows this is the error handler because it takes FOUR arguments.
// Every next(err) from a route ends up here, so all errors funnel to one place.
app.use((error, request, response, next) => {
  if (response.headersSent) {
    return next(error);
  }

  const status = error.status || error.statusCode || 500;
  console.error("ERROR:", {
    name: error.name, status, code: error.code, message: error.message,
  });

  // Auth0 errors may include a WWW-Authenticate header.
  if (error.headers) {
    response.set(error.headers);
  }

  let message = error.message;
  if (status === 401) {
    message = "Unauthorized";
  } else if (status === 403) {
    message = "Forbidden";
  } else if (status >= 500) {
    message = "Something went wrong on the server";
  }

  response.status(status).json({
    error: message,
  });
});

// ---------- start the server ----------
// Don't start listening until the database is reachable.
//   authenticate() — a quick "can I connect?" check.
//   sync()         — creates any missing tables from your models.
// Never use sync({ force: true }) here — it DROPS your tables on every boot.
async function startServer() {
  try {
    await db.authenticate();
    console.log("🐘 Database connection established.");

    await db.sync();
    console.log("🧩 Models synced.");

    server.listen(PORT, () => {
      console.log(`🚀 Server is running on PORT: ${PORT}`);
    });

    // Graceful shutdown: hosts send SIGTERM on redeploy. Stop taking new
    // requests, then close the DB connection so nothing is left hanging.
    const shutdown = () => {
      console.log("\n👋 Shutting down...");
      server.close(async () => {
        await db.close();
        process.exit(0);
      });
    };
    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("❌ Unable to start server:", error.message);
    process.exit(1); // stop the process so the problem is obvious
  }
}

startServer();
