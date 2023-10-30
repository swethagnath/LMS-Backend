import {Request, Response, NextFunction} from "express"
import {catchAsyncError} from "../middelware/catchAsyncError"
import OrderModel from "../models/order.model"

// create new Order

export const newOrder = catchAsyncError(async(data:any, res: Response, next) => {
    const order = await OrderModel.create(data)
    res.status(201).json({
        success: true,
        order
    })
})

// Get All orders
export const getAllOrdersService = async (res: Response) => {
    const orders = await OrderModel.find().sort({createdAt: -1})
    res.status(201).json({
        success: true,
        orders
    })
}