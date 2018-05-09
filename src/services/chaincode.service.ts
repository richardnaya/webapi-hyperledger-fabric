var path = require('path');
var fs = require('fs');
var util = require('util');
var utils = require('fabric-client/lib/utils.js');
var Peer = require('fabric-client/lib/Peer.js');
var config = require('../../config.json');
var helper = require('./helper.js');
var logger = helper.getLogger('chaincode');
var EventHub = require('fabric-client/lib/EventHub.js');

export class ChaincodeService {
    allEventHubs:any[];
    eventHubs:any[];
    constructor() {
        this.allEventHubs = [];
        this.eventHubs = [];
    }

    install(peers:string[], chaincodeName:string, chaincodePath:string, chaincodeVersion:string, username:string, orgName:string){
        var tx_id = null;
        var nonce = null;
        var member = null;

        helper.setupChaincodeDeploy();
        var chain = helper.getChainForOrg(orgName);
        helper.setupOrderer();

        var targets = helper.getTargets(peers, orgName);
        helper.setupPeers(chain, peers, targets);

        return new Promise<any>(function(resolve, reject) {
            helper.getRegisteredUsers(username, orgName).then((user) => {
                member = user;
                nonce = utils.getNonce();
                tx_id = chain.buildTransactionID(nonce, member);
                // send proposal to endorser
                var request = {
                    targets: targets,
                    chaincodePath: chaincodePath,
                    chaincodeId: chaincodeName,
                    chaincodeVersion: chaincodeVersion,
                    txId: tx_id,
                    nonce: nonce
                };
                return chain.sendInstallProposal(request);
            }, (err) => {
                logger.error('Failed to enroll user \'' + username + '\'. ' + err);
                return reject('Failed to enroll user \'' + username + '\'. ' + err);
            }).then((results) => {
                var proposalResponses = results[0];
                var proposal = results[1];
                var header = results[2];
                var all_good = true;
                for (var i in proposalResponses) {
                    let one_good = false;
                    if (proposalResponses && proposalResponses[0].response &&
                        proposalResponses[0].response.status === 200) {
                        one_good = true;
                        logger.info('install proposal was good');
                    } else {
                        logger.error('install proposal was bad');
                    }
                    all_good = all_good && one_good;
                }
                if (all_good) {
                    logger.info(util.format(
                        'Successfully sent install Proposal and received ProposalResponse: Status - %s',
                        proposalResponses[0].response.status));

                    var message = 'Successfully Installed chaincode on organization ' + orgName;
                    logger.debug('\n' + message +  '\n');
                    var result = {
                        success:true,
                        message:message
                    };
                    return resolve(result);
                } else {
                    var errorMessage = 'Failed to send install Proposal or receive valid response. Response null or status is not 200. exiting...';
                    logger.error(errorMessage);
                    return reject(errorMessage);
                }
            }, (err) => {
                var errorMessage = 'Failed to send install proposal due to error: ' + err.stack ? err.stack : err;
                logger.error(errorMessage);
                return reject(errorMessage);
            });
        });
    }

