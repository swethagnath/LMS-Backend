import {Request, Response, NextFunction} from "express"
import {catchAsyncError} from "../middelware/catchAsyncError"
import ErrorHandler from "../utils/ErrorHandler"
import LayoutModel from "../models/layout.model"

// create layout

export const createLayout = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const {type} = req.body
        const isTypeExist = await LayoutModel.findOne({type})
        if(isTypeExist){
            return next(new ErrorHandler(`${type} already exist`, 500))   
        }
        if(type === "Banner"){
            const {image, title, subTitle} = req.body
            
            const myCloud = await cloudinary.v2.uploader.upload(image, {
                folder: "layout"
            })
            
            const banner = {
                image: {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                },
                title,
                subTitle
            }
            await LayoutModel.create(banner)
        }
        if(type === "FAQ"){
            const {faq} = req.body
            const faqItems  = await Promise.all(faq.map(async(item: any) => {
                return {
                    question: item.question,
                    answer: item.answer
                }
            }))
            await LayoutModel.create({type:"FAQ", faq: faqItems})
        }
        if(type === "Categories"){
            const {categories} = req.body
            const categoriesItems  = await Promise.all(categories.map(async(item: any) => {
                return {
                  title: item.title 
                }
            }))
            await LayoutModel.create({type:"Categories",categories: categoriesItems})
        }
        res.status(201).json({
            success: true,
            message: "Layout created successfully"
        })
    }catch(error: any){
        return next(new ErrorHandler(error.message, 500))
    }
})

export const editLayout = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const {type} = req.body
         
        if(type === "Banner"){
            const {image, title, subTitle} = req.body
            
            const myCloud = await cloudinary.v2.uploader.upload(image, {
                folder: "layout"
            })
            
            const banner = {
                type:  "Banner",
                image: {
                    public_id: myCloud.public_id,
                    url: myCloud.secure_url
                },
                title,
                subTitle
            }
            await LayoutModel.findByIdAndUpdate(banner.id, {banner})
        }
        if(type === "FAQ"){
            const {faq} = req.body
            const faqItem = await  LayoutModel.findOne({type: 'FAQ'})
            const faqItems  = await Promise.all(faq.map(async(item: any) => {
                return {
                    question: item.question,
                    answer: item.answer
                }
            }))
            await LayoutModel.findByIdAndUpdate(faqItem?._id, { type:"FAQ", faq: faqItems})
        }
        if(type === "Categories"){
            const {categories} = req.body
            const categoryData = await  LayoutModel.findOne({type: 'Categories'})
            const categoriesItems  = await Promise.all(categories.map(async(item: any) => {
                return {
                  title: item.title 
                }
            }))
            await LayoutModel.findByIdAndUpdate(categoryData?._id,{type:"Categories",categories: categoriesItems})
        }
        res.status(201).json({
            success: true,
            message: "Layout updated successfully"
        })
    }catch(error: any){
        return next(new ErrorHandler(error.message, 500))
    }
})

export const getLayoutByType = catchAsyncError(async (req: Request,res: Response ,next: NextFunction) => {
    try{
        const {type} = req.body
        console.log(type)
        const layout  = await LayoutModel.findOne({type})
        res.status(201).json({
            success: true,
            layout
        })
    }catch(error: any){
        return next(new ErrorHandler(error.message, 500))
    }
})