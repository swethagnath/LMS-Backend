import express from 'express'
import {uploadCourse, editCourse, getSingleCourse, getAllCourse, getCourseByUser, addQuestion, addAnswer, addReview, addReplyToReview   } from '../controllers/course.controller'
import {authorizeRoles, isAuthenticated } from '../middelware/auth'
const courseRouter = express.Router()

courseRouter.post("/create-course", isAuthenticated , authorizeRoles("admin"), uploadCourse )

courseRouter.put("/edit-course/:id", isAuthenticated , authorizeRoles("admin"), editCourse )

courseRouter.get("/get-course/:id", isAuthenticated , authorizeRoles("admin"), getSingleCourse )

courseRouter.get("/get-all-course", isAuthenticated , authorizeRoles("admin"), getAllCourse )

courseRouter.get("/get-course-content/:id", isAuthenticated , getCourseByUser )

courseRouter.put("/add-question", isAuthenticated , addQuestion )

courseRouter.put("/add-answer", isAuthenticated , addAnswer )

courseRouter.put("/add-review/:id", isAuthenticated , addReview )

courseRouter.put("/add-review/:id", isAuthenticated , addReplyToReview )

courseRouter.put("/add-reply-review", isAuthenticated , authorizeRoles("admin"), addReplyToReview )

export default courseRouter