    instantiate(peers:string[], channelName:string, chaincodeName:string ,chaincodePath:string , chaincodeVersion:string, functionName:string, args:any, username:string, orgName:string){
        helper.setupChaincodeDeploy();
        var chain = helper.getChainForOrg(orgName);
        helper.setupOrderer();

        var targets = helper.getTargets(peers, orgName);
        helper.setupPeers(chain, peers, targets);

        //FIXME: chanfe this to read peer dynamically
        let eh = new EventHub();
        let data = fs.readFileSync(path.join(__dirname, helper.ORGS[orgName]['peer1'][
            'tls_cacerts'
        ]));

        eh.setPeerAddr(helper.ORGS[orgName]['peer1']['events'], {
            pem: Buffer.from(data).toString(),
            'ssl-target-name-override': helper.ORGS[orgName]['peer1']['server-hostname']
        });

        eh.connect();

        this.eventHubs.push(eh);
        this.allEventHubs.push(eh);

        var self = this;
        var member = null;
        var tx_id = null;
        var nonce = null;

        return new Promise<any>(function(resolve, reject) {
            helper.getRegisteredUsers(username, orgName).then((user) => {
                member = user;
                // read the config block from the orderer for the chain
                // and initialize the verify MSPs based on the participating
                // organizations
                return chain.initialize();
            }, (err) => {
                var message = 'Failed to enroll user \'' + username + '\'. ' + err;
                logger.error(message);
                return reject(message);
            }).then((success) => {
                nonce = utils.getNonce();
                tx_id = chain.buildTransactionID(nonce, member);
                // send proposal to endorser
                var request = {
                    targets: targets,
                    chaincodePath: chaincodePath,
                    chaincodeId: chaincodeName,
                    chaincodeVersion: chaincodeVersion,
                    fcn: functionName,
                    args: helper.getArgs(args),
                    chainId: channelName,
                    txId: tx_id,
                    nonce: nonce
                };
                return chain.sendInstantiateProposal(request);
            }, (err) => {
                var message = 'Failed to initialize the chain';
                logger.error(message);
                return reject(message);
            }).then((results) => {
                var proposalResponses = results[0];
                var proposal = results[1];
                var header = results[2];
                var all_good = true;
                for (var i in proposalResponses) {
                    let one_good = false;
                    if (proposalResponses && proposalResponses[0].response &&
                        proposalResponses[0].response.status === 200) {
                        one_good = true;
                        logger.info('instantiate proposal was good');
                    } else {
                        logger.error('instantiate proposal was bad');
                    }
                    all_good = all_good && one_good;
                }
                if (all_good) {
                    logger.info(util.format(
                        'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
                        proposalResponses[0].response.status, proposalResponses[0].response.message,
                        proposalResponses[0].response.payload, proposalResponses[0].endorsement
                        .signature));
                    var request = {
                        proposalResponses: proposalResponses,
                        proposal: proposal,
                        header: header
                    };
                    // set the transaction listener and set a timeout of 30sec
                    // if the transaction did not get committed within the timeout period,
                    // fail the test
                    var deployId = tx_id.toString();
                    var eventPromises = [];
                    self.eventHubs.forEach((eh) => {
                        let txPromise = new Promise((resolve, reject) => {
                            let handle = setTimeout(reject, 30000);
                            eh.registerTxEvent(deployId.toString(), (tx, code) => {
                                logger.info(
                                    'The chaincode instantiate transaction has been committed on peer ' +
                                    eh.ep._endpoint.addr);
                                clearTimeout(handle);
                                eh.unregisterTxEvent(deployId);
                                if (code !== 'VALID') {
                                    logger.error(
                                        'The chaincode instantiate transaction was invalid, code = ' +
                                        code);
                                    reject();
                                } else {
                                    logger.info('The chaincode instantiate transaction was valid.');
                                    resolve();
                                }
                            });
                        });
                        eventPromises.push(txPromise);
                    });
                    var sendPromise = chain.sendTransaction(request);
                    return Promise.all([sendPromise].concat(eventPromises)).then((results) => {
                        logger.debug('Event promise all complete and testing complete');
                        return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
                    }).catch((err) => {
                        var message = 'Failed to send instantiate transaction and get notifications within the timeout period.';
                        logger.error(message);
                        return reject(message);
                    });
                } else {
                    var message = 'Failed to send instantiate Proposal or receive valid response. Response null or status is not 200. exiting...';
                    logger.error(message);
                    return reject(message);
                }
            }, (err) => {
                var message = 'Failed to send instantiate proposal due to error: ' + err.stack ? err.stack : err;
                logger.error(message);
                return reject(message);
            }).then((response) => {
                if (response.status === 'SUCCESS') {
                    var result = {
                        success:true,
                        message: 'Chaincode instantiation is SUCCESS'
                    };
                    logger.info('Successfully sent transaction to the orderer.');
                    return resolve(result);
                } else {
                    var message = 'Failed to order the transaction. Error code: ' + response.status;
                    logger.error(message);
                    return reject(message);
                }
            }, (err) => {
                var message = 'Failed to send instantiate due to error: ' + err.stack ? err.stack : err;
                logger.error(message);
                return reject(message);
            });
        });
    }

