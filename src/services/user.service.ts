
import * as UserApiModels from '../shared/models/api/user';
import * as GeneralModels from '../shared/models/general';
//import * as UserExceptionModels from '../shared/models/exceptions/user';

var helper = require('./helper.js');

export class UserService {
    constructor() {
    }

    enroll(username:string, orgName:string):Promise<any>{
        return new Promise<any>(function(resolve, reject) {
            helper.getRegisteredUsers(username, orgName, true).then(function(response) {
                if (response && typeof response !== 'string') {
                    return resolve(response);
                } else {
                    return reject(response);
                }
            });
        });
    }
    

}

export default UserService;