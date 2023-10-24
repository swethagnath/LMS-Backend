import express from 'express'
import {uploadCourse, editCourse, getSingleCourse, getAllCourse, getCourseByUser } from '../controllers/course.controller'
import {authorizeRoles, isAuthenticated } from '../middelware/auth'
const courseRouter = express.Router()

courseRouter.post("/create-course", isAuthenticated , authorizeRoles("admin"), uploadCourse )
courseRouter.put("/edit-course/:id", isAuthenticated , authorizeRoles("admin"), editCourse )
courseRouter.get("/get-course/:id", isAuthenticated , authorizeRoles("admin"), getSingleCourse )
courseRouter.get("/get-all-course", isAuthenticated , authorizeRoles("admin"), getAllCourse )
courseRouter.get("/get-course-content/:id", isAuthenticated , getCourseByUser )
export default courseRouter