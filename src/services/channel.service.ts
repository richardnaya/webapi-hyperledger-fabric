var util = require('util');
var utils = require('fabric-client/lib/utils.js');
var fs = require('fs');
var path = require('path');
var config = require('../../config.json');
var helper = require('./helper.js');
var logger = helper.getLogger('Channel');
var EventHub = require('fabric-client/lib/EventHub.js');
var grpc = require('grpc');
var _commonProto = grpc.load(path.join(__dirname,
	'../../node_modules/fabric-client/lib/protos/common/common.proto')).common;

export class ChannelService {
    allEventHubs:any[];

    constructor() {
        this.allEventHubs = [];
    }

    create(channelName:string, channelConfigPath:string, username:string, orgName:string):Promise<any>{
        helper.setupOrderer();
        var chain = helper.getChainForOrg(orgName);
        return new Promise<any>(function(resolve, reject) {
            helper.getRegisteredUsers(username, orgName)
                .then((member) => {
                    logger.debug('Successfully enrolled user \''+username+'\'');
                    // readin the envelope to send to the orderer
                    var request = {
                        envelope: fs.readFileSync(path.join(__dirname, channelConfigPath))
                    };
                    // send to orderer
                    return chain.createChannel(request);
                }, (err) => {
                    logger.error('Failed to enroll user \''+username+'\'. Error: ' + err);
                    return reject(new Error('Failed to enroll user \''+username+'\'' + err));
                }).then((response) => {
                    logger.debug(' response ::%j', response);
                    if (response && response.status === 'SUCCESS') {
                        logger.debug('Successfully created the channel.');
                        let response = {
                            success: true,
                            message: 'Channel \'' + channelName + '\' created Successfully'
                        };
                    return resolve(response);
                    } else {
                        logger.error('\n!!!!!!!!! Failed to create the channel \'' + channelName +
                            '\' !!!!!!!!!\n\n');
                        return reject(new Error('Failed to create the channel \'' + channelName + '\''));
                    }
                }, (err) => {
                    logger.error('Failed to initialize the channel: ' + err.stack ? err.stack :
                        err);
                    return reject(new Error('Failed to initialize the channel: ' + err.stack ? err.stack : err));
                });
        });
    }

    join(channelName:string, peers:any, username:string, orgName:string):Promise<any>{
        helper.setupOrderer();
        var chain = helper.getChainForOrg(orgName);
	    var targets = helper.getTargets(peers, orgName);
	    var eventhubs = [];
        var self = this;
        var user = null;
        var tx_id = null;
        var nonce = null;

        for (let key in helper.ORGS[orgName]) {
            if (helper.ORGS[orgName].hasOwnProperty(key)) {
                if (key.indexOf('peer') === 0) {
                    let data = fs.readFileSync(path.join(__dirname, helper.ORGS[orgName][key]['tls_cacerts']));
                    let eh = new EventHub();
                    eh.setPeerAddr(helper.ORGS[orgName][key].events, {
                        pem: Buffer.from(data).toString(),
                        'ssl-target-name-override': helper.ORGS[orgName][key]['server-hostname']
                    });
                    eh.connect();
                    eventhubs.push(eh);
                    this.allEventHubs.push(eh);
                }
            }
        }

        return new Promise<any>(function(resolve, reject) {
            helper.getRegisteredUsers(username, orgName).then((member) => {
                logger.info('received member object for user : ' + username);
                user = member;
                nonce = utils.getNonce();
                tx_id = chain.buildTransactionID(nonce, user);
                var request = {
                    targets: targets,
                    txId: tx_id,
                    nonce: nonce
                };
                var eventPromises = [];
                eventhubs.forEach((eh) => {
                    let txPromise = new Promise((resolve, reject) => {
                        let handle = setTimeout(reject, parseInt(config.eventWaitTime));
                        eh.registerBlockEvent((block) => {
                            clearTimeout(handle);
                            // in real-world situations, a peer may have more than one channels so
                            // we must check that this block came from the channel we asked the peer to join
                            if (block.data.data.length === 1) {
                                // Config block must only contain one transaction
                                var envelope = _commonProto.Envelope.decode(block.data.data[0]);
                                var payload = _commonProto.Payload.decode(envelope.payload);
                                var channel_header = _commonProto.ChannelHeader.decode(payload.header
                                    .channel_header);
                                if (channel_header.channel_id === config.channelName) {
                                    logger.info('The channel \'' + config.channelName +
                                        '\' has been successfully joined on peer ' + eh.ep._endpoint.addr
                                    );
                                    resolve();
                                }
                            }
                        });
                    });
                    eventPromises.push(txPromise);
                });
                let sendPromise = chain.joinChannel(request);
                return Promise.all([sendPromise].concat(eventPromises));
            }, (err) => {
                logger.error('Failed to enroll user \'' + username + '\' due to error: ' +
                    err.stack ? err.stack : err);
                reject(new Error('Failed to enroll user \'' + username + '\' due to error: ' + err.stack ? err.stack : err));
            }).then((results) => {
                logger.debug(util.format('Join Channel R E S P O N S E : %j', results));
                if (results[0] && results[0][0] && results[0][0].response && results[0][0]
                    .response.status == 200) {
                    logger.info(util.format(
                        'Successfully joined peers in organization %s to the channel \'%s\'',
                        orgName, channelName));
                    self.closeEventHubConnections();
                    let response = {
                        success: true,
                        message: util.format(
                            'Successfully joined peers in organization %s to the channel \'%s\'',
                            orgName, channelName)
                    };
                    return resolve(response);
                } else {
                    logger.error(' Failed to join channel');
                    self.closeEventHubConnections();
                    return reject(new Error('Failed to join channel'));
                }
            }, (err) => {
                logger.error('Failed to join channel due to error: ' + err.stack ? err.stack : err);
                self.closeEventHubConnections();
                return reject(new Error('Failed to join channel due to error: ' + err.stack ? err.stack : err));
            });
        });
    }

    listPeerChannels(peer:string, username:string, orgName:string){
        var peers = [];
        peers.push(helper.getPeerAddressByName(orgName, peer));
        var chain = helper.getChainForOrg(orgName);
        var targets = helper.getTargets(peers, orgName);
        helper.setupPeers(chain, peers, targets);
        return new Promise<any>(function(resolve, reject) {
            helper.getRegisteredUsers(username, orgName).then((member) => {
                return chain.queryChannels(targets[0]);
            }, (err) => {
                var message = 'Failed to get submitter "' + username + '"';
                logger.info(message);
                return reject(message);
            }).then((response) => {
                if (response) {
                    logger.debug('<<< channels >>>');
                    var channelNames = [];
                    for (let i = 0; i < response.channels.length; i++) {
                        channelNames.push('channel id: ' + response.channels[i].channel_id);
                    }
                    logger.debug(channelNames);
                    var result = {
                        success:true,
                        channels: response.channels
                    };
                    return resolve(result);
                } else {
                    var message = 'response_payloads is null';
                    logger.info(message);
                    return reject(message);
                }
            }, (err) => {
                var message = 'Failed to send query due to error: ' + err.stack ? err.stack : err;
                logger.info(message);
                return reject(message);
            }).catch((err) => {
                var message = 'Failed to query with error:' + err.stack ? err.stack : err;
                logger.info(message);
                return reject(message);

            });
        });
    }

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

export default ChannelService;