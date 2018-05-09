import { Router, Request, Response, NextFunction } from 'express';
import ChannelService from '../services/channel.service';

import * as GeneralModels from '../shared/models/general';
import * as ChannelApiModels from '../shared/models/api/channel';
import * as ChannelExceptionModels from '../shared/models/exceptions/channel';

import * as jwt from 'jsonwebtoken';


var config = require('../../config.json');

export class UserRouter {
    router: Router

    constructor() {
        this.router = Router();
        this.init();
    }

    public async create(req: Request, res: Response, next: NextFunction){
        var response = new ChannelApiModels.CreateChannelResponse();
        var request: ChannelApiModels.CreateChannelRequest = req.body;

        var channelService = new ChannelService();
        try{
            if(request.payload.channelName==null){
                throw new ChannelExceptionModels.InvalidCreateChannelRequest("channelName is missing");
            }else if(request.payload.configPath==null){
                throw new ChannelExceptionModels.InvalidCreateChannelRequest("configPath is missing");
            }
            var jwtPayload:GeneralModels.JwtPayload = jwt.verify(request.token, config.jwtSecret);
            var result = await channelService.create(request.payload.channelName,request.payload.configPath, jwtPayload.unm, jwtPayload.onm);
            response.message = result.message;
            if(!result.success){
                res.statusCode = 500;//internal server error
            }
        }catch(err){
            console.log(err);
            if(err instanceof ChannelExceptionModels.InvalidCreateChannelRequest){
                response.message = err.message;
                res.statusCode = 400;//bad request
            }else{
                response.message = "error";
                res.statusCode = 500;//internal server error
            }
        }

        res.send(response);
    }

    public async join(req: Request, res: Response, next: NextFunction){
        var response = new ChannelApiModels.JoinChannelReponse();
        var request: ChannelApiModels.JoinChannelRequest = req.body;

        var channelService = new ChannelService();
        try{
            if(request.payload.channelName==null){
                throw new ChannelExceptionModels.InvalidJoinChannelRequest("channelName is missing");
            }else if(request.payload.peers==null){
                throw new ChannelExceptionModels.InvalidJoinChannelRequest("peers are missing");
            }else if(request.payload.peers.length < 1){
                throw new ChannelExceptionModels.InvalidJoinChannelRequest("you must select at least 1 peer");
            }
            var jwtPayload:GeneralModels.JwtPayload = jwt.verify(request.token, config.jwtSecret);
            var result = await channelService.join(
                request.payload.channelName, 
                request.payload.peers, 
                jwtPayload.unm, //username
                jwtPayload.onm //orgname
            );
            response.message = result.message;
            if(!result.success){
                res.statusCode = 500;//internal server error
            }
        }catch(err){
            console.log(err);
            if(err instanceof ChannelExceptionModels.InvalidJoinChannelRequest){
                response.message = err.message;
                res.statusCode = 400;//bad request
            }else{
                response.message = "error";
                res.statusCode = 500;//internal server error
            }
        }

        res.send(response);
    }

    public async listPeerChannels(req: Request, res: Response, next: NextFunction){
        var response = new ChannelApiModels.ListPeerChannelsReponse();
        var request: ChannelApiModels.ListPeerChannelsRequest = req.body;

        var channelService = new ChannelService();
        try{
            if(request.payload.peer==null){
                throw new ChannelExceptionModels.InvalidListPeerChannelsRequest("peer is missing");
            }
            var jwtPayload:GeneralModels.JwtPayload = jwt.verify(request.token, config.jwtSecret);
            var result = await channelService.listPeerChannels(
                request.payload.peer, 
                jwtPayload.unm, //username
                jwtPayload.onm //orgname
            );
            response.message = result.message;
            response.payload.channels = result.channels;
            if(!result.success){
                res.statusCode = 500;//internal server error
            }
        }catch(err){
            console.log(err);
            if(err instanceof ChannelExceptionModels.InvalidListPeerChannelsRequest){
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
        this.router.post('/create', this.create);
        this.router.post('/join', this.join);
        this.router.post('/listPeerChannels', this.listPeerChannels);
    }

}

// Create the HeroRouter, and export its configured Express.Router
const router = new UserRouter();
router.init();

export default router.router;