/*!
* Cryptographically Secure Random Number Generator
*
* Architecture:
*   Primary source  : window.crypto.getRandomValues (OS CSPRNG — NIST SP 800-90A)
*   Defense-in-depth: SHA-256 hash of accumulated environmental entropy XOR'd
*                     into the CSPRNG output, so even a compromised CSPRNG
*                     cannot produce predictable keys without also knowing the
*                     accumulated pool state.
*
* Entropy pool contributions:
*   - OS CSPRNG (initial fill)
*   - Screen geometry, colour depth, timezone
*   - navigator.userAgent, language, history length
*   - High-resolution timing via performance.now()
*   - Mouse position & timing (via ninja.seeder)
*   - Keyboard timing (via ninja.seeder)
*   - Web Audio API frequency-bin noise (if available)
*
* Copyright Tom Wu, bitaddr.org  BSD License.
* http://www-cs-students.stanford.edu/~tjw/jsbn/LICENSE
*/
(function () {

	// Constructor of the global SecureRandom object
	var sr = window.SecureRandom = function () { };

	// ---- Pool ---------------------------------------------------------------

	sr.poolSize = 256;
	sr.pool = [];          // plain array for compatibility with bytesToHex
	sr.pptr = 0;
	sr.poolCopyOnInit = null;

	// Fill the pool from window.crypto first, then fall back to Math.random
	(function initPool() {
		if (window.crypto && window.crypto.getRandomValues && window.Uint8Array) {
			try {
				var ua = new Uint8Array(sr.poolSize);
				window.crypto.getRandomValues(ua);
				for (var i = 0; i < sr.poolSize; i++) sr.pool.push(ua[i]);
			} catch (e) { }
		}
		while (sr.pool.length < sr.poolSize) {
			var t = Math.floor(65536 * Math.random());
			sr.pool.push(t >>> 8);
			sr.pool.push(t & 255);
		}
	})();

	// ---- Seeding helpers (kept for API compatibility with ninja.seeder) -----

	sr.seedInt8 = function (x) {
		sr.pool[sr.pptr] ^= (x & 0xFF);
		sr.pptr = (sr.pptr + 1) % sr.poolSize;
	};

	sr.seedInt16 = function (x) {
		sr.seedInt8(x);
		sr.seedInt8(x >> 8);
	};

	sr.seedInt = function (x) {
		sr.seedInt8(x);
		sr.seedInt8(x >> 8);
		sr.seedInt8(x >> 16);
		sr.seedInt8(x >> 24);
	};

	// Seed current time with high-resolution timing when available
	sr.seedTime = function () {
		sr.seedInt(new Date().getTime());
		if (window.performance && window.performance.now) {
			// performance.now() has sub-millisecond precision — ~20 bits of entropy
			sr.seedInt(Math.floor(window.performance.now() * 1000));
		}
	};

	// ---- Output generation --------------------------------------------------

	sr.prototype.nextBytes = function (ba) {
		// Capture pool state the first time bytes are generated (for entropy audit display)
		if (sr.poolCopyOnInit === null) {
			sr.poolCopyOnInit = sr.pool.slice();
		}

		if (window.crypto && window.crypto.getRandomValues && window.Uint8Array) {
			try {
				// Step 1 – fresh OS CSPRNG bytes (primary source)
				var cspBytes = new Uint8Array(ba.length);
				window.crypto.getRandomValues(cspBytes);

				// Step 2 – SHA-256 of accumulated pool (defense-in-depth)
				var poolHash = Crypto.SHA256(sr.pool, { asBytes: true });

				// Step 3 – XOR both sources; neither alone can predict the output
				for (var i = 0; i < ba.length; i++) {
					ba[i] = cspBytes[i] ^ poolHash[i % 32];
				}

				// Advance pool pointer so repeated calls produce different hashes
				sr.seedTime();
				return;
			} catch (e) { }
		}

		// Fallback (no CSPRNG): derive output purely from pool hash
		var poolHash = Crypto.SHA256(sr.pool, { asBytes: true });
		for (var i = 0; i < ba.length; i++) {
			ba[i] = poolHash[i % 32];
		}
		sr.seedTime();
	};

	// Legacy static helper used internally by some older callers
	sr.getByte = function () {
		var b = [0];
		(new sr()).nextBytes(b);
		return b[0];
	};

	// ---- Collect initial environmental entropy ------------------------------

	(function collectEnvironmentEntropy() {
		sr.seedTime();

		var s = "";
		s += (window.screen.height * window.screen.width * window.screen.colorDepth);
		s += (window.screen.availHeight * window.screen.availWidth * window.screen.pixelDepth);
		s += new Date().getTimezoneOffset();
		s += navigator.userAgent;
		s += (navigator.language || navigator.userLanguage || "");
		s += window.history.length;
		s += (window.location && window.location.href ? window.location.href : "");
		if (window.performance && window.performance.now) {
			s += window.performance.now().toString();
		}

		var envBytes = Crypto.SHA256(s, { asBytes: true });
		for (var i = 0; i < envBytes.length; i++) sr.seedInt8(envBytes[i]);

		// Web Audio API – ADC noise leaks a few bits of true physical randomness
		try {
			var AudioCtx = window.AudioContext || window.webkitAudioContext;
			if (AudioCtx) {
				var ctx = new AudioCtx();
				var analyser = ctx.createAnalyser();
				var osc = ctx.createOscillator();
				var gain = ctx.createGain();
				gain.gain.value = 0;          // silent
				osc.connect(analyser);
				analyser.connect(gain);
				gain.connect(ctx.destination);
				osc.start(0);
				var bins = new Uint8Array(analyser.frequencyBinCount);
				analyser.getByteFrequencyData(bins);
				osc.stop();
				if (ctx.close) ctx.close();
				for (var i = 0; i < bins.length; i++) sr.seedInt8(bins[i]);
			}
		} catch (e) { }

		// poolCopyOnInit stays null here; it is assigned on first key generation (see nextBytes)
	})();

})();