    invoke(peers:string[], channelName:string, chaincodeName:string, chaincodeVersion:string, args:string[], username:string, orgName:string){
        var chain = helper.getChainForOrg(orgName);
        helper.setupOrderer();
        var targets = helper.getTargets(peers, orgName);
        helper.setupPeers(chain, peers, targets);
        var peerHosts = this.getHostnameByPeerAddress(orgName, peers);
        var self = this;
        peers.forEach(function(peer) {
            let peerEh = self.eventHubs[orgName + peer];
            if (!peerEh) {
                self.registerEventHub(orgName, peers);
            }
        });

        var tx_id = null;
        var nonce = null;
        var member = null;

        return new Promise<any>(function(resolve, reject) {
            helper.getRegisteredUsers(username, orgName).then((user) => {
                member = user;
                nonce = utils.getNonce();
                tx_id = chain.buildTransactionID(nonce, member);
                utils.setConfigSetting('E2E_TX_ID', tx_id);
                logger.info('setConfigSetting("E2E_TX_ID") = %s', tx_id);
                logger.debug(util.format('Sending transaction "%s"', tx_id));
                // send proposal to endorser
                var request = {
                    targets: targets,
                    chaincodeId: chaincodeName,
                    chaincodeVersion: chaincodeVersion,
                    fcn: config.invokeQueryFcnName,
                    args: helper.getArgs(args),
                    chainId: channelName,
                    txId: tx_id,
                    nonce: nonce
                };
                return chain.sendTransactionProposal(request);
            }, (err) => {
                logger.error('Failed to enroll user \'' + username + '\'. ' + err);
                throw new Error('Failed to enroll user \'' + username + '\'. ' + err);
            }).then((results) => {
                var proposalResponses = results[0];
                var proposal = results[1];
                var header = results[2];
                var all_good = true;
                for (var i in proposalResponses) {
                    let one_good = false;
                    if (proposalResponses && proposalResponses[0].response &&
                        proposalResponses[0].response.status === 200) {
                        one_good = true;
                        logger.info('transaction proposal was good');
                    } else {
                        logger.error('transaction proposal was bad');
                    }
                    all_good = all_good && one_good;
                }
                if (all_good) {
                    logger.debug(util.format(
                        'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s", metadata - "%s", endorsement signature: %s',
                        proposalResponses[0].response.status, proposalResponses[0].response.message,
                        proposalResponses[0].response.payload, proposalResponses[0].endorsement.signature));
                    var request = {
                        proposalResponses: proposalResponses,
                        proposal: proposal,
                        header: header
                    };
                    // set the transaction listener and set a timeout of 30sec
                    // if the transaction did not get committed within the timeout period,
                    // fail the test
                    var transactionID = tx_id.toString();
                    var eventPromises = [];
                    for (let key in self.eventHubs) {
                        let eh = self.eventHubs[key];
                        let txPromise = new Promise((resolve, reject) => {
                            let handle = setTimeout(reject, 30000);
                            eh.registerTxEvent(transactionID.toString(), (tx, code) => {
                                clearTimeout(handle);
                                eh.unregisterTxEvent(transactionID);
                                if (code !== 'VALID') {
                                    var message = 'The balance transfer transaction was invalid, code = ' + code;
                                    logger.error(message);
                                    reject(message);
                                } else {
                                    var message = 'The balance transfer transaction has been committed on peer ' + eh.ep._endpoint.addr;
                                    logger.info(message);
                                    resolve(message);
                                }
                            });
                        });
                        eventPromises.push(txPromise);
                    };
                    var sendPromise = chain.sendTransaction(request);
                    return Promise.all([sendPromise].concat(eventPromises)).then((results) => {
                        logger.debug(' event promise all complete and testing complete');
                        return results[0]; // the first returned value is from the 'sendPromise' which is from the 'sendTransaction()' call
                    }).catch((err) => {
                        var message = 'Failed to send transaction and get notifications within the timeout period.';
                        logger.error(message);
                        return reject(message);
                    });
                } else {
                    var message = 'Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...';
                    logger.error(message);
                    return reject(message);
                }
            }, (err) => {
                var message = 'Failed to send proposal due to error: ' + err.stack ? err.stack : err;
                logger.error(message);
                return reject(message);
            }).then((response) => {
                if (response.status === 'SUCCESS') {
                    logger.info('Successfully sent transaction to the orderer.');
                    logger.debug(
                        '******************************************************************');
                    logger.debug('E2E_TX_ID=' + '\'' + tx_id + '\'');
                    logger.debug(
                        '******************************************************************');
                    var result = {
                        success:true,
                        tx_id: tx_id,
                        message: 'Successfully sent transaction to the orderer.'
                    };
                    return resolve(result);
                } else {
                    var message = 'Failed to order the transaction. Error code: ' + response.status;
                    logger.error(message);
                    return reject(message);
                }
            }, (err) => {
                var message = 'Failed to send transaction due to error: ' + err.stack ? err.stack : err;
                logger.error(message);
                return reject(message);
            });
        });
    }

