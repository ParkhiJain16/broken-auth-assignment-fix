# Broken Auth Assignment Fix

## Overview
 
  This project fixes the intentionally broken authentication flow. The goal was to debug and complete the full flow:
  Login → OTP Verification → Session Cookie → JWT Token → Protected Route.

## Bugs Identified and Fixed

  1. Logger Middleware Blocking Requests

        The request logger middleware did not call next(), causing all routes to hang indefinitely.
        Fix: Added next() to allow request flow to continue.

  2. Missing cookie-parser Middleware

        The server imported cookie-parser but never used it, so req.cookies was undefined.
        Fix: Registered app.use(cookieParser()) to correctly parse cookies.

  3. Incorrect Token Endpoint Logic

        The /auth/token endpoint incorrectly read the session from the Authorization header instead of the session cookie.
        Fix: Updated endpoint to read req.cookies.session_token and generate JWT from session.

  4. Auth Middleware Missing next()

        The JWT verification middleware did not call next() after successful verification, blocking access to protected routes.
        Fix: Added next() after setting req.user.

## Final Authentication Flow

  1. POST /auth/login → generates loginSessionId and OTP

  2. POST /auth/verify-otp → validates OTP and sets session_token cookie

  3. POST /auth/token → reads session cookie and returns JWT

  4. GET /protected → validates JWT and returns success flag

### Output
  See output.txt for the complete terminal output of all four steps.
