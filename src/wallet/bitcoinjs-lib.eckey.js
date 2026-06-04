Bitcoin.KeyPool = (function () {
	var KeyPool = function () {
		this.keyArray = [];

		this.push = function (item) {
			if (item == null || item.priv == null) return;
			var doAdd = true;
			// prevent duplicates from being added to the array
			for (var index in this.keyArray) {
				var currentItem = this.keyArray[index];
				if (currentItem != null && currentItem.priv != null && item.getBitcoinAddress() == currentItem.getBitcoinAddress()) {
					doAdd = false;
					break;
				}
			}
			if (doAdd) {
				this.keyArray.push(item);
				var pool = this;
				setTimeout(function () {
					var ta = document.getElementById("keypooltextarea");
					if (ta) ta.value = pool.toString();
				}, 0);
			}
		};

		this.reset = function () {
			this.keyArray = [];
		};

		this.getArray = function () {
			// copy array
			return this.keyArray.slice(0);
		};

		this.setArray = function (ka) {
			this.keyArray = ka;
		};

		this.length = function () {
			return this.keyArray.length;
		};

		this.toString = function () {
			var keyPoolString = "# = " + this.length() + "\n";
			var pool = this.getArray();
			for (var index in pool) {
				var item = pool[index];
				if (Bitcoin.Util.hasMethods(item, 'getBitcoinAddress', 'toString')) {
					if (item != null) {
						var wif = item.toString("wif");
						if (item.logAllAddressTypes && item.getP2SHAddress && item.getSegwitAddress && item.getTaprootAddress) {
							keyPoolString += "\"" + item.getBitcoinAddress() + "\",\"" + wif + "\"\n";
							keyPoolString += "\"" + item.getP2SHAddress() + "\",\"" + wif + "\"\n";
							keyPoolString += "\"" + item.getSegwitAddress() + "\",\"" + wif + "\"\n";
							keyPoolString += "\"" + item.getTaprootAddress() + "\",\"" + wif + "\"\n";
						} else {
							var addr = item.getDisplayAddress ? item.getDisplayAddress() : item.getBitcoinAddress();
							keyPoolString += "\"" + addr + "\",\"" + wif + "\"\n";
						}
					}
				}
			}

			return keyPoolString;
		};

		return this;
	};

	return new KeyPool();
})();

Bitcoin.Bip38Key = (function () {
	var Bip38 = function (address, encryptedKey) {
		this.address = address;
		this.priv = encryptedKey;
	};

	Bip38.prototype.getBitcoinAddress = function () {
		return this.address;
	};

	Bip38.prototype.toString = function () {
		return this.priv;
	};

	return Bip38;
})();

