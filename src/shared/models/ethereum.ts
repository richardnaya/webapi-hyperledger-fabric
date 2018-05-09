export class Transaction{
    from:string;
    to:string;
    value:any;//Number|String|BigNumber
    gas:any;//Number|String|BigNumber
    gasPrice:any;//Number|String|BigNumber
    data:string;
    nonce:number;
}

export class ContractDeploymentResult{
    transactionHash:string;
    address:string;
}