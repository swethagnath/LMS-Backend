import express from 'express'
import {authorizeRoles, isAuthenticated } from '../middelware/auth'
import {getNotification, updateNotification} from '../controllers/notification.controller'
const notificationRoute = express.Router()

notificationRoute.get("/get-all-notifications", isAuthenticated, authorizeRoles("admin"), getNotification)
notificationRoute.put("/update-notification/:id", isAuthenticated, authorizeRoles("admin"), updateNotification)

export default notificationRoute