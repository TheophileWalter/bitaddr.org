/*!
* Cryptographically Secure Random Number Generator
*
* Sole source: window.crypto.getRandomValues (OS CSPRNG, NIST SP 800-90A).
* No user-interaction seeding, no environmental entropy accumulation.
* The OS CSPRNG is the only legitimate source; all other signals are
* weaker, harder to audit, and increase attack surface without benefit.
*
* Copyright Tom Wu, bitaddr.org  BSD License.
* http://www-cs-students.stanford.edu/~tjw/jsbn/LICENSE
*/
(function () {

	var sr = window.SecureRandom = function () { };

	// Fail loudly on startup if the CSPRNG is absent
	(function checkCSPRNG() {
		if (!window.crypto || !window.crypto.getRandomValues || !window.Uint8Array) {
			throw new Error(
				'CSPRNG unavailable: window.crypto.getRandomValues is required. ' +
				'Bitcoin key generation cannot proceed without a cryptographically secure RNG.'
			);
		}
	})();

	// Fill byte array ba[] with CSPRNG bytes
	sr.prototype.nextBytes = function (ba) {
		if (!window.crypto || !window.crypto.getRandomValues) {
			throw new Error(
				'CSPRNG unavailable: window.crypto.getRandomValues is required. ' +
				'Key generation aborted.'
			);
		}
		var ua = new Uint8Array(ba.length);
		window.crypto.getRandomValues(ua);
		for (var i = 0; i < ua.length; i++) ba[i] = ua[i];
	};

	// Static single-byte helper used by some internal callers
	sr.getByte = function () {
		var b = [0];
		(new sr()).nextBytes(b);
		return b[0];
	};

})();
