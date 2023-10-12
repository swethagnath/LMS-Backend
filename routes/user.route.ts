import express from 'express'
import {registrationUser, activateUser, loginUser, logoutUser, updateAccessToken, getUserInfo} from '../controllers/user.controller'
const userRouter = express.Router()
import {isAuthenticated,  authorizeRoles} from '../middelware/auth'

// regitser a user
userRouter.post('/registration', registrationUser)

// activate a user
userRouter.post('/activate-user', activateUser)

// login a user
userRouter.post('/login', loginUser)

// logout a user
userRouter.get('/logout',isAuthenticated,logoutUser)

// update access token
userRouter.get('/refreshToken', updateAccessToken)

// get user info
userRouter.get('/me', isAuthenticated,  getUserInfo)

export default userRouter