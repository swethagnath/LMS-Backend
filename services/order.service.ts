import {Request, Response, NextFunction} from "express"
import {catchAsyncError} from "../middelware/catchAsyncError"
import OrderModel from "../models/course.model"

// create new Order

export const newOrder = catchAsyncError(async(data:any, res: Response, next) => {
    const order = await OrderModel.create(data)
    res.status(201).json({
        success: true,
        order
    })
})