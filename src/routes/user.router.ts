import { Router, Request, Response, NextFunction } from 'express';
import UserService from '../services/user.service';

import * as GeneralModels from '../shared/models/general';
import * as UserApiModels from '../shared/models/api/user';
import * as UserExceptionModels from '../shared/models/exceptions/user';

import * as jwt from 'jsonwebtoken';


var config = require('../../config.json');

export class UserRouter {
    router: Router

    constructor() {
        this.router = Router();
        this.init();
    }

    public async enroll(req: Request, res: Response, next: NextFunction){
        var response = new UserApiModels.EnrollUserReponse();
        var request: UserApiModels.EnrollUserRequest = req.body;
        response.payload = new UserApiModels.EnrollUserResponsePayload();

        var userService = new UserService();
        try{
            if(request.payload.orgName==null){
                throw new UserExceptionModels.InvalidEnrollRequest("orgName is missing");
            }else if(request.payload.username==null){
                throw new UserExceptionModels.InvalidEnrollRequest("username is missing");
            }

            var enrollment = await userService.enroll(request.payload.username, request.payload.orgName);
            var jwtPayload = new GeneralModels.JwtPayload();
            jwtPayload.unm = request.payload.username;
            jwtPayload.onm = request.payload.orgName;
            jwtPayload.sct = enrollment.secret;

            response.payload.token = jwt.sign(jwtPayload, config.jwtSecret);
            response.message = "ok";

        }catch(err){
            console.log(err);
            if(err instanceof UserExceptionModels.InvalidEnrollRequest){
                response.message = err.message;
                res.statusCode = 400;//bad request
            }else{
                response.message = "error";
                res.statusCode = 500;//internal server error
            }
        }

        res.send(response);
    }

    init() {
        this.router.post('/enroll', this.enroll);
    }

}

// Create the HeroRouter, and export its configured Express.Router
const router = new UserRouter();
router.init();

export default router.router;