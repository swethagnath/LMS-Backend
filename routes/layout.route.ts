import express from 'express'
import {authorizeRoles, isAuthenticated } from '../middelware/auth'
import {createLayout, editLayout, getLayoutByType} from '../controllers/layout.controller'
const layoutRouter = express.Router()

layoutRouter.get("/create-layout", isAuthenticated , authorizeRoles("admin"), createLayout )

layoutRouter.put("/edit-layout", isAuthenticated , authorizeRoles("admin"), editLayout )

layoutRouter.get("/get-layout", isAuthenticated , authorizeRoles("admin"), getLayoutByType )

export default layoutRouter