    query(peer:string, channelName:string, chaincodeName:string, chaincodeVersion:string, args:string[], username:string, orgName:string){
        var peers = [];
        peers.push(helper.getPeerAddressByName(orgName, peer));
        var chain = helper.getChainForOrg(orgName);
        var targets = helper.getTargets(peers, orgName);
        helper.setupPeers(chain, peers, targets);

        var tx_id = null;
        var nonce = null;
        var member = null;

        return new Promise<any>(function(resolve, reject) {
            helper.getRegisteredUsers(username, orgName).then((user) => {
                member = user;
                nonce = utils.getNonce();
                tx_id = chain.buildTransactionID(nonce, member);
                // send query
                var request = {
                    targets: targets,
                    chaincodeId: chaincodeName,
                    chaincodeVersion: chaincodeVersion,
                    chainId: channelName,
                    txId: tx_id,
                    nonce: nonce,
                    fcn: config.functionName,
                    args: helper.getArgs(args)
                };
                return chain.queryByChaincode(request);
            }, (err) => {
                var message = 'Failed to get submitter \''+username+'\'';
                logger.info(message);
                return reject(message);
            }).then((response_payloads) => {
                if (response_payloads) {
                    //is this correct?
                    for (let i = 0; i < response_payloads.length; i++) {
                        var message = 'User b now has ' + response_payloads[i].toString('utf8') + ' after the move';
                        var result = {
                            success:true,
                            message: message
                        }
                        
                        logger.info(message);
                        return resolve(result);
                    }
                } else {
                    var message = 'response_payloads is null';
                    logger.error(message);
                    return reject(message);
                }
            }, (err) => {
                var message = 'Failed to send query due to error: ' + err.stack ? err.stack : err;
                logger.error(message);
                return reject(message);
            }).catch((err) => {
                var message = 'Failed to end to end test with error:' + err.stack ? err.stack :err;
                logger.error(message);
                return reject(message);
            });
        });
    }

    getHostnameByPeerAddress(org, peers) {
        var orgDetails = helper.ORGS[org];
        var result = [];
        for (let index in peers) {
            for (let key in orgDetails) {
                if (orgDetails.hasOwnProperty(key) && key.indexOf('peer') == 0 && orgDetails[
                        key].requests.indexOf(peers[index]) >= 0) {
                    result.push(key);
                }
            }
        }
        return result;
    };

    registerEventHub(orgName:string, peers:string[]) {
        var peerHosts = this.getHostnameByPeerAddress(orgName, peers);
        for (var index in peerHosts) {
            let eh = new EventHub();
            let data = fs.readFileSync(path.join(__dirname, helper.ORGS[orgName][peerHosts[index]][
                'tls_cacerts'
            ]));
            eh.setPeerAddr(helper.ORGS[orgName][peerHosts[index]]['events'], {
                pem: Buffer.from(data).toString(),
                'ssl-target-name-override': helper.ORGS[orgName][peerHosts[index]]['server-hostname']
            });
            eh.connect();
            this.eventHubs[orgName + peerHosts[index]] = eh;
        }
    };

    closeEventHubConnections(){
        for (var key of this.allEventHubs) {
			var eventhub = this.allEventHubs[key];
			if (eventhub && eventhub.isconnected()) {
				//logger.debug('Disconnecting the event hub');
				eventhub.disconnect();
			}
		}
    }
}

export default ChaincodeService;