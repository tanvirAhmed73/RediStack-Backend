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
 */
