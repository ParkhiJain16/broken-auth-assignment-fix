const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const requestLogger = require("./middleware/logger");
const authMiddleware = require("./middleware/auth");
const { generateToken } = require("./utils/tokenGenerator");

const app = express();
const PORT = process.env.PORT || 3000;

// Session storage (in-memory)
const loginSessions = {};
const otpStore = {};

// Middleware
app.use(requestLogger);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    challenge: "Complete the Authentication Flow",
    instruction:
      "Complete the authentication flow and obtain a valid access token.",
  });
});

// CHANGE 1: /auth/login endpoint
app.post("/auth/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // Generate session and OTP
    const loginSessionId = Math.random().toString(36).substring(7);
    const otp = Math.floor(100000 + Math.random() * 900000); 

    // Store session with 2-minute expiry
    loginSessions[loginSessionId] = {
      email,
      password,
      createdAt: Date.now(),
      expiresAt: Date.now() + 2 * 60 * 1000, 
    };

    // Store OTP
    otpStore[loginSessionId] = otp;

    console.log(`[OTP] Session ${loginSessionId} generated. OTP: ${otp}`);

    return res.status(200).json({
      message: "OTP sent",
      loginSessionId,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Login failed",
    });
  }
});

app.post("/auth/verify-otp", (req, res) => {
  try {
    const { loginSessionId, otp } = req.body;

    if (!loginSessionId || !otp) {
      return res
        .status(400)
        .json({ error: "loginSessionId and otp required" });
    }

    const session = loginSessions[loginSessionId];

    if (!session) {
      return res.status(401).json({ error: "Invalid session" });
    }

    if (Date.now() > session.expiresAt) {
      return res.status(401).json({ error: "Session expired" });
    }

    if (parseInt(otp) !== otpStore[loginSessionId]) {
      return res.status(401).json({ error: "Invalid OTP" });
    }

    res.cookie("session_token", loginSessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000, 
    });

    delete otpStore[loginSessionId];

    return res.status(200).json({
      message: "OTP verified",
      sessionId: loginSessionId,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "OTP verification failed",
    });
  }
});

app.post("/auth/token", (req, res) => {
  try {
    console.log("Cookies:", req.cookies);

    const sessionToken = req.cookies.session_token;
    console.log("Session Token:", sessionToken);

    const session = loginSessions[sessionToken];
    console.log("Session Found:", session);

    if (!sessionToken) {
      return res.status(401).json({ error: "No session cookie found" });
    }

    if (!session) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const secret = process.env.JWT_SECRET || "default-secret-key";

    const accessToken = jwt.sign(
      {
        email: session.email,
        sessionId: sessionToken,
      },
      secret,
      { expiresIn: "15m" }
    );

    return res.status(200).json({
      access_token: accessToken,
    });
  } catch (error) {
    console.error("Token Error:", error);  
    return res.status(500).json({
      error: "Token generation failed",
    });
  }
});


// Protected route example
app.get("/protected", authMiddleware, (req, res) => {
  return res.json({
    message: "Access granted",
    user: req.user,
    success_flag: `FLAG-${Buffer.from(req.user.email + "_COMPLETED_ASSIGNMENT").toString('base64')}`,
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
