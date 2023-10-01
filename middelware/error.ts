import { Request, Response, NextFunction } from 'express'
import ErrorHandler from '../utils/ErrorHandler'

export const ErrorMiddleware = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    err.statusCode = err.statuscode || 500
    err.message = err.message || 'Internal Server error'

    // wrong mongodb id error
    if (err.name === "CastError") {
        const message = `Resource not found: ${err.path}`
        err = new ErrorHandler(message, 400);
    }

    // Duplicate key error
    if (err.code === 1100) {
        const message = `Duplicate ${Object.keys(err.keyValue)} entered`
        err = new ErrorHandler(message, 400)
    }

    // wrong jwt error
    if (err.name === "jsonWebTokenError") {
        const message = `Json web token is invalid, try again`
        err = new ErrorHandler(message, 400)
    }

    // jwt expired error
    if (err.name === "TokenExpiredError") {
        const message = "Json web token expired please try again"
        err = new ErrorHandler(message, 400)
    }

    res.status(err.statusCode).json({
        success: false,
        message: err.message
    })
}