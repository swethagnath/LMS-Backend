import {Request, Response, NextFunction} from "express"
import {catchAsyncError} from "../middelware/catchAsyncError"
import ErrorHandler from "../utils/ErrorHandler"
import cloudinary from 'cloudinary'
import {createCourse} from '../services/course.service'
import CourseModel from "../models/course.model"
import { redis } from "../utils/redis"
const Redis = redis()

// upload course
export const uploadCourse = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const data = req.body
        const thumbnail = data.thumbnail
        if(thumbnail){
            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "course"
            })
            
            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }   
        }
        createCourse(data, res, next)
    }catch(error: any){
        return next(new ErrorHandler(error.message, 500))
    }
})

// edit course
export const editCourse = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const data = req.body
        const thumbnail = data.thumbnail

        if(thumbnail){
            await cloudinary.v2.uploader.destroy(thumbnail.public_id)

            const myCloud = await cloudinary.v2.uploader.upload(thumbnail, {
                folder: "courses",
            })

            data.thumbnail = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url
            }
        }

        const courseId = req.params.id
        const course = await CourseModel.findByIdAndUpdate(
            courseId, 
            {
                $set: data
            }, 
            {new: true}
        )
        res.status(201).json({
            success: true,
            course
        })
    }catch(error: any){
        return next(new ErrorHandler(error.message, 500))
    }
})


// get single course without purchasing

export const getSingleCourse  = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{

        const courseId  = req.params.id
        const isCacheExist = await Redis.get(courseId)

        if(isCacheExist){
            console.log("redis")
            const course = JSON.parse(isCacheExist)
            res.status(200).json({
                success: true,
                course
            })
        }else{
            console.log("mongo db")
            const course = await CourseModel.findById(courseId).select("-courseData.videoUrl -courseData.suggestion -courseData.questions  -courseData.links")
            await Redis.set(courseId, JSON.stringify(course))
            res.status(200).json({
                success: true,
                course  
            })
        }
       
    }catch(error: any){
        return next(new ErrorHandler(error.message, 500))
    }
})

// get all courses  without purchasing

export const getAllCourse  = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const isCacheExist = await Redis.get("allCourses")
        if(isCacheExist){
            const courses = JSON.parse(isCacheExist)
            res.status(200).json({
                success: true,
                courses
            })
        }else{
            const courses = await CourseModel.find().select("-courseData.videoUrl -courseData.suggestion -courseData.questions  -courseData.links")
            await Redis.set("allCourses", JSON.stringify(courses))
            res.status(200).json({
                success: true,
                courses
            })
        }
    }catch(error: any){
        return next(new ErrorHandler(error.message, 500))
    }
})

// get course content
export const getCourseByUser = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const userCourseList = req.user?.courses
        const courseId = req.params.id
        const courseExists =  userCourseList?.find((course: any) => course._id.toString() === courseId)
        if(!courseExists){
            return next(new ErrorHandler("You are not eligible to access this course", 500))
        }
        const course = await CourseModel.findById(courseId)
        const content = course?.courseData
        res.status(200).json({
            success: true,
            courses
        })
    }catch(error: any){
        return next(new ErrorHandler(error.message, 500))
    }
})