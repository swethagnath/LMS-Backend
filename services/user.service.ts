import userModel from "../models/user.model"
import {redis} from "../utils/redis"

const Redis = redis()

// get user by id

export const getUserById = async (id: string, res: Response) => {
    const userJson = await Redis.get(id)
    if(userJson){
        const user = JSON.parse(userJson)
        res.status(201).json({
            success: true,
            user
        })
    }
}

// Get All users
export const getAllUsersService = async (res: Response) => {
    const users = await userModel.find().sort({createdAt: -1})
    res.status(201).json({
        success: true,
        users
    })
}

// update user role
export const updateUserRoleService = async (res: Response, id, role) => {
     
    const user = await userModel.findByIdAndUpdate(id, {role}, {new: true})

    res.status(201).json({
        success: true,
        user
    })
}
