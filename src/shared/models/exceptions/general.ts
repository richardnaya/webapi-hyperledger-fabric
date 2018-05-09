export interface IError{
    message: string;
}
export class UnauthorizedOperation implements IError{
    constructor(message: string){
        this.message = message;
    }
    message: string;
}