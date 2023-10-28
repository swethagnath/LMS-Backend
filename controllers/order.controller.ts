import {Request, Response, NextFunction} from "express"
import {catchAsyncError} from "../middelware/catchAsyncError"
import ErrorHandler from "../utils/ErrorHandler"
import CourseModel from "../models/course.model"
import { redis } from "../utils/redis"
import mongoose from "mongoose"
import ejs from "ejs"
import path from "path"
import sendMail from "../utils/sendMail"
import NotificationModel from '../models/notification.model'
import OrderModel from '../models/order.model'
import userModel from '../models/user.model'
const Redis = redis()
import {newOrder} from '../services/order.service'

// create order


export const createOrder =  catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const {courseId, payment_info} = req.body as IOrder
        const user = await userModel.findById(req.user?._id)

        const courseExistInUser = user?.courses.some((course:any) => course._id.toString() === courseId)

        // if(courseExistInUser){
        //     return next(new ErrorHandler("You have already purchased this course", 400))
        // }

        const course = await CourseModel.findById(courseId)
        if(!course){
            return next(new ErrorHandler("course not found", 400))
        }

        const data:any = {
            courseId: course._id,
            userId: user?._id
        }
        console.log(course._id)
        const mailData = {
            order:  {
                _id: course._id,
                name: course.name,
                price: course.price,
                data: new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
            }
        }

        // const html = await ejs.renderFile(path.join(__dirname, '../mails/order-confirmation.ejs', {order: mailData}))

        // try{
        //     if(user){
        //         await sendMail({
        //             email: user.email,
        //             subject: "Order Confirmation",
        //             template: "order-confirmation.ejs",
        //             data: mailData
        //         })
        //     }
        // }catch(error: any){
        //     return  next(new ErrorHandler(error.message, 400))
        // }

        user?.courses.push(course?._id)

        await user?.save()

        const notification = await NotificationModel.create({
            user: user?._id,
            title: "New Order",
            message: `You have a new order from ${course?.name}`
        })

        if(course){
            course.purchased += 1
        }
        
        await course.save()
        
        await course.findByIdAndUpdate()

        newOrder(data, res, next)
    }catch(error: any){
        console.log(error)
        return  next(new ErrorHandler("Invalid email or password", 400))
    }
})
