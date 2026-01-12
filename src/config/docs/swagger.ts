import {Express} from "express";
import swaggerJsdoc from "swagger-jsdoc"
import swaggerUi from "swagger-ui-express"
import appConfig from "../app.config";

export function swaggerSetup (app:Express){
    const config = appConfig()
    const options = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: config.app.name || "Redistack-Backend",
                version: '1.0.0',
                description: config.app.description || ""
            },
            components: {
                securitySchemes: {
                  bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                  },
                },
            },
            security: [{ bearerAuth: [] }],
            servers: [
                {
                    url: config.app.swagger_base_url || 'http://localhost:3000'
                }
            ]
        },
        apis: ['./src/**/*.routes.ts', './src/config/docs/components/*.ts'], 
    };
  
  const openapiSpecification = swaggerJsdoc(options);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapiSpecification));

}