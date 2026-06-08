/*!
* Cryptographically Secure Random Number Generator
*
* Primary source: window.crypto.getRandomValues (OS CSPRNG, NIST SP 800-90A).
* Auxiliary pool: user-interaction entropy (mouse, keyboard) mixed via SHA-256.
*   The auxiliary pool exists ONLY as a defence-in-depth measure in case the
*   browser CSPRNG were ever compromised.  It cannot weaken output: when pool
*   entropy is present, output = CSPRNG XOR SHA256(pool || CSPRNG), so output
*   is at least as strong as the stronger of the two sources.
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

	// ── Auxiliary entropy pool ────────────────────────────────────────────────
	// Populated by ninja.seeder via mouse/keyboard events.
	// Serves ONLY as a precaution: the CSPRNG is always the primary source.

	var _auxPool = (function () {
		// Pre-seed with CSPRNG to avoid a trivial all-zero initial state.
		var p = new Uint8Array(32);
		window.crypto.getRandomValues(p);
		return p;
	}());
	var _auxPoolHasUserEntropy = false;

	// Mix caller-supplied bytes into the pool: pool = SHA256(pool || data)
	// Called by ninja.seeder on each mouse/keyboard event.
	sr.mixEntropy = function (data) {
		var input = new Array(32 + data.length);
		for (var i = 0; i < 32; i++) input[i] = _auxPool[i];
		for (var i = 0; i < data.length; i++) input[32 + i] = data[i] & 0xff;
		var hash = Crypto.SHA256(input, { asBytes: true });
		for (var i = 0; i < 32; i++) _auxPool[i] = hash[i];
		_auxPoolHasUserEntropy = true;
	};

	// Fill byte array ba[] with cryptographically random bytes.
	// When user entropy has been collected, each 32-byte block is XOR'd with
	// SHA256(pool || chunk || chunkIndex) to fold in the auxiliary pool.
	sr.prototype.nextBytes = function (ba) {
		if (!window.crypto || !window.crypto.getRandomValues) {
			throw new Error(
				'CSPRNG unavailable: window.crypto.getRandomValues is required. ' +
				'Key generation aborted.'
			);
		}
		var ua = new Uint8Array(ba.length);
		window.crypto.getRandomValues(ua);

		if (!_auxPoolHasUserEntropy) {
			// User entropy not yet collected - use CSPRNG output directly.
			for (var i = 0; i < ua.length; i++) ba[i] = ua[i];
			return;
		}

		// Combine CSPRNG output with the auxiliary entropy pool.
		// Security invariant: output is at least as strong as CSPRNG alone,
		// and stronger if CSPRNG were weak but pool has real user entropy.
		for (var off = 0; off < ba.length; off += 32) {
			var end = Math.min(off + 32, ba.length);
			var len = end - off;
			// h = pool(32) || chunkIdx(1) || csprng_chunk(len)
			var h = new Array(33 + len);
			for (var i = 0; i < 32; i++) h[i] = _auxPool[i];
			h[32] = (off / 32) & 0xff;
			for (var i = 0; i < len; i++) h[33 + i] = ua[off + i];
			var mask = Crypto.SHA256(h, { asBytes: true });
			for (var i = 0; i < len; i++) ba[off + i] = ua[off + i] ^ mask[i];
		}

		// Forward secrecy: update pool so a future pool compromise cannot
		// retroactively reveal keys generated in this call.
		var fwd = new Array(32 + ba.length);
		for (var i = 0; i < 32; i++) fwd[i] = _auxPool[i];
		for (var i = 0; i < ba.length; i++) fwd[32 + i] = ba[i];
		var newPool = Crypto.SHA256(fwd, { asBytes: true });
		for (var i = 0; i < 32; i++) _auxPool[i] = newPool[i];
	};

	// Static single-byte helper used by some internal callers
	sr.getByte = function () {
		var b = [0];
		(new sr()).nextBytes(b);
		return b[0];
	};

})();
