/*
 * Bitcoin ECDSA — backed by noble-secp256k1 (MIT, audited)
 * https://github.com/paulmillr/noble-secp256k1
 *
 * Note: signSync() requires a synchronous HMAC-SHA256 implementation for RFC 6979
 * nonce generation.  We bridge noble to CryptoJS (loaded before this script) below.
 */

// Bridge: provide noble with a synchronous HMAC-SHA256 using CryptoJS
// This is required for signSync() to work (RFC 6979 deterministic nonce).
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
			var result = Crypto.HMAC(Crypto.SHA256, keyArr, data, { asBytes: true });
			return new Uint8Array(result);
		};
	}
})();

Bitcoin.ECDSA = (function () {
	var ecparams = EllipticCurve.getSECCurveByName("secp256k1");

	// BigInteger private key → 32-byte Uint8Array
	function privToBytes(bi) {
		var bytes = bi.toByteArrayUnsigned();
		while (bytes.length < 32) bytes.unshift(0);
		var ua = new Uint8Array(32);
		for (var i = 0; i < 32; i++) ua[i] = bytes[i];
		return ua;
	}

	// Plain byte array or Uint8Array → Uint8Array
	function toUint8Array(arr) {
		if (arr instanceof Uint8Array) return arr;
		var ua = new Uint8Array(arr.length);
		for (var i = 0; i < arr.length; i++) ua[i] = arr[i];
		return ua;
	}

	// Byte array → upper-case hex string
	function toHex(arr) {
		return Crypto.util.bytesToHex(arr instanceof Uint8Array ? Array.from(arr) : arr).toUpperCase();
	}

	var ECDSA = {

		/*
		 * Sign a hash with a private key.
		 * Uses noble signSync: deterministic RFC 6979 nonce, constant-time scalar
		 * multiplication, low-s normalisation (canonical = true).
		 * der:false requests the compact 64-byte (r||s) format for consistent parsing.
		 */
		sign: function (hash, priv) {
			var privBytes = privToBytes(priv);
			var hashBytes = toUint8Array(hash);
			var compact = nobleSecp256k1.signSync(hashBytes, privBytes, { canonical: true, der: false });
			var rArr = Array.from(compact.slice(0, 32));
			var sArr = Array.from(compact.slice(32, 64));
			var r = BigInteger.fromByteArrayUnsigned(rArr);
			var s = BigInteger.fromByteArrayUnsigned(sArr);
			return ECDSA.serializeSig(r, s);
		},

		/*
		 * Verify a DER or compact signature against a hash and a public key.
		 * Noble validates the public key (prefix, coordinates, on-curve) before
		 * verifying — prevents invalid-curve and point-at-infinity attacks.
		 */
		verify: function (hash, sig, pubkey) {
			var sigBytes, pubBytes;

			if (Bitcoin.Util.isArray(sig)) {
				sigBytes = sig;
			} else if ("object" === typeof sig && sig.r && sig.s) {
				sigBytes = ECDSA.serializeSig(sig.r, sig.s);
			} else {
				throw "Invalid value for signature";
			}

			if (pubkey instanceof EllipticCurve.PointFp) {
				pubBytes = pubkey.getEncoded(pubkey.compressed ? 1 : 0);
			} else if (Bitcoin.Util.isArray(pubkey)) {
				pubBytes = pubkey;
			} else {
				throw "Invalid format for pubkey value, must be byte array or ec.PointFp";
			}

			try {
				return nobleSecp256k1.verify(toHex(sigBytes), toHex(hash), toHex(pubBytes));
			} catch (e) {
				return false;
			}
		},

		/*
		 * Serialize (r, s) BigIntegers into a DER-encoded byte array.
		 */
		serializeSig: function (r, s) {
			var rBa = r.toByteArraySigned();
			var sBa = s.toByteArraySigned();

			var sequence = [];
			sequence.push(0x02);
			sequence.push(rBa.length);
			sequence = sequence.concat(rBa);

			sequence.push(0x02);
			sequence.push(sBa.length);
			sequence = sequence.concat(sBa);

			sequence.unshift(sequence.length);
			sequence.unshift(0x30); // SEQUENCE
			return sequence;
		},

		/*
		 * Parse a DER-encoded signature byte array into {r, s} BigIntegers.
		 */
		parseSig: function (sig) {
			if (sig[0] !== 0x30) throw new Error("Signature not a valid DERSequence");
			var cursor = 2;
			if (sig[cursor] !== 0x02) throw new Error("First element in signature must be a DERInteger");
			var rLen = sig[cursor + 1];
			var rBa = sig.slice(cursor + 2, cursor + 2 + rLen);
			cursor += 2 + rLen;
			if (sig[cursor] !== 0x02) throw new Error("Second element in signature must be a DERInteger");
			var sLen = sig[cursor + 1];
			var sBa = sig.slice(cursor + 2, cursor + 2 + sLen);
			return {
				r: BigInteger.fromByteArrayUnsigned(rBa),
				s: BigInteger.fromByteArrayUnsigned(sBa)
			};
		},

		/*
		 * Recover a public key from an ECDSA signature (SEC 1 §4.1.6).
		 * Delegates to noble-secp256k1 for the actual recovery and validation.
		 */
		recoverPubKey: function (r, s, hash, i) {
			var recovery = i & 3;
			var sigBytes = ECDSA.serializeSig(r, s);
			var pubBytes = nobleSecp256k1.recoverPublicKey(toHex(hash), toHex(sigBytes), recovery, false);
			if (!pubBytes) throw "Pubkey recovery unsuccessful";
			var pubKey = new Bitcoin.ECKey();
			pubKey.pub = ecparams.getCurve().decodePointHex(toHex(Array.from(pubBytes)));
			return pubKey;
		},

		calcPubkeyRecoveryParam: function (address, r, s, hash) {
			for (var i = 0; i < 4; i++) {
				try {
					var pubkey = Bitcoin.ECDSA.recoverPubKey(r, s, hash, i);
					if (pubkey.getBitcoinAddress().toString() == address) {
						return i;
					}
				} catch (e) { }
			}
			throw "Unable to find valid recovery factor";
		}
	};

	return ECDSA;
})();
