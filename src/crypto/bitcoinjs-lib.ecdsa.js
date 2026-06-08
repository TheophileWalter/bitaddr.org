/*
 * Bitcoin ECDSA - backed by noble-secp256k1 (MIT, audited)
 * https://github.com/paulmillr/noble-secp256k1
 */

// Bridge: synchronous HMAC-SHA256 for noble's RFC 6979 nonce generation
(function () {
	if (typeof nobleSecp256k1 !== 'undefined' && typeof Crypto !== 'undefined') {
		nobleSecp256k1.utils.hmacSha256Sync = function (key) {
			var msgs = Array.prototype.slice.call(arguments, 1);
			var keyArr = Array.from(key);
			var data = [];
			for (var i = 0; i < msgs.length; i++) {
				var m = msgs[i];
				for (var j = 0; j < m.length; j++) data.push(m[j]);
			}
			return new Uint8Array(Crypto.HMAC(Crypto.SHA256, keyArr, data, { asBytes: true }));
		};
	}
})();

Bitcoin.ECDSA = (function () {
	function toHex(arr) {
		return Crypto.util.bytesToHex(arr instanceof Uint8Array ? Array.from(arr) : arr).toUpperCase();
	}

	return {
		/*
		 * Sign a hash. priv is a Uint8Array (32 bytes).
		 * noble signSync: deterministic RFC 6979, constant-time, low-s.
		 * Returns DER-encoded signature as a plain byte array.
		 */
		sign: function (hash, priv) {
			var sig = nobleSecp256k1.signSync(
				new Uint8Array(hash),
				priv instanceof Uint8Array ? priv : new Uint8Array(priv),
				{ canonical: true, der: true }
			);
			return Array.from(sig);
		},

		/*
		 * Verify a DER signature. pubkey is a plain byte array.
		 * noble validates the public key (on-curve, non-infinity) before verifying.
		 */
		verify: function (hash, sig, pubkey) {
			if (!Bitcoin.Util.isArray(sig) && !(sig instanceof Uint8Array))
				throw "Invalid value for signature";
			if (!Bitcoin.Util.isArray(pubkey) && !(pubkey instanceof Uint8Array))
				throw "Invalid format for pubkey value";
			try {
				return nobleSecp256k1.verify(toHex(sig), toHex(hash), toHex(pubkey));
			} catch (e) {
				return false;
			}
		}
	};
})();
