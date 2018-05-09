/**
 * 
 * The following package should be installed:
 * npm install request
 * 
 */

var request = require('request');
const jwt = require("jsonwebtoken");
var config = require('../../config.json');

import * as UserApiModels from '../shared/models/api/user';
import * as ChannelApiModels from '../shared/models/api/channel';
import * as ChaincodeApiModels from '../shared/models/api/chaincode';
import * as GeneralModels from '../shared/models/general';

var token = null;//token used for authenticating the API requests
var baseUrl = "http://localhost:3000/api/v1/";
var orgName = "org1";//organization to be used in the tests

//start the test
setTimeout(async function(){
    var enrollmentResponse:UserApiModels.EnrollUserReponse = null;
    var jwtPayload:GeneralModels.JwtPayload = null;

    //1) enroll user
    try{
        console.log("user/enroll: starting...");
        enrollmentResponse = await enrollUser();
        jwtPayload = jwt.verify(enrollmentResponse.payload.token, config.jwtSecret);
        console.log("user/enroll: finished");
        console.log("user/enroll: Enrolled user: "+ jwtPayload.unm+", orgName: "+jwtPayload.onm);
    }catch(err){
        console.log("user/enroll: ERROR!");
        console.error(err);
        return;
    }

    //2) create channel
    try{
        console.log("channel/create: starting...");
        var createChannelResponse:ChannelApiModels.CreateChannelResponse 
            = await createChannel(enrollmentResponse.payload.token);
        console.log("channel/create: finished");
        console.log("channel/create: "+ createChannelResponse.message)
    }catch(err){
        console.error("channel/create: ERROR!");
        console.error(err);
        return;
    }

    //3) join channel
    try{
        console.log("channel/join: starting...");
        var joinChannelResponse:ChannelApiModels.JoinChannelReponse 
            = await joinChannel(enrollmentResponse.payload.token);
        console.log("channel/join: finished");
        console.log("channel/join response: "+ joinChannelResponse.message)
    }catch(err){
        console.error("channel/join: ERROR!");
        console.error(err);
        return;
    }

    //wait some time
    var seconds= 2;
    console.log('waiting for ' + seconds + ' seconds...')
    await wait(seconds);

    //4) list channels of peer
    try{
        console.log("channel/list: starting...");
        var listPeerChannelResponse:ChannelApiModels.ListPeerChannelsReponse 
            = await listPeerChannels(enrollmentResponse.payload.token);
        console.log("channel/list: finished");
        console.log("channel/list response: "+ JSON.stringify(listPeerChannelResponse.payload))
    }catch(err){
        console.error("channel/list: ERROR!");
        console.error(err);
        return;
    }

    //5) install chaincode
    try{
        console.log("chaincode/install: starting...");
        var installChaincodeResponse:ChaincodeApiModels.InstallChaincodeReponse 
            = await installChaincode(enrollmentResponse.payload.token);
        console.log("chaincode/install: finished");
        console.log("chaincode/install: "+ installChaincodeResponse.message)
    }catch(err){
        console.error("chaincode/install: ERROR!");
        console.error(err);
        return;
    }

    //6) instantiate chaincode
    try{
        console.log("chaincode/instantiate: starting...");
        var instantiateChaincodeResponse:ChaincodeApiModels.InstantiateChaincodeResponse 
            = await instantiateChaincode(enrollmentResponse.payload.token);
        console.log("chaincode/instantiate: finished");
        console.log("chaincode/instantiate: "+ instantiateChaincodeResponse.message)
    }catch(err){
        console.error("chaincode/instantiate: ERROR!");
        console.error(err);
        return;
    }
    
    //7) invoke chaincode
    try{
        console.log("chaincode/invoke: starting...");
        var invokeChaincodeResponse:ChaincodeApiModels.InvokeChaincodeResponse 
            = await invokeChaincode(enrollmentResponse.payload.token);
        console.log("chaincode/invoke: finished");
        console.log("chaincode/invoke: "+ invokeChaincodeResponse.message)
        console.log("chaincode/invoke: Transaction Id: "+ invokeChaincodeResponse.payload.tx_id);
    }catch(err){
        console.error("chaincode/invoke: ERROR!");
        console.error(err);
        return;
    }

    //8) query chaincode
    try{
        console.log("chaincode/query: starting...");
        var queryChaincodeResponse:ChaincodeApiModels.QueryChaincodeResponse 
            = await queryChaincode(enrollmentResponse.payload.token);
        console.log("chaincode/query: finished");
        console.log("chaincode/query: "+ queryChaincodeResponse.message)
    }catch(err){
        console.error("chaincode/query: ERROR!");
        console.error(err);
        return;
    }

    console.log("\nE2E test ended");
},100);

