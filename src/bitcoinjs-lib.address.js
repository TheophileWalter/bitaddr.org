//https://raw.github.com/bitcoinjs/bitcoinjs-lib/09e8c6e184d6501a0c2c59d73ca64db5c0d3eb95/src/address.js
Bitcoin.Address = function (bytes) {
	if ("string" == typeof bytes) {
		bytes = Bitcoin.Address.decodeString(bytes);
	}
	this.hash = bytes;
	this.version = Bitcoin.Address.networkVersion;
};

Bitcoin.Address.networkVersion = 0x00; // mainnet

/**
* Serialize this object as a standard Bitcoin address.
*
* Returns the address as a base58-encoded string in the standardized format.
*/
Bitcoin.Address.prototype.toString = function () {
	// Get a copy of the hash
	var hash = this.hash.slice(0);

	// Version
	hash.unshift(this.version);
	var checksum = Crypto.SHA256(Crypto.SHA256(hash, { asBytes: true }), { asBytes: true });
	var bytes = hash.concat(checksum.slice(0, 4));
	return Bitcoin.Base58.encode(bytes);
};

Bitcoin.Address.prototype.getHashBase64 = function () {
	return Crypto.util.bytesToBase64(this.hash);
};

/**
* Parse a Bitcoin address contained in a string.
*/
Bitcoin.Address.decodeString = function (string) {
	var bytes = Bitcoin.Base58.decode(string);
	var hash = bytes.slice(0, 21);
	var checksum = Crypto.SHA256(Crypto.SHA256(hash, { asBytes: true }), { asBytes: true });

	if (checksum[0] != bytes[21] ||
			checksum[1] != bytes[22] ||
			checksum[2] != bytes[23] ||
			checksum[3] != bytes[24]) {
		throw "Checksum validation failed!";
	}

	var version = hash.shift();

	if (version != 0) {
		throw "Version " + version + " not supported!";
	}

	return hash;
};

// Bech32 and Bech32m encoder for native SegWit addresses (BIP173, BIP350)
Bitcoin.Bech32 = (function () {
	var CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
	var GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
	var BECH32M_CONST = 0x2bc830a3;

	function polymod(values) {
		var chk = 1;
		for (var i = 0; i < values.length; ++i) {
			var top = chk >> 25;
			chk = (chk & 0x1ffffff) << 5 ^ values[i];
			for (var j = 0; j < 5; ++j) {
				if ((top >> j) & 1) chk ^= GENERATOR[j];
			}
		}
		return chk;
	}

	function hrpExpand(hrp) {
		var ret = [];
		for (var p = 0; p < hrp.length; ++p) ret.push(hrp.charCodeAt(p) >> 5);
		ret.push(0);
		for (var p = 0; p < hrp.length; ++p) ret.push(hrp.charCodeAt(p) & 31);
		return ret;
	}

	function createChecksum(hrp, data, bech32m) {
		var values = hrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
		var mod = polymod(values) ^ (bech32m ? BECH32M_CONST : 1);
		var ret = [];
		for (var p = 0; p < 6; ++p) ret.push((mod >> (5 * (5 - p))) & 31);
		return ret;
	}

	function encode(hrp, data, bech32m) {
		var combined = data.concat(createChecksum(hrp, data, !!bech32m));
		var ret = hrp + '1';
		for (var i = 0; i < combined.length; ++i) ret += CHARSET.charAt(combined[i]);
		return ret;
	}

	// Convert between bit-group sizes (e.g. 8-bit bytes to 5-bit groups)
	function convertbits(data, frombits, tobits, pad) {
		var acc = 0, bits = 0, ret = [], maxv = (1 << tobits) - 1;
		for (var i = 0; i < data.length; ++i) {
			acc = (acc << frombits) | data[i];
			bits += frombits;
			while (bits >= tobits) {
				bits -= tobits;
				ret.push((acc >> bits) & maxv);
			}
		}
		if (pad && bits > 0) ret.push((acc << (tobits - bits)) & maxv);
		return ret;
	}

	return {
		// Encode a SegWit address: witver=0 → bech32 (bc1q), witver=1 → bech32m (bc1p)
		segwitAddress: function (hrp, witver, witprog) {
			var data = [witver].concat(convertbits(witprog, 8, 5, true));
			return encode(hrp, data, witver > 0);
		}
	};
})();