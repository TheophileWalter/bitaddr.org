ninja.wallets.brainwallet = {
    isOpen: function () {
        return (document.getElementById("brainwallet").className.indexOf("selected") != -1);
    },

	open: function () {
		document.getElementById("brainarea").style.display = "block";
		document.getElementById("brainpassphrase").focus();
		document.getElementById("brainwarning").innerHTML = ninja.translator.get("brainalertpassphrasewarning");
	},

	close: function () {
		document.getElementById("brainarea").style.display = "none";
	},

	minPassphraseLength: 15,

	// Return address using the selected address type; SegWit/Taproot always use compressed key
	getAddress: function (btcKey) {
		var type = document.getElementById("brainaddrtype").value;
		btcKey.setAddressType(type);
		switch (type) {
			case "p2sh":    btcKey.setCompressed(true); return btcKey.getP2SHAddress();
			case "segwit":  btcKey.setCompressed(true); return btcKey.getSegwitAddress();
			case "taproot": btcKey.setCompressed(true); return btcKey.getTaprootAddress();
			default:        return btcKey.getBitcoinAddress();
		}
	},

	// When address type changes, sync the compressed checkbox state
	onAddressTypeChange: function (element) {
		var isLegacy = (element.value === "legacy");
		var compCheckbox = document.getElementById("braincompressed");
		if (!isLegacy) {
			compCheckbox.checked = true;
			compCheckbox.disabled = true;
		} else {
			compCheckbox.disabled = false;
		}
	},

	// When the compressed checkbox changes, reset address type to legacy if uncompressed
	onCompressionChange: function (element) {
		if (!element.checked) {
			document.getElementById("brainaddrtype").value = "legacy";
			document.getElementById("brainaddrtype").disabled = false;
		}
	},

	view: function () {
		var key = document.getElementById("brainpassphrase").value.toString()
		document.getElementById("brainpassphrase").value = key;
		var keyConfirm = document.getElementById("brainpassphraseconfirm").value.toString()
		document.getElementById("brainpassphraseconfirm").value = keyConfirm;

		if (key == keyConfirm || document.getElementById("brainpassphraseshow").checked) {
			// enforce a minimum passphrase length
			if (key.length >= ninja.wallets.brainwallet.minPassphraseLength) {
				var bytes = Crypto.SHA256(key, { asBytes: true });
				var btcKey = new Bitcoin.ECKey(bytes);
				var isCompressed = document.getElementById("braincompressed").checked;
				btcKey.setCompressed(isCompressed);
				var bitcoinAddress = ninja.wallets.brainwallet.getAddress(btcKey);
				var privWif = btcKey.getBitcoinWalletImportFormat();
				document.getElementById("brainbtcaddress").innerHTML = bitcoinAddress;
				document.getElementById("brainbtcprivwif").innerHTML = privWif;
				ninja.qrCode.showQrCode({
					"brainqrcodepublic": bitcoinAddress,
					"brainqrcodeprivate": privWif
				});
				document.getElementById("brainkeyarea").style.visibility = "visible";
			}
			else {
				alert(ninja.translator.get("brainalertpassphrasetooshort") + ninja.translator.get("brainalertpassphrasewarning"));
				ninja.wallets.brainwallet.clear();
			}
		}
		else {
			alert(ninja.translator.get("brainalertpassphrasedoesnotmatch"));
			ninja.wallets.brainwallet.clear();
		}
	},

	clear: function () {
		document.getElementById("brainkeyarea").style.visibility = "hidden";
	},

	showToggle: function (element) {
		if (element.checked) {
			document.getElementById("brainpassphrase").setAttribute("type", "text");
			document.getElementById("brainpassphraseconfirm").style.display = "none";
			document.getElementById("brainlabelconfirm").style.display = "none";
		}
		else {
			document.getElementById("brainpassphrase").setAttribute("type", "password");
			document.getElementById("brainpassphraseconfirm").style.display = "";
			document.getElementById("brainlabelconfirm").style.display = "";
		}
	}
};