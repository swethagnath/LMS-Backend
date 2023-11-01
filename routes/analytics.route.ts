import express from 'express'
import {authorizeRoles, isAuthenticated } from '../middelware/auth'
import {getUsersAnalytics, getOrderAnalytics, getCoursesAnalytics} from '../controllers/analytics.controller'
const analyticsRouter = express.Router()

analyticsRouter.get("/get-users-analytics", isAuthenticated , authorizeRoles("admin"), getUsersAnalytics )

analyticsRouter.get("/get-orders-analytics", isAuthenticated , authorizeRoles("admin"), getOrderAnalytics )

analyticsRouter.get("/get-courses-analytics", isAuthenticated , authorizeRoles("admin"), getCoursesAnalytics )

export default analyticsRouter