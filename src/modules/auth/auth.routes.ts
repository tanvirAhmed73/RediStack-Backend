import { Router } from "express";
import { getUserDetails, signUp, verifyEmailByOtp } from "./auth.controller";

const authRoutes = Router()

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication routes
 */

/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: Create user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignUpRequest'
 *     responses:
 *       201:
 *         description: Registration successful.Please check your email to verify your account.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SignUpResponse'
 */

authRoutes.post('/signup', signUp)

/**
 * @swagger
 * /api/v1/auth/verify-email-by-otp:
 *   post:
 *     summary: Verify email by OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyEmailByOtpRequest'
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerifyEmailByOtpResponse'
 */
authRoutes.post('/verify-email-by-otp', verifyEmailByOtp)

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get user details
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserDetailsResponse'
 */
authRoutes.get('/me', getUserDetails)

export default authRoutes