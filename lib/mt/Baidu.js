'use strict';

const preq = require( 'preq' );
const crypto = require( 'crypto' );
const MTClient = require( './MTClient' );

// Google language codes can differ from the language codes that we use.
const baiduLanguageNameMap = {
	ja: 'jp',
	yue: 'zh-TW' // T258919
};

class Baidu extends MTClient {
	/**
	 * Translate html or plain text content with Baidu.
	 * Baidu is not capable of HTML translation with all annotation
	 * mapping. For translating HTML, It use CX's annotation mapping on top
	 * of the plaintext translation. Hence it inherits translateHTML method
	 * of MTClient.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceText Source language content
	 * @return {Promise} Target language content
	 */
	translateText( sourceLang, targetLang, sourceText ) {
		const appid = this.conf.mt.Baidu.appid;
		const key = this.conf.mt.Baidu.key;
		if ( appid === null || key === null ) {
			return Promise.reject( new Error( 'Baidu Translate service is misconfigured' ) );
		}

		const length = sourceText.length;
		const limit = 5000;
		if ( length > limit ) {
			// Max limit is 5K characters for Baidu.
			return Promise.reject( new Error(
				`Source content too long: ${length} (${limit} is the character limit)`
			) );
		}

		sourceLang = baiduLanguageNameMap[ sourceLang ] || sourceLang;
		targetLang = baiduLanguageNameMap[ targetLang ] || targetLang;

		const salt = Math.round(Math.random() * 1e10);

		// See http://api.fanyi.baidu.com/doc/21
		const postData = {
			uri: this.conf.mt.Baidu.api,
			proxy: this.conf.proxy,
			body: {
				q: sourceText,
				from: sourceLang,
				to: targetLang,
				appid,
				salt,
				sign: crypto.createHash( 'md5' ).update( appid + sourceText + salt + key ).digest( 'hex' )
			}
		};

		return preq.post( postData ).then( ( response ) => {
			/*this.metrics.makeMetric( {
				type: 'Counter',
				name: 'translate.Baidu.charcount',
				prometheus: {
					name: 'translate_baidu_charcount',
					help: 'Baidu character count'
				}
			} ).increment( length );*/
			console.log('body', response.body);
			return response.body.trans_result.dst;
		} ).catch( ( response ) => {
			throw new Error( `Translation with Baidu failed for ${sourceLang} > ${targetLang}. ` +
				`Error: ${response.body.error.code} : ${response.body.error.message}` );
		} );
	}

	/**
	 * Returns error name from error code.
	 *
	 * @param {number} code Error code
	 * @return {string}
	 */
	 getErrorName( code ) {
		const errormap = {
			101: 'Lack of required parameters',
			102: 'Does not support the language',
			103: 'The translated text is too long',
			104: 'The type of API does not support',
			105: 'Do not support the type of signature',
			106: 'The types of response does not support',
			107: 'Does not support transmission encryption type',
			108: 'AppKey is invalid',
			109: 'Batchlog format is not correct',
			110: 'Without a valid instance of related services',
			111: 'The developer account is invalid, is proably accounts for the lack of state',
			201: 'Decryption failure, probably for DES, BASE64, URLDecode error',
			202: 'Signature verification failed',
			203: 'Access IP address is not accessible IP list',
			301: 'Dictionary query failure',
			302: 'Translate the query fails',
			303: 'Server-side other anomalies',
			401: 'Account has been overdue bills'
		};

		if ( code in errormap ) {
			return errormap[ code ];
		}

		return `Unknown error: ${code}`;
	}

	requiresAuthorization() {
		return true;
	}

}

module.exports = Baidu;
