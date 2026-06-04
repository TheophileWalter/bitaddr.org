(function (wallets, qrCode) {
	var _key = null;

	// Push a single (address, wif) entry to the key pool.
	// addr is used for deduplication: the same address will not be added twice,
	// but switching to a different type logs a new entry with the same WIF.
	// wif is captured by value so older entries survive a subsequent key generation.
	function _addToPool(addr, wif) {
		Bitcoin.KeyPool.push({
			priv: _key.priv,                       // non-null so push() accepts the item
			getBitcoinAddress: function () { return addr; },
			toString:          function () { return wif; }
		});
	}

	var single = wallets.singlewallet = {
		isOpen: function () {
			return (document.getElementById("singlewallet").className.indexOf("selected") != -1);
		},

		open: function () {
			if (!_key) {
				single.generateNewAddressAndKey();
			}
			document.getElementById("singlearea").style.display = "block";
		},

		close: function () {
			document.getElementById("singlearea").style.display = "none";
		},

		// Derive only the requested type, display it, and log it to the pool.
		// The other three types are never computed unless the user selects them.
		showAddressType: function (type) {
			if (!_key) return;
			var addr = "";
			if (type === "legacy")  addr = _key.getBitcoinAddress();
			if (type === "p2sh")    addr = _key.getP2SHAddress();
			if (type === "segwit")  addr = _key.getSegwitAddress();
			if (type === "taproot") addr = _key.getTaprootAddress();
			document.getElementById("btcaddress_single").innerHTML = addr;
			if (addr) {
				qrCode.showQrCode({ "qrcode_public_single": addr }, 4);
				_addToPool(addr, _key.getBitcoinWalletImportFormat());
			}
		},

		generateNewAddressAndKey: function () {
			try {
				_key = new Bitcoin.ECKey(false);
				_key.setCompressed(true);

				// The ECKey constructor auto-pushes a legacy entry. Remove it so the
				// pool only contains entries we add explicitly (one per derived type).
				var arr = Bitcoin.KeyPool.getArray();
				arr.pop();
				Bitcoin.KeyPool.setArray(arr);

				document.getElementById("btcprivwif").innerHTML = _key.getBitcoinWalletImportFormat();
				qrCode.showQrCode({ "qrcode_private": _key.getBitcoinWalletImportFormat() }, 4);

				var sel = document.getElementById("singleaddrtype");
				single.showAddressType(sel ? sel.value : "segwit");
			}
			catch (e) {
				alert(e);
				_key = null;
				document.getElementById("btcaddress_single").innerHTML = "error";
				document.getElementById("btcprivwif").innerHTML = "error";
				document.getElementById("qrcode_public_single").innerHTML = "";
				document.getElementById("qrcode_private").innerHTML = "";
			}
		}
	};
})(ninja.wallets, ninja.qrCode);
