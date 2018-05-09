import { Router, Request, Response, NextFunction } from 'express';
import ChaincodeService from '../services/chaincode.service';

import * as GeneralModels from '../shared/models/general';
import * as ChaincodeApiModels from '../shared/models/api/chaincode';
import * as ChaincodeExceptionModels from '../shared/models/exceptions/chaincode';

import * as jwt from 'jsonwebtoken';


var config = require('../../config.json');

export class UserRouter {
    router: Router

    constructor() {
        this.router = Router();
        this.init();
    }

    public async install(req: Request, res: Response, next: NextFunction){
        var response = new ChaincodeApiModels.InstallChaincodeReponse();
        var request: ChaincodeApiModels.InstallChaincodeRequest = req.body;

        var chaincodeService = new ChaincodeService();
        try{
            if(request.payload.chaincodeName==null){
                throw new ChaincodeExceptionModels.InvalidInstallChaincodelRequest("chaincodeName is missing");
            }else if(request.payload.chaincodePath==null){
                throw new ChaincodeExceptionModels.InvalidInstallChaincodelRequest("chaincodePath is missing");
            }else if(request.payload.chaincodeVersion==null){
                throw new ChaincodeExceptionModels.InvalidInstallChaincodelRequest("chaincodeVersion is missing");
            }else if(request.payload.peers==null){
                throw new ChaincodeExceptionModels.InvalidInstallChaincodelRequest("peers are missing");
            }else if(request.payload.peers.length < 1){
                throw new ChaincodeExceptionModels.InvalidInstallChaincodelRequest("you must select at least 1 peer");
            }
            var jwtPayload:GeneralModels.JwtPayload = jwt.verify(request.token, config.jwtSecret);
            var result = await chaincodeService.install(
                request.payload.peers, 
                request.payload.chaincodeName, 
                request.payload.chaincodePath, 
                request.payload.chaincodeVersion, 
                jwtPayload.unm, 
                jwtPayload.onm
            );
            response.message = result.message;
            if(!result.success){
                res.statusCode = 500;//internal server error
            }
        }catch(err){
            console.log(err);
            if(err instanceof ChaincodeExceptionModels.InvalidInstallChaincodelRequest){
                response.message = err.message;
                res.statusCode = 400;//bad request
            }else{
                response.message = "error";
                res.statusCode = 500;//internal server error
            }
        }

        res.send(response);
    }

    public async instantiate(req: Request, res: Response, next: NextFunction){
        var response = new ChaincodeApiModels.InstantiateChaincodeResponse();
        var request: ChaincodeApiModels.InstantiateChaincodeRequest = req.body;

        var chaincodeService = new ChaincodeService();
        try{
            if(request.payload.chaincodeName==null){
                throw new ChaincodeExceptionModels.InvalidInstantiateChaincodelRequest("chaincodeName is missing");
            }else if(request.payload.chaincodePath==null){
                throw new ChaincodeExceptionModels.InvalidInstantiateChaincodelRequest("chaincodePath is missing");
            }else if(request.payload.chaincodeVersion==null){
                throw new ChaincodeExceptionModels.InvalidInstantiateChaincodelRequest("chaincodeVersion is missing");
            }else if(request.payload.peers==null){
                throw new ChaincodeExceptionModels.InvalidInstantiateChaincodelRequest("peers are missing");
            }else if(request.payload.peers.length < 1){
                throw new ChaincodeExceptionModels.InvalidInstantiateChaincodelRequest("you must select at least 1 peer");
            }else if(request.payload.functionName == null){
                throw new ChaincodeExceptionModels.InvalidInstantiateChaincodelRequest("functionName is missing");
            }else if(request.payload.channelName == null){
                throw new ChaincodeExceptionModels.InvalidInstantiateChaincodelRequest("channelName is missing");
            }else if(request.payload.args == null){
                throw new ChaincodeExceptionModels.InvalidInstantiateChaincodelRequest("args are missing");
            }
            var jwtPayload:GeneralModels.JwtPayload = jwt.verify(request.token, config.jwtSecret);
            var result = await chaincodeService.instantiate(
                request.payload.peers,
                request.payload.channelName,
                request.payload.chaincodeName,
                request.payload.chaincodePath,
                request.payload.chaincodeVersion,
                request.payload.functionName,
                request.payload.args,
                jwtPayload.unm,
                jwtPayload.onm
            );
            response.message = result.message;
            if(!result.success){
                res.statusCode = 500;//internal server error
            }
        }catch(err){
            console.log(err);
            if(err instanceof ChaincodeExceptionModels.InvalidInstantiateChaincodelRequest){
                response.message = err.message;
                res.statusCode = 400;//bad request
            }else{
                response.message = "error";
                res.statusCode = 500;//internal server error
            }
        }

        res.send(response);
    }

