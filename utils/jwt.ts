import {IUser} from "../models/user.model"
import {redis} from "./redis"
const Redis = redis()

interface ITokenOptions{
    expires: Date,
    maxAge: number,
    httpOnly: boolean,
    sameSite: 'lax' | 'strict' | 'none' | undefined
    secure?: boolean
}


// parse enviornment variables to integrate with fail value
const  accessTokenExpire = parseInt(process.env.ACCESS_TOKEN_EXPIRE || '300', 10)
const  refreshTokenExpire = parseInt(process.env.REFRESH_TOKEN_EXPIRE || '1200', 10)

// options for cookies
export const accessTokenOptions:ITokenOptions = {
    expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
    maxAge: accessTokenExpire * 60 * 60 * 1000, 
    httpOnly: true,
    sameSite: 'lax'
}

export const refreshTokenOptions:ITokenOptions = {
    expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
    maxAge: refreshTokenExpire * 24 *  60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax' 
}

export const sendToken = async (user:IUser, statusCode: number, res: Response) => {
   
    const accessToken = user.SignAccessToken()
    const refreshToken = user.SignRefreshToken()
    // upload session to redis
    try{
        Redis.set(user._id, JSON.stringify(user) as any)
    }
    catch(error){
        console.log(error)
    }

    if(process.env.NODE_ENV === 'production'){
        accessTokenOptions.secure = true
    }
   
    res.cookie("accessToken", accessToken, accessTokenOptions)
    res.cookie("refreshToken", refreshToken, refreshTokenOptions)

    res.status(statusCode).json({
        success: true,
        user,
        accessToken
    })
}