/**
 * @swagger
 * components:
 *   schemas:
 *     SignUpRequest:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           format: email
 *           example: "john@example.com"
 *         password:
 *           type: string
 *           format: password
 *           example: "SecurePassword123!"
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "123"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         email:
 *           type: string
 *           example: "john@example.com"
 *     SignUpResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         status:
 *           type: number
 *           example: 201
 *         message:
 *           type: string
 *           example: "Registration successful.Please check your email to verify your account."
 *         data:
 *           type: null
 *           example: null
 *     VerifyEmailByOtpRequest:
 *        type: object
 *        properties:
 *         email:
 *           type: string
 *           example: "user@gmail.com"
 *         otp:
 *           type: string
 *           example: "232323"
 *     VerifyEmailByOtpResponse:
 *        type: object
 *        properties:
 *         success:
 *           type: boolean
 *           example: true
 *         status:
 *           type: number
 *           example: 200
 *         message:
 *           type: string
 *           example: "Email verified successfully.You can now login to your account."
 *         data:
 *           type: null
 *           example: null
 *     UserDetailsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         status:
 *           type: number
 *           example: 200
 *         message:
 *           type: string
 *           example: "User details fetched successfully"
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               example: "123"
 *             name:
 *               type: string
 *               example: "John Doe"
 *             email:
 *               type: string
 *               example: "john@example.com"
 *             avatar:
 *               type: string
 *               example: "https://example.com/avatar.jpg"
 *             role:
 *               type: string
 *               example: "user"
 *             isVerified:
 *               type: boolean
 *               example: true
 *             createdAt:
 *               type: string
 *               example: "2021-01-01T00:00:00.000Z"
 *             updatedAt:
 *               type: string
 *               example: "2021-01-01T00:00:00.000Z"
 *             deletedAt:
 *               type: string
 *     ResendOtpRequest:
 *        type: object
 *        properties:
 *         email:
 *           type: string
 *           example: "user@gmail.com"
 *     VerificationEmailSentResponse:
 *        type: object
 *        properties:
 *         success:
 *           type: boolean
 *           example: true
 *         status:
 *           type: number
 *           example: 200
 *         message:
 *           type: string
 *           example: "Verification email sent successfully"
 *         data:
 *           type: null
 *           example: null
 *     LoginRequest:
 *        type: object
 *        properties:
 *         email:
 *           type: string
 *           example: "user@gmail.com"
 *         password:
 *           type: string
 *           example: "SecurePassword123!"
 *     LoginResponse:
 *        type: object
 *        properties:
 *         success:
 *           type: boolean
 *           example: true
 *         status:
 *           type: number
 *           example: 200
 *         message:
 *           type: string
 *           example: "Login successful"
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               example: "123"
 *             name:
 *               type: string
 *               example: "John Doe"
 *             email:
 *               type: string
 *               example: "john@example.com"
 *             avatar:
 *               type: string
 *               example: "https://example.com/avatar.jpg"
 *             role:
 *               type: string
 *               example: "user"
 *             isVerified:
 *               type: boolean
 *               example: true
 *             createdAt:
 *               type: string
 *               example: "2021-01-01T00:00:00.000Z"
 *             updatedAt:
 *               type: string
 *               example: "2021-01-01T00:00:00.000Z"
 *             deletedAt:
 *               type: string
 *               example: "2021-01-01T00:00:00.000Z"
 *     RefreshTokenRequest:
 *        type: object
 *        properties:
 *         refreshToken:
 *           type: string
 *           example: "1234567890"
 *         sessionId:
 *           type: string
 *           example: "1234567890"
 *     RefreshTokenResponse:
 *        type: object
 *        properties:
 *         success:
 *           type: boolean
 *           example: true
 *         status:
 *           type: number
 *           example: 200
 *         message:
 *           type: string
 *           example: "Refresh token successful"
 *         data:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *               example: "1234567890"
 *     LogoutRequest:
 *        type: object
 *        properties:
 *         sessionId:
 *           type: string
 *           example: "1234567890"
 *     LogoutResponse:
 *        type: object
 *        properties:
 *         success:
 *           type: boolean
 *           example: true
 *         status:
 *           type: number
 *           example: 200
 *         message:
 *           type: string
 *           example: "Logout successful"
 *         data:
 *           type: null
 *           example: null
 */
