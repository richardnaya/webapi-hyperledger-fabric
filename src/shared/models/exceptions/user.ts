import {IError} from './general';

export class InvalidEnrollRequest implements IError{
    constructor(message: string){
        this.message = message;
    }
    message: string;
}