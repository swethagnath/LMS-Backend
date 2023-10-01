import { Request, Response, NextFunction } from 'express';

export const catchAsync = (theFunc:any) => (req: Request,res: Response ,next: NextFunction) => {
    Promise.resolve(theFunc(req,res,next)).catch(next)
}