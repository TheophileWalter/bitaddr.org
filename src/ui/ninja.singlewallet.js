(function (wallets, qrCode) {
	var single = wallets.singlewallet = {
		isOpen: function () {
			return (document.getElementById("singlewallet").className.indexOf("selected") != -1);
		},

		open: function () {
			if (document.getElementById("btcaddress").innerHTML == "") {
				single.generateNewAddressAndKey();
			}
			document.getElementById("singlearea").style.display = "block";
		},

		close: function () {
			document.getElementById("singlearea").style.display = "none";
		},

		// Generate a key pair and display all supported address formats
		generateNewAddressAndKey: function () {
			try {
				var key = new Bitcoin.ECKey(false);
				key.setCompressed(true);
				key.logAllAddressTypes = true;
				// Re-sync the textarea now that logAllAddressTypes is set
				var ta = document.getElementById("keypooltextarea");
				if (ta) ta.value = Bitcoin.KeyPool.toString();

				// Legacy P2PKH (1...)
				var legacyAddress = key.getBitcoinAddress();
				// P2SH-P2WPKH (3...)
				var p2shAddress = key.getP2SHAddress();
				// Native SegWit P2WPKH (bc1q...)
				var segwitAddress = key.getSegwitAddress();
				// Taproot P2TR (bc1p...)
				var taprootAddress = key.getTaprootAddress();
				// Private key (WIF compressed)
				var privateKeyWif = key.getBitcoinWalletImportFormat();

				document.getElementById("btcaddress").innerHTML = legacyAddress;
				document.getElementById("btcaddressP2SH").innerHTML = p2shAddress;
				document.getElementById("btcaddressSegwit").innerHTML = segwitAddress;
				document.getElementById("btcaddressTaproot").innerHTML = taprootAddress;
				document.getElementById("btcprivwif").innerHTML = privateKeyWif;

				// Public addresses: smaller modules (3) to fit 4 QR codes neatly
				qrCode.showQrCode({
					"qrcode_public": legacyAddress,
					"qrcode_public_p2sh": p2shAddress,
					"qrcode_public_segwit": segwitAddress,
					"qrcode_public_taproot": taprootAddress
				}, 3);
				// Private key: larger modules (4) for easier scanning
				qrCode.showQrCode({ "qrcode_private": privateKeyWif }, 4);
			}
			catch (e) {
				alert(e);
				["btcaddress","btcaddressP2SH","btcaddressSegwit","btcaddressTaproot","btcprivwif"].forEach(function(id) {
					document.getElementById(id).innerHTML = "error";
				});
				["qrcode_public","qrcode_public_p2sh","qrcode_public_segwit","qrcode_public_taproot","qrcode_private"].forEach(function(id) {
					document.getElementById(id).innerHTML = "";
				});
			}
		}
	};
})(ninja.wallets, ninja.qrCode);
