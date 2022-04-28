'use strict';

const assert = require( '../utils/assert.js' );
const server = require( '../utils/server.js' );
const Baidu = require( '../../lib/mt' ).Baidu;

describe( 'Baidu machine translation', function () {
	it( 'Should fail because of wrong key ', () => {
		const cxConfig = server.config.service;
		cxConfig.conf.mt.Baidu.appid = 'appid';
		cxConfig.conf.mt.Baidu.key = 'key';
		const baidu = new Baidu( cxConfig );
		const testSourceContent = '<p>This is a <a href="/Test">test</a></p>';
		assert.fails(
			baidu.translate( 'en', 'zh', testSourceContent ),
			function ( err ) {
				if ( ( err instanceof Error ) && /value/.test( err ) ) {
					return true;
				}
			}
		);
	} );
} );