async function wait(seconds:number){
    return new Promise<UserApiModels.EnrollUserReponse>(function(resolve, reject) {
        setTimeout(function(){
            return resolve();
        },seconds*1000);
    });
}

async function enrollUser():Promise<UserApiModels.EnrollUserReponse>{
    var username = "testuser_"+Math.floor(Math.random() * (9999 - 1)) + 1;//random username
    var url = baseUrl + "user/enroll";

    var enrollRequest = new UserApiModels.EnrollUserRequest();
    enrollRequest.payload.orgName = orgName;
    enrollRequest.payload.username = username;

    return new Promise<UserApiModels.EnrollUserReponse>(function(resolve, reject) {
        request.post({
            headers: {
                'content-type': 'application/json'
            },
            uri: url,
            body: JSON.stringify(enrollRequest)
        }, function(err, resp, data) {
            handleResponse(err, resp, data, reject, resolve);
        });
    });
}

async function createChannel(jwtToken:string):Promise<ChannelApiModels.CreateChannelResponse>{
    var url = baseUrl + "channel/create";


    //Note: if a different channel wants to be created, you should generate the 
    //corresponding 'bootstrap block' and 'channel configuration transaction' using 'configtxgen'
    //http://hyperledger-fabric.readthedocs.io/en/latest/getting_started.html#configuration-transaction-generator

    var createRequest = new ChannelApiModels.CreateChannelRequest();
    createRequest.token = jwtToken;
    createRequest.payload.channelName = "mychannel";
    createRequest.payload.configPath = "../artifacts/channel/mychannel.tx";

    return new Promise<ChannelApiModels.CreateChannelResponse>(function(resolve, reject) {
        request.post({
            headers: {
                'content-type': 'application/json'
            },
            uri: url,
            body: JSON.stringify(createRequest)
        }, function(err, resp, data) {
            handleResponse(err, resp, data, reject, resolve);
        });
    });
}

async function joinChannel(jwtToken:string):Promise<ChannelApiModels.JoinChannelReponse>{
    var url = baseUrl + "channel/join";

    var joinRequest = new ChannelApiModels.JoinChannelRequest();
    joinRequest.token = jwtToken;
    joinRequest.payload.channelName = "mychannel";
    joinRequest.payload.peers = ["localhost:7051","localhost:7056"];

    return new Promise<ChannelApiModels.JoinChannelReponse>(function(resolve, reject) {
        request.post({
            headers: {
                'content-type': 'application/json'
            },
            uri: url,
            body: JSON.stringify(joinRequest)
        }, function(err, resp, data) {
            handleResponse(err, resp, data, reject, resolve);
        });
    });
}

async function listPeerChannels(jwtToken:string):Promise<ChannelApiModels.ListPeerChannelsReponse>{
    var url = baseUrl + "channel/listPeerChannels";

    var joinRequest = new ChannelApiModels.ListPeerChannelsRequest();
    joinRequest.token = jwtToken;
    joinRequest.payload.peer = "peer1";

    return new Promise<ChannelApiModels.ListPeerChannelsReponse>(function(resolve, reject) {
        request.post({
            headers: {
                'content-type': 'application/json'
            },
            uri: url,
            body: JSON.stringify(joinRequest)
        }, function(err, resp, data) {
            handleResponse(err, resp, data, reject, resolve);
        });
    });
}

