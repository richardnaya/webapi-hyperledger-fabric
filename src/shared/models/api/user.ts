import {ApiRequest, ApiResponse} from "./general";
import {User} from "../general";

export class EnrollUserRequestPayload{
    username:string;
    orgName:string;
}
export class EnrollUserResponsePayload{
    token:string;
}

export class EnrollUserRequest extends ApiRequest{
    constructor(){
        super();
        this.payload = new EnrollUserRequestPayload();
    }
    payload: EnrollUserRequestPayload;
}

export class EnrollUserReponse extends ApiResponse{
    constructor(){
        super();
        this.payload = new EnrollUserResponsePayload();
    }
    payload: EnrollUserResponsePayload;
}

