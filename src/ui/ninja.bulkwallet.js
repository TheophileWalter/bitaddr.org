(function (wallets, translator, privateKey) {
	var bulk = wallets.bulkwallet = {
		isOpen: function () {
		    return (document.getElementById("bulkwallet").className.indexOf("selected") != -1);
		},

		open: function () {
			document.getElementById("bulkarea").style.display = "block";
			// show a default CSV list if the text area is empty
			if (document.getElementById("bulktextarea").value == "") {
				// return control of the thread to the browser to render the tab switch UI then build a default CSV list
				setTimeout(function () { bulk.buildCSV(3, 1, document.getElementById("bulkcompressed").checked); }, 200);
			}

			document.getElementById("bulkpassphrase").disabled = !document.getElementById("bulkencrypt").checked;
		},

		close: function () {
			document.getElementById("bulkarea").style.display = "none";
		},

		// use this function to bulk generate addresses
		// rowLimit: number of Bitcoin Addresses to generate
		// startIndex: add this number to the row index for output purposes
		// returns:
		// index,bitcoinAddress,privateKeyWif
		buildCSV: function (rowLimit, startIndex, compressedAddrs, passphrase) {
			document.getElementById("bulktextarea").value = translator.get("bulkgeneratingaddresses") + rowLimit;
			document.getElementById("bulkprintcontent").textContent = "";
			bulk.csv = [];
			bulk.csvRowLimit = rowLimit;
			bulk.csvRowsRemaining = rowLimit;
			bulk.csvStartIndex = --startIndex;
			bulk.compressedAddrs = !!compressedAddrs;
			if (bulk.encrypt) {
				if (passphrase == "") {
					alert(translator.get("bip38alertpassphraserequired"));
					return;
				}
				document.getElementById("busyblock").className = "busy";
				privateKey.BIP38GenerateIntermediatePointAsync(passphrase, null, null, function (intermediate) {
					bulk.intermediatePoint = intermediate;
					document.getElementById("busyblock").className = "";
					setTimeout(bulk.batchCSV, 0);
				});
			}
			else {
				setTimeout(bulk.batchCSV, 0);
			}
		},

		csv: [],
		csvRowsRemaining: null, // use to keep track of how many rows are left to process when building a large CSV array
		csvRowLimit: 0,
		csvStartIndex: 0,

		batchCSV: function () {
			if (bulk.csvRowsRemaining > 0) {
				bulk.csvRowsRemaining--;

				if (bulk.encrypt) {
					privateKey.BIP38GenerateECAddressAsync(bulk.intermediatePoint, bulk.compressedAddrs, function (address, encryptedKey) {
						Bitcoin.KeyPool.push(new Bitcoin.Bip38Key(address, encryptedKey));

						bulk.csv.push((bulk.csvRowLimit - bulk.csvRowsRemaining + bulk.csvStartIndex)
										+ ",\"" + address + "\",\"" + encryptedKey
										+ "\"");
						document.getElementById("bulktextarea").value = translator.get("bulkgeneratingaddresses") + bulk.csvRowsRemaining;

						// release thread to browser to render UI
						setTimeout(bulk.batchCSV, 0);
						
					});
				}
				else {
					var key = new Bitcoin.ECKey(false);
					var address = bulk.getAddress(key);
					bulk.csv.push((bulk.csvRowLimit - bulk.csvRowsRemaining + bulk.csvStartIndex)
										+ ",\"" + address + "\",\"" + key.toString("wif")
										//+	"\",\"" + key.toString("wifcomp")    // uncomment these lines to add different private key formats to the CSV
										//+ "\",\"" + key.getBitcoinHexFormat()
										//+ "\",\"" + key.toString("base64")
										+ "\"");
					document.getElementById("bulktextarea").value = translator.get("bulkgeneratingaddresses") + bulk.csvRowsRemaining;

					// release thread to browser to render UI
					setTimeout(bulk.batchCSV, 0);
				}
			}
			// processing is finished so put CSV in text area
			else if (bulk.csvRowsRemaining === 0) {
				var csvText = bulk.csv.join("\n");
				document.getElementById("bulktextarea").value = csvText;
				document.getElementById("bulkprintcontent").textContent = csvText;
			}
		},

		openCloseFaq: function (faqNum) {
			// do close
			if (document.getElementById("bulka" + faqNum).style.display == "block") {
				document.getElementById("bulka" + faqNum).style.display = "none";
				document.getElementById("bulke" + faqNum).setAttribute("class", "more");
			}
			// do open
			else {
				document.getElementById("bulka" + faqNum).style.display = "block";
				document.getElementById("bulke" + faqNum).setAttribute("class", "less");
			}
		},

		// Return the address for a key using the selected address type
		getAddress: function (key) {
			var type = document.getElementById("bulkaddrtype").value;
			key.setAddressType(type);
			switch (type) {
				case "p2sh":    key.setCompressed(true); return key.getP2SHAddress();
				case "segwit":  key.setCompressed(true); return key.getSegwitAddress();
				case "taproot": key.setCompressed(true); return key.getTaprootAddress();
				default:        key.setCompressed(bulk.compressedAddrs); return key.getBitcoinAddress();
			}
		},

		// Called when the address type <select> changes
		onAddressTypeChange: function (element) {
			var isLegacy = (element.value === "legacy");
			var encryptCheckbox = document.getElementById("bulkencrypt");
			var compressedCheckbox = document.getElementById("bulkcompressed");
			// BIP38 only supports legacy addresses
			if (!isLegacy && encryptCheckbox.checked) {
				encryptCheckbox.checked = false;
				document.getElementById("bulkpassphrase").disabled = true;
				bulk.encrypt = false;
			}
			encryptCheckbox.disabled = !isLegacy;
			// Compressed option is only meaningful for legacy P2PKH
			compressedCheckbox.disabled = !isLegacy;
		},

		toggleEncrypt: function (element) {
			// enable/disable passphrase textbox
			document.getElementById("bulkpassphrase").disabled = !element.checked;
			bulk.encrypt = element.checked;
			if (element.checked) {
				// Force legacy address type — BIP38 requires it
				document.getElementById("bulkaddrtype").value = "legacy";
				document.getElementById("bulkaddrtype").disabled = true;
				document.getElementById("bulkcompressed").disabled = false;
			} else {
				document.getElementById("bulkaddrtype").disabled = false;
			}
		}
	};
})(ninja.wallets, ninja.translator, ninja.privateKey);