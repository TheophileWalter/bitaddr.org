(function (wallets, qrCode, privateKey, translator) {
	var detail = wallets.detailwallet = {
		isOpen: function () {
			return (document.getElementById("detailwallet").className.indexOf("selected") != -1);
		},

		open: function () {
			document.getElementById("detailarea").style.display = "block";
			document.getElementById("detailprivkey").focus();
		},

		close: function () {
			document.getElementById("detailarea").style.display = "none";
		},

		openCloseFaq: function (faqNum) {
			// do close
			if (document.getElementById("detaila" + faqNum).style.display == "block") {
				document.getElementById("detaila" + faqNum).style.display = "none";
				document.getElementById("detaile" + faqNum).setAttribute("class", "more");
			}
			// do open
			else {
				document.getElementById("detaila" + faqNum).style.display = "block";
				document.getElementById("detaile" + faqNum).setAttribute("class", "less");
			}
		},

		getKeyFromInput: function () {
			var key = document.getElementById("detailprivkey").value.toString().replace(/^\s+|\s+$/g, ""); // trim white space
			document.getElementById("detailprivkey").value = key;
			return key;
		},

		checkAndShowMini: function (key) {
			if (Bitcoin.ECKey.isMiniFormat(key)) {
				// show Private Key Mini Format
				document.getElementById("detailprivmini").innerHTML = key;
				document.getElementById("detailmini").style.display = "block";
			}
		},

		checkAndShowBase6: function (key) {
			if (Bitcoin.ECKey.isBase6Format(key)) {
				// show Private Key Base6 Format
				document.getElementById("detailprivb6").innerHTML = key;
				document.getElementById("detailb6").style.display = "block";
			}
		},

		keyToECKeyWithBrain: function (key) {
			var btcKey = new Bitcoin.ECKey(key);
			if (btcKey.error != null) {
				alert(translator.get("detailalertnotvalidprivatekey") + "\n" + btcKey.error);
			}
			else if (btcKey.priv == null) {
				// enforce a minimum passphrase length
				if (key.length >= wallets.brainwallet.minPassphraseLength) {
					// Deterministic Wallet confirm box to ask if user wants to SHA256 the input to get a private key
					var usePassphrase = confirm(translator.get("detailconfirmsha256"));
					if (usePassphrase) {
						var bytes = Crypto.SHA256(key, { asBytes: true });
						btcKey = new Bitcoin.ECKey(bytes);
					}
				}
				else {
					alert(translator.get("detailalertnotvalidprivatekey"));
				}
			}
			return btcKey;
		},

		decryptBip38: function () {
			detail.clear();
			var key = detail.getKeyFromInput();
			if (key == "") {
				return;
			}
			if (privateKey.isBIP38Format(key) == false) {
				return;
			}
			document.getElementById("detailbip38toggle").style.display = "none";
			var passphrase = document.getElementById("detailprivkeypassphrase").value.toString()
			if (passphrase == "") {
				alert(translator.get("bip38alertpassphraserequired"));
				return;
			}
			document.getElementById("busyblock").className = "busy";
			// show Private Key BIP38 Format
			document.getElementById("detailprivbip38").innerHTML = key;
			document.getElementById("detailbip38").style.display = "block";
			qrCode.showQrCode({
				"detailqrcodeprivatebip38": key
			}, 4);
			privateKey.BIP38EncryptedKeyToByteArrayAsync(key, passphrase, function (btcKeyOrError) {
				document.getElementById("busyblock").className = "";
				if (btcKeyOrError.message) {
					alert(btcKeyOrError.message);
					detail.clear();
				} else {
					detail.populateKeyDetails(new Bitcoin.ECKey(btcKeyOrError));
				}
			});
		},

		encryptBip38: function () {
			detail.clear();
			var key = detail.getKeyFromInput();
			if (key == "") {
				return;
			}
			if (privateKey.isBIP38Format(key)) {
				return;
			}
			detail.checkAndShowMini(key);
			detail.checkAndShowBase6(key);
			var btcKey = detail.keyToECKeyWithBrain(key);
			if (btcKey.priv == null) {
				return;
			}
			var detailEncryptCheckbox = document.getElementById("detailbip38checkbox");
			if (detailEncryptCheckbox.checked == true) {
				document.getElementById("detailbip38commands").style.display = "block";
				var passphrase = document.getElementById("detailprivkeypassphrase").value.toString()
				if (passphrase == "") {
					alert(translator.get("bip38alertpassphraserequired"));
					return;
				}
				document.getElementById("busyblock").className = "busy";
				privateKey.BIP38PrivateKeyToEncryptedKeyAsync(btcKey.getBitcoinWalletImportFormat(), passphrase, btcKey.compressed, function (encryptedKey) {
					qrCode.showQrCode({
						"detailqrcodeprivatebip38": encryptedKey
					}, 4);
					// show Private Key BIP38 Format
					document.getElementById("detailprivbip38").innerHTML = encryptedKey;
					document.getElementById("detailbip38").style.display = "block";
					document.getElementById("busyblock").className = "";
				});
				detail.populateKeyDetails(btcKey);
			}
		},

		viewDetails: function () {
			detail.clear();
			document.getElementById("detailbip38checkbox").checked = false;
			var key = detail.getKeyFromInput();
			if (key == "") {
				return;
			}
			if (privateKey.isBIP38Format(key)) {
				document.getElementById("detailbip38commands").style.display = "block";
				document.getElementById("detailprivkeypassphrase").focus();
				return;
			}
			document.getElementById("detailbip38commands").style.display = "none";
			detail.checkAndShowMini(key);
			detail.checkAndShowBase6(key);
			var btcKey = detail.keyToECKeyWithBrain(key);
			if(btcKey.priv == null){
				return;
			}
			detail.populateKeyDetails(btcKey);
		},

		populateKeyDetails: function (btcKey) {
			if (btcKey.priv != null) {
				var originalCompression = btcKey.compressed;

				// Uncompressed key
				btcKey.setCompressed(false);
				document.getElementById("detailprivhex").innerHTML = btcKey.toString().toUpperCase();
				document.getElementById("detailprivb64").innerHTML = btcKey.toString("base64");
				var bitcoinAddress = btcKey.getBitcoinAddress();
				var wif = btcKey.getBitcoinWalletImportFormat();
				document.getElementById("detailpubkey").innerHTML = btcKey.getPubKeyHex();
				document.getElementById("detailaddress").innerHTML = bitcoinAddress;
				document.getElementById("detailprivwif").innerHTML = wif;

				// Compressed key
				btcKey.setCompressed(true);
				var bitcoinAddressComp = btcKey.getBitcoinAddress();
				var wifComp = btcKey.getBitcoinWalletImportFormat();
				document.getElementById("detailpubkeycomp").innerHTML = btcKey.getPubKeyHex();
				document.getElementById("detailaddresscomp").innerHTML = bitcoinAddressComp;
				document.getElementById("detailprivwifcomp").innerHTML = wifComp;

				// SegWit / Taproot addresses (all require compressed key)
				var p2shAddress = btcKey.getP2SHAddress();
				var segwitAddress = btcKey.getSegwitAddress();
				var taprootAddress = btcKey.getTaprootAddress();
				document.getElementById("detailaddressP2SH").innerHTML = p2shAddress;
				document.getElementById("detailaddressSegwit").innerHTML = segwitAddress;
				document.getElementById("detailaddressTaproot").innerHTML = taprootAddress;

				btcKey.setCompressed(originalCompression);
				var pool1 = new Bitcoin.ECKey(wif);
				var pool2 = new Bitcoin.ECKey(wifComp);

				qrCode.showQrCode({
					"detailqrcodepublic": bitcoinAddress,
					"detailqrcodepubliccomp": bitcoinAddressComp,
					"detailqrcodepublicP2SH": p2shAddress,
					"detailqrcodepublicSegwit": segwitAddress,
					"detailqrcodepublicTaproot": taprootAddress,
					"detailqrcodeprivate": wif,
					"detailqrcodeprivatecomp": wifComp
				}, 4);
			}
		},

		clear: function () {
			var key = detail.getKeyFromInput();
			if (privateKey.isBIP38Format(key)) {
				document.getElementById("detailbip38commands").style.display = "block";
				document.getElementById("detailbip38toggle").style.display = "none";
				document.getElementById("detailbip38decryptspan").style.display = "inline-block";
				document.getElementById("detailbip38encryptspan").style.display = "none";
				document.getElementById("detailbip38checkbox").checked = false;
			}
			else {
				document.getElementById("detailbip38toggle").style.display = "block";
				if (document.getElementById("detailbip38checkbox").checked) {
					document.getElementById("detailbip38commands").style.display = "block";
					document.getElementById("detailbip38decryptspan").style.display = "none";
					document.getElementById("detailbip38encryptspan").style.display = "inline-block";
				}
				else {
					document.getElementById("detailbip38commands").style.display = "none";
					document.getElementById("detailbip38decryptspan").style.display = "inline-block";
					document.getElementById("detailbip38encryptspan").style.display = "none";
				}
			}
			document.getElementById("detailpubkey").innerHTML = "";
			document.getElementById("detailpubkeycomp").innerHTML = "";
			document.getElementById("detailaddress").innerHTML = "";
			document.getElementById("detailaddresscomp").innerHTML = "";
			document.getElementById("detailaddressP2SH").innerHTML = "";
			document.getElementById("detailaddressSegwit").innerHTML = "";
			document.getElementById("detailaddressTaproot").innerHTML = "";
			document.getElementById("detailprivwif").innerHTML = "";
			document.getElementById("detailprivwifcomp").innerHTML = "";
			document.getElementById("detailprivhex").innerHTML = "";
			document.getElementById("detailprivb64").innerHTML = "";
			document.getElementById("detailprivb6").innerHTML = "";
			document.getElementById("detailprivmini").innerHTML = "";
			document.getElementById("detailprivbip38").innerHTML = "";
			document.getElementById("detailqrcodepublic").innerHTML = "";
			document.getElementById("detailqrcodepubliccomp").innerHTML = "";
			document.getElementById("detailqrcodepublicP2SH").innerHTML = "";
			document.getElementById("detailqrcodepublicSegwit").innerHTML = "";
			document.getElementById("detailqrcodepublicTaproot").innerHTML = "";
			document.getElementById("detailqrcodeprivate").innerHTML = "";
			document.getElementById("detailqrcodeprivatecomp").innerHTML = "";
			document.getElementById("detailb6").style.display = "none";
			document.getElementById("detailmini").style.display = "none";
			document.getElementById("detailbip38").style.display = "none";
		},

		enterOnPassphrase: function () {
			var detailEncryptCheckbox = document.getElementById("detailbip38checkbox");
			if (detailEncryptCheckbox.checked) {
				detail.encryptBip38();
			}
			else {
				detail.decryptBip38();
			}
		},

		toggleEncrypt: function (element) {
			// enable/disable passphrase textbox
			var bip38CommandDisplay = document.getElementById("detailbip38commands").style.display;
			var key = detail.getKeyFromInput();

			if (element.checked == true) {
				if (privateKey.isBIP38Format(key)) {
					document.getElementById("detailbip38toggle").style.display = "none";
					document.getElementById("detailbip38commands").style.display = "block";
					document.getElementById("detailprivkeypassphrase").focus();
					return;
				}
				else {
					// show encrypt button
					document.getElementById("detailbip38commands").style.display = "block";
					document.getElementById("detailprivkeypassphrase").focus();
					document.getElementById("detailbip38decryptspan").style.display = "none";
					document.getElementById("detailbip38encryptspan").style.display = "inline-block";
				}
			}
			else {
				// show decrypt button
				document.getElementById("detailbip38decryptspan").style.display = "inline-block";
				document.getElementById("detailbip38encryptspan").style.display = "none";
				document.getElementById("detailbip38commands").style.display = "none";
			}
		}
	};
})(ninja.wallets, ninja.qrCode, ninja.privateKey, ninja.translator);