    public async invoke(req: Request, res: Response, next: NextFunction){
        var response = new ChaincodeApiModels.InvokeChaincodeResponse();
        var request: ChaincodeApiModels.InvokeChaincodeRequest = req.body;

        var chaincodeService = new ChaincodeService();
        try{
            if(request.payload.chaincodeName==null){
                throw new ChaincodeExceptionModels.InvalidInvokeChaincodelRequest("chaincodeName is missing");
            }else if(request.payload.chaincodeVersion==null){
                throw new ChaincodeExceptionModels.InvalidInvokeChaincodelRequest("chaincodeVersion is missing");
            }else if(request.payload.peers==null){
                throw new ChaincodeExceptionModels.InvalidInvokeChaincodelRequest("peers are missing");
            }else if(request.payload.peers.length < 1){
                throw new ChaincodeExceptionModels.InvalidInvokeChaincodelRequest("you must select at least 1 peer");
            }else if(request.payload.channelName == null){
                throw new ChaincodeExceptionModels.InvalidInvokeChaincodelRequest("channelName is missing");
            }else if(request.payload.args == null){
                throw new ChaincodeExceptionModels.InvalidInstantiateChaincodelRequest("args are missing");
            }

            var jwtPayload:GeneralModels.JwtPayload = jwt.verify(request.token, config.jwtSecret);
            var result = await chaincodeService.invoke(
                request.payload.peers,
                request.payload.channelName,
                request.payload.chaincodeName,
                request.payload.chaincodeVersion,
                request.payload.args,
                jwtPayload.unm,
                jwtPayload.onm
            )
            response.message = result.message;
            response.payload.tx_id = result.tx_id;
            if(!result.success){
                res.statusCode = 500;//internal server error
            }
        }catch(err){
            console.log(err);
            if(err instanceof ChaincodeExceptionModels.InvalidInvokeChaincodelRequest){
                response.message = err.message;
                res.statusCode = 400;//bad request
            }else{
                response.message = "error";
                res.statusCode = 500;//internal server error
            }
        }

        res.send(response);
    }

    public async query(req: Request, res: Response, next: NextFunction){
        var response = new ChaincodeApiModels.QueryChaincodeResponse();
        var request: ChaincodeApiModels.QueryChaincodeRequest = req.body;

        var chaincodeService = new ChaincodeService();
        try{
            if(request.payload.chaincodeName==null){
                throw new ChaincodeExceptionModels.InvalidQueryChaincodelRequest("chaincodeName is missing");
            }else if(request.payload.chaincodeVersion==null){
                throw new ChaincodeExceptionModels.InvalidQueryChaincodelRequest("chaincodeVersion is missing");
            }else if(request.payload.peer==null){
                throw new ChaincodeExceptionModels.InvalidQueryChaincodelRequest("peer is missing");
            }else if(request.payload.channelName == null){
                throw new ChaincodeExceptionModels.InvalidQueryChaincodelRequest("channelName is missing");
            }else if(request.payload.args == null){
                throw new ChaincodeExceptionModels.InvalidQueryChaincodelRequest("args are missing");
            }

            var jwtPayload:GeneralModels.JwtPayload = jwt.verify(request.token, config.jwtSecret);
            var result = await chaincodeService.query(
                request.payload.peer,
                request.payload.channelName,
                request.payload.chaincodeName,
                request.payload.chaincodeVersion,
                request.payload.args,
                jwtPayload.unm,
                jwtPayload.onm
            )
            response.message = result.message;
            if(!result.success){
                res.statusCode = 500;//internal server error
            }
        }catch(err){
            console.log(err);
            if(err instanceof ChaincodeExceptionModels.InvalidQueryChaincodelRequest){
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
        this.router.post('/install', this.install);
        this.router.post('/instantiate', this.instantiate);
        this.router.post('/invoke', this.invoke);
        this.router.post('/query', this.query);
    }

}

// Create the HeroRouter, and export its configured Express.Router
const router = new UserRouter();
router.init();

export default router.router;