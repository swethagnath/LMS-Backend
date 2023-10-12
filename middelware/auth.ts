import { Request, Response, NextFunction } from 'express'
import {catchAsyncError} from "../middelware/catchAsyncError"
import ErrorHandler from "../utils/ErrorHandler"
import jwt, {JwtPayload} from 'jsonwebtoken'
import {redis} from "../utils/redis"
const Redis = redis()

// autheniticate user
export const isAuthenticated = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {

    const access_token = req.cookies.accessToken

    if(!access_token){  
        return next(new ErrorHandler("Please login to the resource",400))
    }

    const decoded = jwt.verify(access_token, process.env.ACCESS_TOKEN as string) as JwtPayload

    if(!decoded){
        return next(new ErrorHandler("access token is not valid",400))
    }

    const user = await Redis.get(decoded.id)

    if(!user){
        return next(new ErrorHandler("user not valid",400))
    }

    req.user = JSON.parse(user)
    next()
})

// validate user role
export const authorizeRoles = (...roles: string[]) => {
    return (req: Request,res: Response ,next: NextFunction) => {
        if(!roles.includes(req.user?.role || '')){
            return next(new ErrorHandler("Role is not allowded to access this resource",403))
        }
        next()
    }
}