import mongoose, {Document, Model, Schema} from "mongoose"
import bcrypt from "bcrypt"
require('dotenv').config()
const emailRegexPattern: RegExp = /^([a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/
import jwt from 'jsonwebtoken'

export interface IUser extends Document{
    name: string;
    email: string;
    password: string;
    avatar: {
        public_id: string;
        url: string;
    },
    role:string;
    isVerified: boolean;
    courses: Array<{courseId: string}>;
    comparePassword: (password: string) => Promise<boolean>;
    SignAccessToken: () => string;
    SignRefreshToken: () => string;
}

const userSchema: Schema<IUser> = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter your name"],
    },
    email: {
        type: String,
        required: [true, "Please enter your email"],
        validate: {
            validator: function(value: string){
                return emailRegexPattern.test(value)
            },
            message: "please enter a valid email"
        },
        unique: true
    },
    password: {
        type: String,
        minlength: [6, "Password must be atleast 6 character"],
        select: false
    },
    avatar: {
        public_id: String,
        url: String,
    }, 
    role: {
        type: String,
        default: "user",
        select: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    courses: []
}, {
    timeStamps: true
})

// Hash Password  before saving

userSchema.pre<IUser>('save', async function(next){
    if(!this.isModified('password')){
        next()
    }
    this.password = await bcrypt.hash(this.password, 10)
})

// compare password
userSchema.methods.comparePassword = async function(enteredPassword: string): Promise<boolean>{
    console.log(this.password)
    console.log(await bcrypt.compare(enteredPassword, this.password))
    return await bcrypt.compare(enteredPassword, this.password)
}

// sign access token
userSchema.methods.SignAccessToken = function(){
    return jwt.sign({id: this.id}, process.env.ACCESS_TOKEN || "", {
        expiresIn: "5m"
    })
}

// sign refresh token
userSchema.methods.SignRefreshToken = function(){
    return jwt.sign({id: this.id}, process.env.REFRESH_TOKEN || "", {
        expiresIn: "3d"
    })
}

const userModel: Model<IUser> = mongoose.model("User", userSchema)

export default userModel;