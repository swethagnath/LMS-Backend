import express from 'express'
import {createOrder} from '../controllers/order.controller'
const orderRouter = express.Router()
import {authorizeRoles, isAuthenticated } from '../middelware/auth'

orderRouter.post("/order-course", isAuthenticated , authorizeRoles("admin"), createOrder )

export default orderRouter