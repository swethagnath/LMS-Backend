import express from 'express'
export const app = express()
import { Request, Response, NextFunction } from 'express';
import cors from 'cors'
import cookieParser from 'cookie-parser'
require('dotenv').config()
import {ErrorMiddleware} from './middelware/error'

// body parser

app.use(express.json({ limit: "50mb" }))

app.use(cookieParser())

app.use(cors({
    origin: process.env.ORIGIN
}))

//testing api
app.get("/test", (req: Request, res: Response, next: NextFunction) => {
    res.status(200).json({
        success: true,
        message: "API is working..."
    })
})

app.all("*", (req: Request, res: Response, next: NextFunction) => {
    const error = new Error(`Route ${req.originalUrl} not found` ) as any
    error.statusCode = 404;
    next(error)
})

app.use(ErrorMiddleware)