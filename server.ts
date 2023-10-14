import {app} from "./app"
require("dotenv").config()
import connectDB from './utils/db'
import {v2 as cloudinary} from "cloudinary"

// cloudinary config
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret:  process.env.CLOUD_SECRET_KEY
})

// create server
app.listen(process.env.PORT, () => {
    console.log(`server is connected with port ${process.env.PORT}`)
    connectDB()
})