//https://raw.github.com/pointbiz/bitcoinjs-lib/9b2f94a028a7bc9bed94e0722563e9ff1d8e8db8/src/eckey.js
Bitcoin.ECKey = (function () {
	var ECDSA = Bitcoin.ECDSA;
	var KeyPool = Bitcoin.KeyPool;
	var ecparams = EllipticCurve.getSECCurveByName("secp256k1");

	var ECKey = function (input) {
		if (!input) {
			// Generate a new random private key using noble-secp256k1.
			// utils.randomPrivateKey() uses window.crypto.getRandomValues and
			// rejects values outside [1, n-1] — no BigInteger RNG needed.
			var privBytes = nobleSecp256k1.utils.randomPrivateKey();
			this.priv = BigInteger.fromByteArrayUnsigned(Array.from(privBytes));
		} else if (input instanceof BigInteger) {
			// Input is a private key value
			this.priv = input;
		} else if (Bitcoin.Util.isArray(input)) {
			// Prepend zero byte to prevent interpretation as negative integer
			this.priv = BigInteger.fromByteArrayUnsigned(input);
		} else if ("string" == typeof input) {
			var bytes = null;
			try {
				if (ECKey.isWalletImportFormat(input)) {
					bytes = ECKey.decodeWalletImportFormat(input);
				} else if (ECKey.isCompressedWalletImportFormat(input)) {
					bytes = ECKey.decodeCompressedWalletImportFormat(input);
					this.compressed = true;
				} else if (ECKey.isHexFormat(input)) {
					bytes = Crypto.util.hexToBytes(input);
				}
			} catch (exc1) {
				this.setError(exc1);
			}

			if (bytes == null || bytes.length != 32) {
				this.priv = null;
			} else {
				// Prepend zero byte to prevent interpretation as negative integer
				this.priv = BigInteger.fromByteArrayUnsigned(bytes);
			}
		}

		this.compressed = (this.compressed == undefined) ? !!ECKey.compressByDefault : this.compressed;
		try {
			if (this.priv != null) {
				// Validate using noble: checks 0 < k < n (secp256k1 order)
				var privBytes = this.priv.toByteArrayUnsigned();
				while (privBytes.length < 32) privBytes.unshift(0);
				var ua = new Uint8Array(32);
				for (var i = 0; i < 32; i++) ua[i] = privBytes[i];
				if (!nobleSecp256k1.utils.isValidPrivateKey(ua)) {
					this.setError("Error: private key is outside the valid secp256k1 range [1, n-1].");
				}
			}
			if (this.priv != null) {
				KeyPool.push(this);
			}
		} catch (exc2) {
			this.setError(exc2);
		}
	};

	ECKey.privateKeyPrefix = 0x80; // mainnet 0x80    testnet 0xEF

	/**
	* Whether public keys should be returned compressed by default.
	*/
	ECKey.compressByDefault = false;

	/**
	* Set whether the public key should be returned compressed or not.
	*/
	ECKey.prototype.setError = function (err) {
		this.error = err;
		this.priv = null;
		return this;
	};

	/**
	* Set whether the public key should be returned compressed or not.
	*/
	ECKey.prototype.setCompressed = function (v) {
		this.compressed = !!v;
		if (this.pubPoint) this.pubPoint.compressed = this.compressed;
		return this;
	};

	/*
	* Return public key as a byte array in DER encoding
	*/
	ECKey.prototype.getPub = function () {
		return this.getPubPoint().getEncoded(this.compressed ? 1 : 0);
	};

	/**
	* Return public point as ECPoint object.
	* Uses noble-secp256k1 for point multiplication (precomputed, window-based,
	* constant-time) and reconstructs an EllipticCurve.PointFp for API compatibility.
	*/
	ECKey.prototype.getPubPoint = function () {
		if (!this.pubPoint) {
			// Derive public key bytes via noble (compressed = true for the Point constructor)
			var privBytes = this.priv.toByteArrayUnsigned();
			while (privBytes.length < 32) privBytes.unshift(0);
			var ua = new Uint8Array(32);
			for (var i = 0; i < 32; i++) ua[i] = privBytes[i];
			// Get uncompressed public key bytes (65 bytes: 04 || x || y)
			var pubBytesUncomp = nobleSecp256k1.getPublicKey(ua, false);
			var pubHex = Crypto.util.bytesToHex(Array.from(pubBytesUncomp)).toUpperCase();
			// Decode into PointFp (decodePointHex now validates on-curve via noble)
			this.pubPoint = ecparams.getCurve().decodePointHex(pubHex);
			this.pubPoint.compressed = this.compressed;
		}
		return this.pubPoint;
	};

	ECKey.prototype.getPubKeyHex = function () {
		return Crypto.util.bytesToHex(this.getPub()).toString().toUpperCase();
	};

	ECKey.prototype.getPubKeyHash = function () {
		return Bitcoin.Util.sha256ripe160(this.getPub());
	};

	ECKey.prototype.getBitcoinAddress = function () {
		var hash = this.getPubKeyHash();
		var addr = new Bitcoin.Address(hash);
		return addr.toString();
	};

	// Address type tracked at generation time so the key pool log shows the correct format
	ECKey.prototype.addressType = "legacy";

	ECKey.prototype.setAddressType = function (type) {
		this.addressType = type || "legacy";
		return this;
	};

	ECKey.prototype.getDisplayAddress = function () {
		switch (this.addressType) {
			case "p2sh":    return this.getP2SHAddress();
			case "segwit":  return this.getSegwitAddress();
			case "taproot": return this.getTaprootAddress();
			default:        return this.getBitcoinAddress();
		}
	};

	// P2SH-P2WPKH address (starts with '3') — compressed key required
	ECKey.prototype.getP2SHAddress = function () {
		var savedComp = this.compressed;
		this.setCompressed(true);
		var pubKeyHash = Bitcoin.Util.sha256ripe160(this.getPub());
		this.setCompressed(savedComp);
		// Redeem script: OP_0 <20-byte pubkey hash>
		var redeemScript = [0x00, 0x14].concat(pubKeyHash);
		var scriptHash = Bitcoin.Util.sha256ripe160(redeemScript);
		var addr = new Bitcoin.Address(scriptHash);
		addr.version = 0x05;
		return addr.toString();
	};

	// Native SegWit P2WPKH address (bc1q...) — compressed key required
	ECKey.prototype.getSegwitAddress = function () {
		var savedComp = this.compressed;
		this.setCompressed(true);
		var pubKeyHash = Bitcoin.Util.sha256ripe160(this.getPub());
		this.setCompressed(savedComp);
		return Bitcoin.Bech32.segwitAddress('bc', 0, pubKeyHash);
	};

	// Taproot P2TR address (bc1p...) — key-path spend, no script tree
	ECKey.prototype.getTaprootAddress = function () {
		var savedComp = this.compressed;
		this.setCompressed(true);
		var compPub = this.getPub().slice();
		this.setCompressed(savedComp);

		// lift_x: force even-Y variant (key-path spend uses x-only internal key)
		compPub[0] = 0x02;
		var pubHex = Crypto.util.bytesToHex(compPub).toUpperCase();

		// x-only internal key bytes (32 bytes)
		var xBytes = compPub.slice(1);

		// tagged_hash("TapTweak", xBytes) per BIP340
		var tagHash = Crypto.SHA256("TapTweak", { asBytes: true });
		var tweakBytes = Crypto.SHA256(tagHash.concat(tagHash).concat(xBytes), { asBytes: true });
		var tweakHex = Crypto.util.bytesToHex(tweakBytes);

		// Output key Q = P + tweak*G via noble (constant-time, audited)
		var nobleP = nobleSecp256k1.Point.fromHex(pubHex);
		var nobleQ = nobleP.add(nobleSecp256k1.Point.BASE.multiply(BigInt('0x' + tweakHex)));

		// Witness program = x-coordinate of Q (32 bytes)
		var qXBytes = Crypto.util.hexToBytes(nobleQ.x.toString(16).padStart(64, '0'));

		return Bitcoin.Bech32.segwitAddress('bc', 1, qXBytes);
	};

	/*
	* Takes a public point as a hex string or byte array
	*/
	ECKey.prototype.setPub = function (pub) {
		// byte array
		if (Bitcoin.Util.isArray(pub)) {
			pub = Crypto.util.bytesToHex(pub).toString().toUpperCase();
		}
		var ecPoint = ecparams.getCurve().decodePointHex(pub);
		this.setCompressed(ecPoint.compressed);
		this.pubPoint = ecPoint;
		return this;
	};

	// Sipa Private Key Wallet Import Format 
	ECKey.prototype.getBitcoinWalletImportFormat = function () {
		var bytes = this.getBitcoinPrivateKeyByteArray();
		if (bytes == null) return "";
		bytes.unshift(ECKey.privateKeyPrefix); // prepend 0x80 byte
		if (this.compressed) bytes.push(0x01); // append 0x01 byte for compressed format
		var checksum = Crypto.SHA256(Crypto.SHA256(bytes, { asBytes: true }), { asBytes: true });
		bytes = bytes.concat(checksum.slice(0, 4));
		var privWif = Bitcoin.Base58.encode(bytes);
		return privWif;
	};

	// Private Key Hex Format
	ECKey.prototype.getBitcoinHexFormat = function () {
		return Crypto.util.bytesToHex(this.getBitcoinPrivateKeyByteArray()).toString().toUpperCase();
	};

	ECKey.prototype.getBitcoinPrivateKeyByteArray = function () {
		if (this.priv == null) return null;
		// Get a copy of private key as a byte array
		var bytes = this.priv.toByteArrayUnsigned();
		// zero pad if private key is less than 32 bytes 
		while (bytes.length < 32) bytes.unshift(0x00);
		return bytes;
	};

	ECKey.prototype.toString = function (format) {
		if (format && format.toString().toLowerCase() == "wif") {
			return this.getBitcoinWalletImportFormat();
		}
		return this.getBitcoinHexFormat();
	};

	ECKey.prototype.sign = function (hash) {
		return ECDSA.sign(hash, this.priv);
	};

	ECKey.prototype.verify = function (hash, sig) {
		return ECDSA.verify(hash, sig, this.getPub());
	};

	/**
	* Parse a wallet import format private key contained in a string.
	*/
	ECKey.decodeWalletImportFormat = function (privStr) {
		var bytes = Bitcoin.Base58.decode(privStr);
		var hash = bytes.slice(0, 33);
		var checksum = Crypto.SHA256(Crypto.SHA256(hash, { asBytes: true }), { asBytes: true });
		if (checksum[0] != bytes[33] ||
					checksum[1] != bytes[34] ||
					checksum[2] != bytes[35] ||
					checksum[3] != bytes[36]) {
			throw "Checksum validation failed!";
		}
		var version = hash.shift();
		if (version != ECKey.privateKeyPrefix) {
			throw "Version " + version + " not supported!";
		}
		return hash;
	};

	/**
	* Parse a compressed wallet import format private key contained in a string.
	*/
	ECKey.decodeCompressedWalletImportFormat = function (privStr) {
		var bytes = Bitcoin.Base58.decode(privStr);
		var hash = bytes.slice(0, 34);
		var checksum = Crypto.SHA256(Crypto.SHA256(hash, { asBytes: true }), { asBytes: true });
		if (checksum[0] != bytes[34] ||
					checksum[1] != bytes[35] ||
					checksum[2] != bytes[36] ||
					checksum[3] != bytes[37]) {
			throw "Checksum validation failed!";
		}
		var version = hash.shift();
		if (version != ECKey.privateKeyPrefix) {
			throw "Version " + version + " not supported!";
		}
		hash.pop();
		return hash;
	};

	// 64 characters [0-9A-F]
	ECKey.isHexFormat = function (key) {
		key = key.toString();
		return /^[A-Fa-f0-9]{64}$/.test(key);
	};

	// 51 characters base58, always starts with a '5'
	ECKey.isWalletImportFormat = function (key) {
		key = key.toString();
		return (ECKey.privateKeyPrefix == 0x80) ?
							(/^5[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{50}$/.test(key)) :
							(/^9[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{50}$/.test(key));
	};

	// 52 characters base58
	ECKey.isCompressedWalletImportFormat = function (key) {
		key = key.toString();
		return (ECKey.privateKeyPrefix == 0x80) ?
							(/^[LK][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51}$/.test(key)) :
							(/^c[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51}$/.test(key));
	};

	return ECKey;
})();