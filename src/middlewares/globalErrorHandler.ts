import { NextFunction, Request, Response } from "express";


export const globalErrorHandler = (err:any, req:Request, res:Response, next:NextFunction) => {
    //set default error response
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Different handling for dev/prod
    if (process.env.NODE_ENV === 'development') {
        res.status(err.statusCode).json({
            status: err.status,
            error: err,
            message: err.message,
            stack: err.stack,
        });
    } else {
        //production: operational errors vs programming errors
        if (err.isOperational) {
            res.status(err.statusCode).json({
                status: err.status,
                message: err.message,
            });
        } else {
            //programming errors: don't leak details to the client
            res.status(500).json({
                status: 'error',
                message: 'Something went wrong!',
            });
        }
    }
}