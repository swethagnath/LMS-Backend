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
import {getUserById, getAllUsersService, updateUserRoleService} from "../services/user.service"
import cloudinary from 'cloudinary'

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

// activate user

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

// user login

export const loginUser = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const {email, password} = req.body as ILoginRequest
        
        if(!email || !password){
            return next(new ErrorHandler("Please enter email and password", 400))
        }

        const user = await userModel.findOne({email}).select("password courses")
        console.log("user", user)

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

// user logout

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

// update access token when expires
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

        const user = JSON.parse(session)


        const accessToken = await jwt.sign({id: user._id}, process.env.ACCESS_TOKEN || "", {
            expiresIn: "5m"
        })  

        const refreshToken = await jwt.sign({id: user._id}, process.env.REFRESH_TOKEN || "", {
            expiresIn: "3d"
        })

        req.user = user 
        
        res.cookie("accessToken", accessToken, accessTokenOptions)
        res.cookie("refreshToken", refreshToken, refreshTokenOptions)

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
    }catch(error){
        return next(new ErrorHandler(error.message, 400))
    }
})

interface ISocialAuthBody{
    email: string,
    name: string,
    avatar: string
}

// social auth
export const socialAuth =  catchAsyncError(async(req: Request,res: Response, next: NextFunction) => {
    try{
        const {email, name, avatar} = req.body as ISocialAuthBody
        const user = await userModel.findOne({email, name, avatar})
        if(!user){
            const newUser = await  userModel.create({email, name, avatar})
            sendToken(newUser, 200, res)
        }else{
            sendToken(user, 200, res)
        }
    }catch(error: any){
        return next(new ErrorHandler(error.message, 400))
    }
})


// interface 
interface IUpdateUserInfo{
    email?: string,
    name?: string,
}

// update user info
export const updateuserInfo =  catchAsyncError(async(req: Request,res: Response, next: NextFunction) => {
    try{
        const {email, name} = req.body as IUpdateUserInfo
        const userId = req.user?._id
        const user = await userModel.findById(userId)

        if(email && user){
            const isEmailExit = await userModel.findOne({ email })
            if(!isEmailExit){
                return next(new ErrorHandler(error.message, 400))
            }
            user.email = email
        }

        if(name && user){
            user.name = name
        }

        await user?.save()

        await Redis.set(userId,  JSON.stringify(user))

        res.status(200).json({
            success: true,
            user
        })
    }catch(error: any){
        return next(new ErrorHandler(error.message, 400))
    }
})

// update password

interface IUpdatePassword {
    oldPassword: string,
    newPassword: string
}

export const updatePassword =  catchAsyncError(async(req: Request,res: Response, next: NextFunction) => {
    try{
        const {oldPassword, newPassword} = req.body as IUpdatePassword

        if( !oldPassword || !newPassword){
            return next(new ErrorHandler("Please enter old and new password", 400))
        }

        const user = await userModel.findById(req.user?._id).select("password")

        if( user?.password === undefined){
            return next(new ErrorHandler("Invalid User", 400))
        }

        const isPasswordMatch = await user?.comparePassword(oldPassword)

        if(!isPasswordMatch){
            return next(new ErrorHandler("Invalid old password", 400))
        }

        user.password = newPassword

        await user.save()

        await Redis.set(req.user?._id, JSON.stringify(user))

        res.status(201).json({
            success: true,
            user
        })
    }catch(error: any){
        return next(new ErrorHandler(error.message, 400))
    }
})

// update profile picture 

interface IUpdateProfilePicture {
    avatar: string
}

export const updateProfilePicture =  catchAsyncError(async(req: Request,res: Response, next: NextFunction) => {
    try{
        const {avatar} = req.body as IUpdateProfilePicture
        const userId = req.user?._id
        const user = await userModel.findById(userId)

        if(avatar && user){
            if(user?.avatar?.public_id){
                await cloudinary.v2.uploader.destroy(user?.avatar?.public_id)

                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatar",
                    width: 150
                })
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                }
            }else{
                const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                    folder: "avatar",
                    width: 150
                })
                user.avatar = {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                }
            }

            await user?.save()

            await Redis.set(userId, JSON.stringify(user))

            res.status(200).json(
                {
                    success: true,
                    user
                }
            )
        }

    }catch(error: any){
        return next(new ErrorHandler(error.message, 400))
    }
})

// get all users -- only for admin

export const getAllUsers = catchAsyncError(async(req: Request,res: Response, next: NextFunction) => {
    try{
        getAllUsersService(res)
    }catch(error:any){
        return next(new ErrorHandler(error.message, 400))
    }
})

// update user role -- only for admin
export const updateUserRole = catchAsyncError(async(req: Request,res: Response, next: NextFunction) => {
    try{
        console.log(req.body)
        const {id, role} = req.body
        updateUserRoleService(res, id, role)
    }catch(error:any){
        return next(new ErrorHandler(error.message, 400))
    }
})

// delete user

export const deleteUser = catchAsyncError(async(req: Request,res: Response, next: NextFunction) => {
    try{
        const {id}  = req.params
        const user = await userModel.findById(id)
        if(!user){
            return next(new ErrorHandler("User not found", 400))
        }
        await user.deleteOne({id})

        await redis.del(id)

        res.status(200).json({
            success: true,
            message: "User deleted successfully"
        })
    }catch(error:any){
        return next(new ErrorHandler(error.message, 400))
    }
})
