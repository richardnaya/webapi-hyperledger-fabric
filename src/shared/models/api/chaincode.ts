import {ApiRequest, ApiResponse} from "./general";

//Install Chaincode
export class InstallChaincodeRequestPayload{
    peers:string[];//["localhost:7051","localhost:7056"]
    chaincodeName:string;
    chaincodePath:string;
    chaincodeVersion:string
}
export class InstallChaincodeResponsePayload{
    
}

export class InstallChaincodeRequest extends ApiRequest{
    constructor(){
        super();
        this.payload = new InstallChaincodeRequestPayload();
    }
    payload: InstallChaincodeRequestPayload;
}

export class InstallChaincodeReponse extends ApiResponse{
    constructor(){
        super();
        this.payload = new InstallChaincodeResponsePayload();
    }
    payload: InstallChaincodeResponsePayload;
}

//Instantiate Chaincode
export class InstantiateChaincodeRequestPayload{
    peers:string[];//["localhost:7051"]
    chaincodeName:string;
    chaincodePath:string;
    chaincodeVersion:string;
    functionName:string;
    channelName:string;
    args:string[];
}
export class InstantiateChaincodeResponsePayload{
    
}

export class InstantiateChaincodeRequest extends ApiRequest{
    constructor(){
        super();
        this.payload = new InstantiateChaincodeRequestPayload();
    }
    payload: InstantiateChaincodeRequestPayload;
}

export class InstantiateChaincodeResponse extends ApiResponse{
    constructor(){
        super();
        this.payload = new InstantiateChaincodeResponsePayload();
    }
    payload: InstantiateChaincodeResponsePayload;
}

//Invoke Chaincode
export class InvokeChaincodeRequestPayload{
    peers:string[];//["localhost:7051", "localhost:7056"]
    chaincodeName:string;
    chaincodeVersion:string;
    channelName:string;
    args:string[];
}
export class InvokeChaincodeResponsePayload{
    tx_id:string;
}

export class InvokeChaincodeRequest extends ApiRequest{
    constructor(){
        super();
        this.payload = new InvokeChaincodeRequestPayload();
    }
    payload: InvokeChaincodeRequestPayload;
}

export class InvokeChaincodeResponse extends ApiResponse{
    constructor(){
        super();
        this.payload = new InvokeChaincodeResponsePayload();
    }
    payload: InvokeChaincodeResponsePayload;
}

//Query Chaincode
export class QueryChaincodeRequestPayload{
    peer:string;//peer1
    chaincodeName:string;
    chaincodeVersion:string;
    channelName:string;
    args:string[];
}
export class QueryChaincodeResponsePayload{

}

export class QueryChaincodeRequest extends ApiRequest{
    constructor(){
        super();
        this.payload = new QueryChaincodeRequestPayload();
    }
    payload: QueryChaincodeRequestPayload;
}

export class QueryChaincodeResponse extends ApiResponse{
    constructor(){
        super();
        this.payload = new QueryChaincodeResponsePayload();
    }
    payload: QueryChaincodeResponsePayload;
}

