'use strict';

// mocha defines to avoid JSHint breakage

const ServiceRunner = require( 'service-runner' );
const logStream = require( './logStream' );
const fs = require( 'fs' );
const assert = require( './assert' );
const yaml = require( 'js-yaml' );
const extend = require( 'extend' );

// set up the configuration
let config = {
	conf: yaml.load( fs.readFileSync( `${__dirname}/../../config.dev.yaml` ) )
};
// build the API endpoint URI by supposing the actual service
// is the last one in the 'services' list in the config file
const myServiceIdx = config.conf.services.length - 1;
const myService = config.conf.services[ myServiceIdx ];
config.uri = `http://localhost:${myService.conf.port}/`;
config.service = myService;
// no forking, run just one process when testing
// eslint-disable-next-line camelcase
config.conf.num_workers = 0;
// have a separate, in-memory logger only
config.conf.logging = {
	name: 'test-log',
	level: 'trace',
	stream: logStream()
};
// make a deep copy of it for later reference
const origConfig = extend( true, {}, config );

module.exports.stop = () => {
	return Promise.resolve();
};
let options = null;
const runner = new ServiceRunner();

function start( _options ) {

	_options = _options || {};

	if ( !assert.isDeepEqual( options, _options ) ) {
		console.log( 'starting test server' );
		return module.exports.stop().then( () => {
			options = _options;
			// set up the config
			config = extend( true, {}, origConfig );
			extend( true, config.conf.services[ myServiceIdx ].conf, options );
			return runner.start( config.conf )
				.then( ( serviceReturns ) => {
					module.exports.stop = () => {
						console.log( 'stopping test server' );
						serviceReturns.forEach( ( servers ) =>
							servers.forEach( ( server ) =>
								server.shutdown() ) );
						return runner.stop().then( () => {
							module.exports.stop = () => {
								return Promise.resolve();
							};
						} );
					};
					return true;
				} );
		} );
	} else {
		return Promise.resolve();
	}
}

module.exports.config = config;
module.exports.start = start;
