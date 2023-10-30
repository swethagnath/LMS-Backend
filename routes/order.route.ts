import express from 'express'
import {createOrder, getAllOrders} from '../controllers/order.controller'
const orderRouter = express.Router()
import {authorizeRoles, isAuthenticated } from '../middelware/auth'

orderRouter.post("/order-course", isAuthenticated , authorizeRoles("admin"), createOrder )

orderRouter.get("/get-orders", isAuthenticated , authorizeRoles("admin"), getAllOrders )

export default orderRouter