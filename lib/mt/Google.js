'use strict';

const preq = require( 'preq' );
const MTClient = require( './MTClient' );

// Google language codes can differ from the language codes that we use.
const googleLanguageNameMap = {
	arz: 'ar', // T317224
	'be-tarask': 'be', // T122033
	bho: 'bh', // Bhojpuri
	gan: 'zh-TW', // T258919
	he: 'iw', // Hebrew
	jv: 'jw', // Javanese
	mni: 'mni-Mtei', // Manipuri
	nb: 'no', // T132217
	simple: 'en', // Simple
	sh: 'bs', // T258919
	tw: 'ak', // Twi
	wuu: 'zh', // T258919
	yue: 'zh-TW', // T258919
	zh: 'zh-CN' // Chinese
};

class Google extends MTClient {
	/**
	 * Translate marked-up text
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceHtml Source html
	 * @return {Promise} Promise that resolves translated html
	 */
	translate( sourceLang, targetLang, sourceHtml ) {
		return this.translateReducedHtml( sourceLang, targetLang, sourceHtml );
	}

	/**
	 * Translate html or plain text content with Google.
	 * Google is capable of translating plain text and html with
	 * annotations mapping (keeps markup retained in translated content).
	 * Hence overriding translate method of MTClient.
	 *
	 * @param {string} sourceLang Source language code
	 * @param {string} targetLang Target language code
	 * @param {string} sourceHtml Source language content
	 * @return {Promise} Target language content
	 */
	translateHtml( sourceLang, targetLang, sourceHtml ) {
		const key = this.conf.mt.Google.key;
		if ( key === null ) {
			return Promise.reject( new Error( 'Google service is misconfigured' ) );
		}

		const length = sourceHtml.length;
		const limit = 10000;
		if ( length > limit ) {
			// Max limit is 5K characters for Google.
			return Promise.reject( new Error(
				`Source content too long: ${length} (${limit} is the character limit)`
			) );
		}

		sourceLang = googleLanguageNameMap[ sourceLang ] || sourceLang;
		targetLang = googleLanguageNameMap[ targetLang ] || targetLang;
		// See https://cloud.google.com/translate/v2/translating-text-with-rest
		const postData = {
			uri: this.conf.mt.Google.api,
			proxy: this.conf.proxy,
			body: {
				key: key,
				source: sourceLang,
				target: targetLang,
				format: 'html',
				q: sourceHtml
			},
			headers: {
				// To use POST, we must use the X-HTTP-Method-Override header
				// to tell the Translate API to treat the request as a GET
				'X-HTTP-Method-Override': 'GET'
			}
		};

		return preq.post( postData ).then( ( response ) => {
			this.metrics.makeMetric( {
				type: 'Counter',
				name: 'translate.Google.charcount',
				prometheus: {
					name: 'translate_google_charcount',
					help: 'Google character count'
				}
			} ).increment( length );
			return response.body.data.translations[ 0 ].translatedText;
		} ).catch( ( response ) => {
			throw new Error( `Translation with Google failed for ${sourceLang} > ${targetLang}. ` +
				`Error: ${response.body.error.code} : ${response.body.error.message}` );
		} );
	}

	requiresAuthorization() {
		return true;
	}

}

module.exports = Google;
