import {Redis} from 'ioredis'
require('dotenv').config()

export const redis = () => {
    if(process.env.REDIS_URL){
        return new Redis(process.env.REDIS_URL)
    }
    throw new Error('Redis connection failed')
}