import { Request, Response, NextFunction } from 'express'
import userModel, {IUser} from "../models/user.model"
import ErrorHandler from "../utils/ErrorHandler"
import {catchAsyncError} from "../middelware/catchAsyncError"
import jwt, { JwtPayload } from "jsonwebtoken"
import ejs from "ejs"
import path from "path"
import {redis} from "../utils/redis"
import sendMail from "../utils/sendMail"
import {sendToken, accessTokenOptions, refreshTokenOptions} from "../utils/jwt"
import {getUserById} from "../services/user.service"

require('dotenv').config()
const Redis = redis()


// register user
interface IRegistrationBody{
    name: string;
    email: string;
    password: string;
    avatar: string;
}

export const registrationUser = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
   
    try{
        const {name, email, password,  avatar} = req.body 

        const isEmailExit = await userModel.findOne({email})

        if(isEmailExit){
            return next(new ErrorHandler("Email already exist",400))
        }

        const user: IRegistrationBody = {
            email,
            password,
            name,
            avatar
        }

        const activationToken = createActivationToken(user)
        const activationCode = activationToken.activationCode

        const data = { user: {name: user.name, activationCode}}
        const html = await ejs.renderFile(path.join(__dirname, "../mails/activation-mail.ejs"), data)

        try{
            // await sendMail({
            //     email: user.email,
            //     subject: "Activate your account",
            //     template: "activation-mail.ejs",
            //     data,
            // })

            res.status(201).json({
                success: true,
                message: `Please check your email: ${user.email} to activate your account`,
                activationToken: activationToken.token,
                activationCode
            })

        }catch(error: any){
            return next(new ErrorHandler(error.message, 400))
        }

    }
    catch(error: any){
        return next(new ErrorHandler(error.message, 400))
    }
})

interface IActivationToken{
    token: string;
    activationCode: string;
}

export const createActivationToken = (user: IUser): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString()

    const token = jwt.sign({user,activationCode}, process.env.ACTIVATION_SECRET, {
        expiresIn: "5m"
    })

    return {token, activationCode  }
}

// activate user
interface IActivationRequest{
    activation_token: string;
    activation_code: string;
}

export const activateUser = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {

    try{
        const {activation_code, activation_token} = req.body as IActivationRequest

        const newUser: {user: IUser; activationCode: string} = jwt.verify(
            activation_token,
            process.env.ACTIVATION_SECRET as string,
        ) as {user: IUser; activationCode: string}

        if(newUser.activationCode !== activation_code){
            return next(new ErrorHandler("Invalid activation code", 400))
        }

        const  {name, email, password} = newUser.user;

        const existUser = await userModel.findOne({email})

        if(existUser){
            return next(new ErrorHandler("Email already exist", 400))
        }

        const user = await userModel.create({
            name,
            email,
            password
        })

        console.log("here09", user)

        res.status(201).json({
            success: true
        })
    }catch(error:any){
        return next(new ErrorHandler(error, 400))
    }

})

interface ILoginRequest {
    email: string;
    password: string;
}

export const loginUser = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const {email, password} = req.body as ILoginRequest
        
        if(!email || !password){
            return next(new ErrorHandler("Please enter email and password", 400))
        }

        const user = await userModel.findOne({email}).select("password")
        console.log(user)

        if(!user){
            return next(new ErrorHandler("Invalid email or password", 400))
        }

        const isPasswordMatch = await user.comparePassword(password)
        console.log("here", isPasswordMatch)
       
        if(!isPasswordMatch){
            return  next(new ErrorHandler("Invalid email or password", 400))
        }

        sendToken(user, 200, res)

    }catch{
        return  next(new ErrorHandler("Invalid email or password", 400))
    }
})

export const logoutUser = catchAsyncError(async (req: Request,res: Response, next: NextFunction) => {
   
    try{

        res.cookie("refreshToken", "", {maxAge: 1})
        res.cookie("accessToken", "", {maxAge: 1})
        
        const userId = req.user._id || ""

        Redis.del(userId)

        res.status(200).json({
            success: true,
            message: "logged out sucessfully"
        })

    }catch(error: any){
        console.log(error);
        return next(new ErrorHandler("Invalid email or password", 400))
    }

})

export const updateAccessToken = catchAsyncError(async(req: Request,res: Response, next: NextFunction) => {
    try{
        const refresh_token = req.cookies.refreshToken as string
        const decoded = jwt.verify(refresh_token, process.env.REFRESH_TOKEN as string) as JwtPayload

        const message = 'Could not refresh token'
        if(!decoded){
            return next(new ErrorHandler(message, 400))
        }

        const session = await Redis.get(decoded.id as string)

        if(!session){
            return next(new ErrorHandler(message, 400))
        }

        const user = session

        const accessToken = jwt.sign({id: this.id}, process.env.ACCESS_TOKEN || "", {
            expiresIn: "5m"
        })  

        const refreshToken = jwt.sign({id: this.id}, process.env.REFRESH_TOKEN || "", {
            expiresIn: "3d"
        })

        res.cookie("access_token", accessToken, accessTokenOptions)
        res.cookie("refresh_token", refreshToken, refreshTokenOptions)

        res.status(200).json({
            status: "success",
            accessToken
        })
    }
    catch(error){
        return next(new ErrorHandler(error.message, 400))
    }
})

// get user info

export const getUserInfo =  catchAsyncError(async(req: Request,res: Response, next: NextFunction) => {
    try{
        const userId = req.user?._id
        getUserById(userId, res)
    }catch(error: any){
        return next(new ErrorHandler(error.message, 400))
    }
})