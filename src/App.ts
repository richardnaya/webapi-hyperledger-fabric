import * as path from 'path';
import * as express from 'express';
import * as logger from 'morgan';
import * as bodyParser from 'body-parser';
import * as express_jwt from 'express-jwt';
import * as fs from 'fs';
import * as cors from 'cors';

var config = require('../config.json');

import UserRouter from './routes/user.router';
import ChannelRouter from './routes/channel.router';
import ChaincodeRouter from './routes/chaincode.router';

import * as ApiGeneralModels from './shared/models/api/general';

// Creates and configures an ExpressJS web server.
class App {
    // ref to Express instance
    public express: express.Application;

    //Run configuration methods on the Express instance.
    constructor() {
        this.express = express();
        this.middleware();
        this.routes();
    }

    // Configure Express middleware.
    private middleware(): void {
        this.express.use(cors());
        this.express.use(logger('dev'));
        this.express.use(bodyParser.json());
        this.express.use(bodyParser.urlencoded({ extended: true }));

        //jwt
        this.express.use(
            express_jwt({ 
                secret: config.jwtSecret,
                getToken: function (req) {
                    return req.body.token
                }})
                .unless({path: ['/api/v1/user/enroll']})
            );
        this.express.use(function (err, req, res, next) {
            if (err.name === 'UnauthorizedError') {
                var apiResponse = new ApiGeneralModels.ApiResponse();
                apiResponse.message = "error: invalid JWT";
                res.status(401).send(apiResponse);
            }
        });
    }

    // Configure API endpoints.
    private routes(): void {
        /* This is just to get up and running, and to make sure what we've got is
         * working so far. This function will change when we start to add more
         * API endpoints */
        let router = express.Router();
        // placeholder route handler
        router.get('/', (req, res, next) => {
            res.json({
                message: 'Hello World!'
            });
        });

        this.express.use('/', router);
        this.express.use('/api/v1/user', UserRouter);
        this.express.use('/api/v1/channel', ChannelRouter);
        this.express.use('/api/v1/chaincode', ChaincodeRouter);
    }

}

export default new App().express;