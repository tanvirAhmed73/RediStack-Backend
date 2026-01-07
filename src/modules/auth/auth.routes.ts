import { Router } from "express";
import { signUp } from "./auth.controller";

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

export default authRoutes