async function installChaincode(jwtToken:string):Promise<ChaincodeApiModels.InstallChaincodeReponse>{
    var url = baseUrl + "chaincode/install";

    var installRequest = new ChaincodeApiModels.InstallChaincodeRequest();
    installRequest.token = jwtToken;
    installRequest.payload.chaincodeName = "mycc";
    installRequest.payload.chaincodePath = "github.com/example_cc";
    installRequest.payload.chaincodeVersion = "v0";
    installRequest.payload.peers = ["localhost:7051","localhost:7056"];

    return new Promise<ChaincodeApiModels.InstallChaincodeReponse>(function(resolve, reject) {
        request.post({
            headers: {
                'content-type': 'application/json'
            },
            uri: url,
            body: JSON.stringify(installRequest)
        }, function(err, resp, data) {
            handleResponse(err, resp, data, reject, resolve);
        });
    });
}

async function instantiateChaincode(jwtToken:string):Promise<ChaincodeApiModels.InstantiateChaincodeResponse>{
    var url = baseUrl + "chaincode/instantiate";

    var instantiateRequest = new ChaincodeApiModels.InstantiateChaincodeRequest();
    instantiateRequest.token = jwtToken;
    instantiateRequest.payload.chaincodeName = "mycc";
    instantiateRequest.payload.chaincodePath = "github.com/example_cc";
    instantiateRequest.payload.chaincodeVersion = "v0";
    instantiateRequest.payload.functionName = "init";
    instantiateRequest.payload.peers = ["localhost:7051"];
    instantiateRequest.payload.args=["a","100","b","200"];
    instantiateRequest.payload.channelName = "mychannel";

    return new Promise<ChaincodeApiModels.InstallChaincodeReponse>(function(resolve, reject) {
        request.post({
            headers: {
                'content-type': 'application/json'
            },
            uri: url,
            body: JSON.stringify(instantiateRequest)
        }, function(err, resp, data) {
            handleResponse(err, resp, data, reject, resolve);
        });
    });
}

async function invokeChaincode(jwtToken:string):Promise<ChaincodeApiModels.InvokeChaincodeResponse>{
    var url = baseUrl + "chaincode/invoke";

    var invokeRequest = new ChaincodeApiModels.InvokeChaincodeRequest();
    invokeRequest.token = jwtToken;
    invokeRequest.payload.chaincodeName = "mycc";
    invokeRequest.payload.chaincodeVersion = "v0";
    invokeRequest.payload.peers = ["localhost:7051","localhost:7056"];
    invokeRequest.payload.args=["move","a","b","10"];
    invokeRequest.payload.channelName = "mychannel";

    return new Promise<ChaincodeApiModels.InvokeChaincodeResponse>(function(resolve, reject) {
        request.post({
            headers: {
                'content-type': 'application/json'
            },
            uri: url,
            body: JSON.stringify(invokeRequest)
        }, function(err, resp, data) {
            handleResponse(err, resp, data, reject, resolve);
        });
    });
}

async function queryChaincode(jwtToken:string):Promise<ChaincodeApiModels.QueryChaincodeResponse>{
    var url = baseUrl + "chaincode/query";

    var queryRequest = new ChaincodeApiModels.QueryChaincodeRequest();
    queryRequest.token = jwtToken;
    queryRequest.payload.chaincodeName = "mycc";
    queryRequest.payload.peer = "peer1";
    queryRequest.payload.chaincodeVersion = "v0";
    queryRequest.payload.args=["query","a"];
    queryRequest.payload.channelName = "mychannel";

    return new Promise<ChaincodeApiModels.QueryChaincodeResponse>(function(resolve, reject) {
        request.post({
            headers: {
                'content-type': 'application/json'
            },
            uri: url,
            body: JSON.stringify(queryRequest)
        }, function(err, resp, data) {
            handleResponse(err, resp, data, reject, resolve);
        });
    });
}

function handleResponse(err, resp, data, reject, resolve) {
    if(err){
        return reject(err);
    }else{
        var body = JSON.parse(resp.body);
        if(resp.statusCode != 200){
            return reject(body);
        }else{
            return resolve(body);
        }
    }
}