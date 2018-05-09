import {IError} from './general';

export class InvalidInstallChaincodelRequest implements IError{
    constructor(message: string){
        this.message = message;
    }
    message: string;
}

export class InvalidInstantiateChaincodelRequest implements IError{
    constructor(message: string){
        this.message = message;
    }
    message: string;
}

export class InvalidInvokeChaincodelRequest implements IError{
    constructor(message: string){
        this.message = message;
    }
    message: string;
}

export class InvalidQueryChaincodelRequest implements IError{
    constructor(message: string){
        this.message = message;
    }
    message: string;
}


