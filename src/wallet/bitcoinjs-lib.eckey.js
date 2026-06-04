Bitcoin.KeyPool = (function () {
	var KeyPool = function () {
		this.keyArray = [];

		this.push = function (item) {
			if (item == null || item.priv == null) return;
			var doAdd = true;
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

		this.reset = function () { this.keyArray = []; };
		this.getArray = function () { return this.keyArray.slice(0); };
		this.setArray = function (ka) { this.keyArray = ka; };
		this.length = function () { return this.keyArray.length; };

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

	Bip38.prototype.getBitcoinAddress = function () { return this.address; };
	Bip38.prototype.toString = function () { return this.priv; };

	return Bip38;
})();

Bitcoin.ECKey = (function () {
	var ECDSA = Bitcoin.ECDSA;
	var KeyPool = Bitcoin.KeyPool;

	var ECKey = function (input) {
		if (!input) {
			// Random key — noble uses window.crypto.getRandomValues, rejects invalid scalars
			this.priv = nobleSecp256k1.utils.randomPrivateKey(); // Uint8Array(32)
		} else if (Bitcoin.Util.isArray(input) || input instanceof Uint8Array) {
			var arr = Array.from(input);
			while (arr.length < 32) arr.unshift(0);
			this.priv = new Uint8Array(arr.slice(arr.length - 32));
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
				this.priv = new Uint8Array(bytes);
			}
		}

		this.compressed = (this.compressed == undefined) ? !!ECKey.compressByDefault : this.compressed;
		try {
			if (this.priv != null && !nobleSecp256k1.utils.isValidPrivateKey(this.priv)) {
				this.setError("Error: private key is outside the valid secp256k1 range [1, n-1].");
			}
			if (this.priv != null) {
				KeyPool.push(this);
			}
		} catch (exc2) {
			this.setError(exc2);
		}
	};

	ECKey.privateKeyPrefix = 0x80; // mainnet 0x80    testnet 0xEF
	ECKey.compressByDefault = false;

	ECKey.prototype.setError = function (err) {
		this.error = err;
		this.priv = null;
		return this;
	};

	ECKey.prototype.setCompressed = function (v) {
		this.compressed = !!v;
		this._pubCache = null; // invalidate cached public key bytes
		return this;
	};

	// Return public key bytes — noble performs point multiplication
	ECKey.prototype.getPub = function () {
		if (!this._pubCache || this._pubCacheComp !== this.compressed) {
			this._pubCache = Array.from(nobleSecp256k1.getPublicKey(this.priv, this.compressed));
			this._pubCacheComp = this.compressed;
		}
		return this._pubCache;
	};

	ECKey.prototype.getPubKeyHex = function () {
		return Crypto.util.bytesToHex(this.getPub()).toString().toUpperCase();
	};

	ECKey.prototype.getPubKeyHash = function () {
		return Bitcoin.Util.sha256ripe160(this.getPub());
	};

	ECKey.prototype.getBitcoinAddress = function () {
		return new Bitcoin.Address(this.getPubKeyHash()).toString();
	};

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

		// lift_x: force even-Y
		compPub[0] = 0x02;
		var pubHex = Crypto.util.bytesToHex(compPub).toUpperCase();
		var xBytes = compPub.slice(1); // 32-byte x-only internal key

		// tagged_hash("TapTweak", xBytes) per BIP340
		var tagHash = Crypto.SHA256("TapTweak", { asBytes: true });
		var tweakBytes = Crypto.SHA256(tagHash.concat(tagHash).concat(xBytes), { asBytes: true });
		var tweakHex = Crypto.util.bytesToHex(tweakBytes);

		// Q = P + tweak·G via noble
		var nobleP = nobleSecp256k1.Point.fromHex(pubHex);
		var nobleQ = nobleP.add(nobleSecp256k1.Point.BASE.multiply(BigInt('0x' + tweakHex)));
		var qXBytes = Crypto.util.hexToBytes(nobleQ.x.toString(16).padStart(64, '0'));

		return Bitcoin.Bech32.segwitAddress('bc', 1, qXBytes);
	};

	// Sipa Private Key Wallet Import Format
	ECKey.prototype.getBitcoinWalletImportFormat = function () {
		var bytes = this.getBitcoinPrivateKeyByteArray();
		if (bytes == null) return "";
		bytes.unshift(ECKey.privateKeyPrefix);
		if (this.compressed) bytes.push(0x01);
		var checksum = Crypto.SHA256(Crypto.SHA256(bytes, { asBytes: true }), { asBytes: true });
		bytes = bytes.concat(checksum.slice(0, 4));
		return Bitcoin.Base58.encode(bytes);
	};

	// Private Key Hex Format
	ECKey.prototype.getBitcoinHexFormat = function () {
		return Crypto.util.bytesToHex(this.getBitcoinPrivateKeyByteArray()).toString().toUpperCase();
	};

	ECKey.prototype.getBitcoinPrivateKeyByteArray = function () {
		if (this.priv == null) return null;
		return Array.from(this.priv); // Uint8Array(32) → plain Array
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

	ECKey.decodeWalletImportFormat = function (privStr) {
		var bytes = Bitcoin.Base58.decode(privStr);
		var hash = bytes.slice(0, 33);
		var checksum = Crypto.SHA256(Crypto.SHA256(hash, { asBytes: true }), { asBytes: true });
		if (checksum[0] != bytes[33] || checksum[1] != bytes[34] ||
		    checksum[2] != bytes[35] || checksum[3] != bytes[36]) {
			throw "Checksum validation failed!";
		}
		var version = hash.shift();
		if (version != ECKey.privateKeyPrefix) throw "Version " + version + " not supported!";
		return hash;
	};

	ECKey.decodeCompressedWalletImportFormat = function (privStr) {
		var bytes = Bitcoin.Base58.decode(privStr);
		var hash = bytes.slice(0, 34);
		var checksum = Crypto.SHA256(Crypto.SHA256(hash, { asBytes: true }), { asBytes: true });
		if (checksum[0] != bytes[34] || checksum[1] != bytes[35] ||
		    checksum[2] != bytes[36] || checksum[3] != bytes[37]) {
			throw "Checksum validation failed!";
		}
		var version = hash.shift();
		if (version != ECKey.privateKeyPrefix) throw "Version " + version + " not supported!";
		hash.pop();
		return hash;
	};

	// 64 hex characters [0-9A-F]
	ECKey.isHexFormat = function (key) {
		return /^[A-Fa-f0-9]{64}$/.test(key.toString());
	};

	// 51 base58 chars, starts with '5' (mainnet) or '9' (testnet)
	ECKey.isWalletImportFormat = function (key) {
		key = key.toString();
		return (ECKey.privateKeyPrefix == 0x80) ?
			(/^5[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{50}$/.test(key)) :
			(/^9[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{50}$/.test(key));
	};

	// 52 base58 chars, starts with 'L' or 'K' (mainnet) or 'c' (testnet)
	ECKey.isCompressedWalletImportFormat = function (key) {
		key = key.toString();
		return (ECKey.privateKeyPrefix == 0x80) ?
			(/^[LK][123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51}$/.test(key)) :
			(/^c[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{51}$/.test(key));
	};

	return ECKey;
})();
