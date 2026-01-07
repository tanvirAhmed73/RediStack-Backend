import { Response } from "express"

export const sendSuccess = (res: Response, data: any, message = "Success", statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    status: statusCode,
    message,
    data
  })
}

export const sendError = (res: Response, message = "Something went wrong", statusCode = 400) => {
  return res.status(statusCode).json({
    success: false,
    status: statusCode,
    message
  })
}
