

export class User{
    _id:any;
    username: string;
    salt: string;
    passwordHash:string
    roleIds:string[];
}

export class JwtPayload{
    unm:string;//username
    onm:string;//orgName
    sct:string;//enrollment secret
}

