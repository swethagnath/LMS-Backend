import {Request, Response, NextFunction} from "express"
import {catchAsyncError} from "../middelware/catchAsyncError"
import ErrorHandler from "../utils/ErrorHandler"
import cloudinary from 'cloudinary'
import {createCourse, getAllCourseService} from '../services/course.service'
import CourseModel from "../models/course.model"
import { redis } from "../utils/redis"
import mongoose from "mongoose"
import ejs from "ejs"
import path from "path"
import sendMail from "../utils/sendMail"
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

// add question in course
interface IAddQuestionData{
    question: string,
    courseId: string,
    contentId: string
}

export const addQuestion = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const {question, courseId, contentId}:IAddQuestionData = req.body
        const course = await CourseModel.findById(courseId)

        if(!mongoose.Types.ObjectId.isValid(contentId)){
            return next(new ErrorHandler("Invalid Content Id", 500))
        }

        const courseContent = course?.courseData?.find((item: any) => item._id.equals(contentId))
        if(!courseContent){
            return next(new ErrorHandler("course content not found", 500))
        }

        const newQuestion:any = {
            user: req.user,
            question,
            questionReplies:[]
        }

        courseContent.questions.push(newQuestion)

        await course?.save()

        if(!courseContent){
            return next(new ErrorHandler("Invalid content id", 400))
        }

        await NotificationModel.create({
            user: req.user?._id,
            title: "New Question Recieved",
            message: `You have a new question in ${course?.title}`
        })

        res.status(200).json({
            success: true,
            course
        })
    }catch(error: any){
        return next(new ErrorHandler(error.message, 500))
    }
})


// add answer in course question
interface IAddAnswerData {
    answer: string;
    courseId: string;
    contentId: string;
    questionId: string;
}

export const addAnswer = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const {answer, courseId, contentId, questionId} = req.body
        
        const course = await CourseModel.findById(courseId)

        if(!mongoose.Types.ObjectId.isValid(contentId)){
            return next(new ErrorHandler("Invalid Content Id", 500))
        }

        const courseContent = course?.courseData?.find((item: any) => item._id.equals(contentId))
        if(!courseContent){
            return next(new ErrorHandler("course content not found", 500))
        }

        const question = courseContent?.questions?.find((item: any) => item._id.equals(questionId))

        if(!question){
            return next(new ErrorHandler("Invalid question Id", 500))
        }

        // create answer object

        const newAnswer: any = {
            user: req.user,
            answer
        }

        // add this answer to our course content
        await question.questionReplies.push(newAnswer)

        await course?.save()

        if(req.user?._id  === question.user._id){           
            await NotificationModel.create({
                user: req.user?._id,
                title: "New Question Reply Recieved",
                message: `You have a new question in ${courseContent.title}`
            })
        }else{
            const data = {
                name: question.user.name,
                title: courseContent.title
            }
            const html = await ejs.renderFile(path.join(__dirname, "../mails/question-reply.ejs"), data)
            try{
                await sendMail({
                    email: question.user.mail,
                    subject: "Question Reply",
                    template: "question-reply.ejs", 
                    data
                })
            }catch(error:any){
                return next(new ErrorHandler(error.message, 500))
            }
        }
        res.status(200).json({
            success: true,
            course
        })
    }catch(error: any){
        return next(new ErrorHandler(error.message, 500))
    }
    
})

// add review in course
interface IAddReviewData {
    review: string;
    rating: number;
    userId: string;
}

export const addReview = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const userCourseList = req.user?.courses

        console.log(req.user)

        const courseId = req.params.id
        
        console.log(userCourseList)

        const courseExist = userCourseList?.find((course:any) => 
            course.toString() === courseId.toString()
        )

        console.log(courseExist)
        if(!courseExist){
            return next(new ErrorHandler("you are not eligible to access this course", 400))
        }

        const course = await CourseModel.findById(courseId)

        const {review, rating} = req.body as IIAddReviewData 

        const reviewData:any = {
            user: req.user,
            comment: review,
            rating
        }

        course?.reviews.push(reviewData)

        let avg = 0

        course?.reviews.forEach((rev:any) => {
            avg += rev.rating
        })

        if(course){
            course.rating = avg / course.reviews.length
        }

        await  course?.save()

        const notification = {
            title: "New Review Recieved",
            message: `${req.user?.name} has given a review in ${course.name}`
        }

        // create notification

        res.status(200).json({
            success: true,
            course
        })
    }catch(error:any){
        return next(new ErrorHandler(error.message, 500))
    }
})

// add reply to review

interface IAddReviewData{
    comment: string;
    courseId: string;
    reviewId: string;
}

export const addReplyToReview =  catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const {comment, courseId, reviewId} = req.body as IAddReviewData

        const course = await CourseModel.findById(courseId)

        if(!course){
            return  next(new ErrorHandler("Course not found", 500))
        }

        const review = course?.reviews?.find((rev:any) => rev._id.toString() === reviewId)
        if(!review){
            return  next(new ErrorHandler("Review not found", 500))
        }

        const replyData:any = {
            user: req.user,
            comment
        }

        if(!review.commentReplies){
            review.commentReplies = []
        }

        review?.commentReplies?.push(replyData)
        course.reviewv= review
        await course?.save()

        res.status(200).json({
            success: true,
            course
        })
    }catch(error: any){
        next(new ErrorHandler(error.message, 500))
    }
})

// get All courses
export const getAllCourses = catchAsyncError(async(req: Request,res: Response, next: NextFunction) => {
    try{
        getAllCourseService(res)
    }catch(error:any){
        return next(new ErrorHandler(error.message, 400))
    }
})

// delete course
export const deleteCourse = catchAsyncError(async(req: Request,res: Response, next: NextFunction) => {
    try{
        const {id} = req.params
        const course = await CourseModel.findById(id)
        if(!course){
            return next(new ErrorHandler("User not found", 500))
        }

        await course.deleteOne({id})

        await redis.del(id)

        res.status(200).json({
            success: true,
            message: "course deleted successfully"
        })

    }catch(error:any){  
        return next(new ErrorHandler(error.message, 400))
    }
})