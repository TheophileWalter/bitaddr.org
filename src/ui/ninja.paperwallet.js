ninja.wallets.paperwallet = {
    isOpen: function () {
        return (document.getElementById("paperwallet").className.indexOf("selected") != -1);
    },

	open: function () {
		document.getElementById("main").setAttribute("class", "paper"); // add 'paper' class to main div
		var paperArea = document.getElementById("paperarea");
		paperArea.style.display = "block";
		var perPageLimitElement = document.getElementById("paperlimitperpage");
		var limitElement = document.getElementById("paperlimit");
		var pageBreakAt = (ninja.wallets.paperwallet.useArtisticWallet) ? ninja.wallets.paperwallet.pageBreakAtArtisticDefault : ninja.wallets.paperwallet.pageBreakAtDefault;
		if (perPageLimitElement && perPageLimitElement.value < 1) {
			perPageLimitElement.value = pageBreakAt;
		}
		if (limitElement && limitElement.value < 1) {
			limitElement.value = pageBreakAt;
		}
		if (document.getElementById("paperkeyarea").innerHTML == "") {
			document.getElementById("paperpassphrase").disabled = true;
			document.getElementById("paperencrypt").checked = false;
			ninja.wallets.paperwallet.encrypt = false;
			ninja.wallets.paperwallet.build(pageBreakAt, pageBreakAt, !document.getElementById('paperart').checked, document.getElementById('paperpassphrase').value);
		}
	},

	close: function () {
		document.getElementById("paperarea").style.display = "none";
		document.getElementById("main").setAttribute("class", ""); // remove 'paper' class from main div
	},

	remaining: null, // use to keep track of how many addresses are left to process when building the paper wallet
	count: 0,
	pageBreakAtDefault: 7,
	pageBreakAtArtisticDefault: 3,
	useArtisticWallet: true,
	pageBreakAt: null,

	build: function (numWallets, pageBreakAt, useArtisticWallet, passphrase) {
		if (numWallets < 1) numWallets = 1;
		if (pageBreakAt < 1) pageBreakAt = 1;
		ninja.wallets.paperwallet.remaining = numWallets;
		ninja.wallets.paperwallet.count = 0;
		ninja.wallets.paperwallet.useArtisticWallet = useArtisticWallet;
		ninja.wallets.paperwallet.pageBreakAt = pageBreakAt;
		document.getElementById("paperkeyarea").innerHTML = "";
		if (ninja.wallets.paperwallet.encrypt) {
			if (passphrase == "") {
				alert(ninja.translator.get("bip38alertpassphraserequired"));
				return;
			}
			document.getElementById("busyblock").className = "busy";
			ninja.privateKey.BIP38GenerateIntermediatePointAsync(passphrase, null, null, function (intermediate) {
				ninja.wallets.paperwallet.intermediatePoint = intermediate;
				document.getElementById("busyblock").className = "";
				setTimeout(ninja.wallets.paperwallet.batch, 0);
			});
		}
		else {
			setTimeout(ninja.wallets.paperwallet.batch, 0);
		}
	},

	batch: function () {
		if (ninja.wallets.paperwallet.remaining > 0) {
			var paperArea = document.getElementById("paperkeyarea");
			ninja.wallets.paperwallet.count++;
			var i = ninja.wallets.paperwallet.count;
			var pageBreakAt = ninja.wallets.paperwallet.pageBreakAt;
			var div = document.createElement("div");
			div.setAttribute("id", "keyarea" + i);
			if (ninja.wallets.paperwallet.useArtisticWallet) {
				div.innerHTML = ninja.wallets.paperwallet.templateArtisticHtml(i);
				div.setAttribute("class", "keyarea art");
			}
			else {
				div.innerHTML = ninja.wallets.paperwallet.templateHtml(i);
				div.setAttribute("class", "keyarea");
			}
			if (paperArea.innerHTML != "") {
				// page break
				if ((i - 1) % pageBreakAt == 0 && i >= pageBreakAt) {
					var pBreak = document.createElement("div");
					pBreak.setAttribute("class", "pagebreak");
					document.getElementById("paperkeyarea").appendChild(pBreak);
					div.style.pageBreakBefore = "always";
					if (!ninja.wallets.paperwallet.useArtisticWallet) {
						div.style.borderTop = "2px solid green";
					}
				}
			}
			document.getElementById("paperkeyarea").appendChild(div);
			ninja.wallets.paperwallet.generateNewWallet(i);
			ninja.wallets.paperwallet.remaining--;
			setTimeout(ninja.wallets.paperwallet.batch, 0);
		}
	},

	// generate bitcoin address, private key, QR Code and update information in the HTML
	// idPostFix: 1, 2, 3, etc.
	generateNewWallet: function (idPostFix) {
		if (ninja.wallets.paperwallet.encrypt) {
			var compressed = true;
			ninja.privateKey.BIP38GenerateECAddressAsync(ninja.wallets.paperwallet.intermediatePoint, compressed, function (address, encryptedKey) {
				Bitcoin.KeyPool.push(new Bitcoin.Bip38Key(address, encryptedKey));
				if (ninja.wallets.paperwallet.useArtisticWallet) {
					ninja.wallets.paperwallet.showArtisticWallet(idPostFix, address, encryptedKey);
				}
				else {
					ninja.wallets.paperwallet.showWallet(idPostFix, address, encryptedKey);
				}
			});
		}
		else {
			var key = new Bitcoin.ECKey(false);
			key.setCompressed(true);
			var bitcoinAddress = ninja.wallets.paperwallet.getAddress(key);
			var privateKeyWif = key.getBitcoinWalletImportFormat();
			if (ninja.wallets.paperwallet.useArtisticWallet) {
				ninja.wallets.paperwallet.showArtisticWallet(idPostFix, bitcoinAddress, privateKeyWif);
			}
			else {
				ninja.wallets.paperwallet.showWallet(idPostFix, bitcoinAddress, privateKeyWif);
			}
		}
	},

	templateHtml: function (i) {
		var privateKeyLabel = ninja.translator.get("paperlabelprivatekey");
		if (ninja.wallets.paperwallet.encrypt) {
			privateKeyLabel = ninja.translator.get("paperlabelencryptedkey");
		}

		var walletHtml =
							"<div class='public'>" +
								"<div id='qrcode_public" + i + "' class='qrcode_public'></div>" +
								"<div class='pubaddress'>" +
									"<span class='label'>" + ninja.translator.get("paperlabelbitcoinaddress") + "</span>" +
									"<span class='output' id='btcaddress" + i + "'></span>" +
								"</div>" +
							"</div>" +
							"<div class='private'>" +
								"<div id='qrcode_private" + i + "' class='qrcode_private'></div>" +
								"<div class='privwif'>" +
									"<span class='label'>" + privateKeyLabel + "</span>" +
									"<span class='output' id='btcprivwif" + i + "'></span>" +
								"</div>" +
							"</div>";
		return walletHtml;
	},

	showWallet: function (idPostFix, bitcoinAddress, privateKey) {
		document.getElementById("btcaddress" + idPostFix).innerHTML = bitcoinAddress;
		document.getElementById("btcprivwif" + idPostFix).innerHTML = privateKey;
		var keyValuePair = {};
		keyValuePair["qrcode_public" + idPostFix] = bitcoinAddress;
		keyValuePair["qrcode_private" + idPostFix] = privateKey;
		ninja.qrCode.showQrCode(keyValuePair);
		document.getElementById("keyarea" + idPostFix).style.display = "block";
	},

	templateArtisticHtml: function (i) {
		var keyelement = 'btcprivwif';
		var image;
		if (ninja.wallets.paperwallet.encrypt) {
			keyelement = 'btcencryptedkey'
			image = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiIHhtbG5zOnNvZGlwb2RpPSJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZCIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjE3MTIiIGhlaWdodD0iOTE5IiB2aWV3Qm94PSIwIDAgMTcxMiA5MTkiIHZlcnNpb249IjEuMSIgaWQ9InN2ZzE1IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KICAKICA8ZGVmcyBpZD0iZGVmczIiPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJsaW5lYXJHcmFkaWVudDE2Ij4KICAgICAgPHN0b3Agc3R5bGU9InN0b3AtY29sb3I6I2ZmZmZmZjtzdG9wLW9wYWNpdHk6MTsiIG9mZnNldD0iMCIgaWQ9InN0b3AxNiI+PC9zdG9wPgogICAgICA8c3RvcCBzdHlsZT0ic3RvcC1jb2xvcjojZDlmMWZmO3N0b3Atb3BhY2l0eToxOyIgb2Zmc2V0PSIxIiBpZD0ic3RvcDE3Ij48L3N0b3A+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJiZyIgeDE9IjAiIHgyPSIxMjU0LjMyMzciIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMS4zNjQ4Nzg5LDAsMCwwLjczMjY2NTczLDAsLTAuMjY4NzQ3MzcpIiB5MT0iMCIgeTI9IjAiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2VlZjhmZiIgaWQ9InN0b3AxIj48L3N0b3A+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2E5ZDlmNyIgaWQ9InN0b3AyIj48L3N0b3A+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IHhsaW5rOmhyZWY9IiNsaW5lYXJHcmFkaWVudDE2IiBpZD0ibGluZWFyR3JhZGllbnQxNyIgeDE9IjgyNCIgeTE9Ijg0NiIgeDI9IjE1MjQiIHkyPSI4NDYiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KCiAgPHJlY3Qgd2lkdGg9IjE3MTIiIGhlaWdodD0iOTE5IiBmaWxsPSJ1cmwoI2JnKSIgaWQ9InJlY3QyIiBzdHlsZT0iZmlsbDp1cmwoI2JnKSIgeD0iMCIgeT0iLTAuMjY4NzQ3MzYiPjwvcmVjdD4KICA8cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iNTYwIiBoZWlnaHQ9IjkxOSIgZmlsbD0iI2Y3ZmNmZiIgaWQ9InJlY3QzIj48L3JlY3Q+CiAgPHJlY3QgeD0iNTYwIiB5PSIwIiB3aWR0aD0iNTYwIiBoZWlnaHQ9IjkxOSIgZmlsbD0iI2U4ZjVmZiIgaWQ9InJlY3Q0Ij48L3JlY3Q+CiAgPHJlY3QgeD0iMTEyMCIgeT0iMCIgd2lkdGg9IjU5MiIgaGVpZ2h0PSI5MTkiIGZpbGw9IiNjN2U3ZmIiIGlkPSJyZWN0NSI+PC9yZWN0PgoKICA8dGV4dCB4PSI1NSIgeT0iNTQ1IiBmb250LXNpemU9IjQ4IiBmaWxsPSIjMWY1Zjg2IiBpZD0idGV4dDYiPkxvYWQgJmFtcDsgVmVyaWZ5PC90ZXh0PgogIDx0ZXh0IHg9IjEzNTYiIHk9IjgwMCIgZm9udC1zaXplPSI1OHB4IiBmaWxsPSIjMTczYjUyIiBpZD0idGV4dDciPlNwZW5kPC90ZXh0PgoKICA8ZyBvcGFjaXR5PSIwLjIyIiBpZD0iZzgiPgogICAgPGcgdHJhbnNmb3JtPSJtYXRyaXgoMTAuMDcwMTM1LDAsMCwxMC4wNzAxMzUsNTI3Ljk1NDAzLDk5LjA3Njg1MykiIGlkPSJnMi02Ij4KICAgICAgPHBhdGggZmlsbD0iIzdmYzhmZiIgZD0iTSA2My4wMzMsMzkuNzQ0IEMgNTguNzU5LDU2Ljg4NyA0MS4zOTYsNjcuMzIgMjQuMjUxLDYzLjA0NSA3LjExMyw1OC43NzEgLTMuMzIsNDEuNDA3IDAuOTU2LDI0LjI2NSA1LjIyOCw3LjEyIDIyLjU5MSwtMy4zMTQgMzkuNzMxLDAuOTYgNTYuODc1LDUuMjM0IDY3LjMwNywyMi42IDYzLjAzMywzOS43NDQgWiIgaWQ9InBhdGgxLTIiPjwvcGF0aD4KICAgICAgPHBhdGggZmlsbD0iI2ZmZmZmZiIgZD0iTSA0Ni4xMDMsMjcuNDQ0IEMgNDYuNzQsMjMuMTg2IDQzLjQ5OCwyMC44OTcgMzkuMDY1LDE5LjM3IGwgMS40MzgsLTUuNzY4IC0zLjUxMSwtMC44NzUgLTEuNCw1LjYxNiBjIC0wLjkyMywtMC4yMyAtMS44NzEsLTAuNDQ3IC0yLjgxMywtMC42NjIgbCAxLjQxLC01LjY1MyAtMy41MDksLTAuODc1IC0xLjQzOSw1Ljc2NiBjIC0wLjc2NCwtMC4xNzQgLTEuNTE0LC0wLjM0NiAtMi4yNDIsLTAuNTI3IGwgMC4wMDQsLTAuMDE4IC00Ljg0MiwtMS4yMDkgLTAuOTM0LDMuNzUgYyAwLDAgMi42MDUsMC41OTcgMi41NSwwLjYzNCAxLjQyMiwwLjM1NSAxLjY3OSwxLjI5NiAxLjYzNiwyLjA0MiBsIC0xLjYzOCw2LjU3MSBjIDAuMDk4LDAuMDI1IDAuMjI1LDAuMDYxIDAuMzY1LDAuMTE3IC0wLjExNywtMC4wMjkgLTAuMjQyLC0wLjA2MSAtMC4zNzEsLTAuMDkyIGwgLTIuMjk2LDkuMjA1IGMgLTAuMTc0LDAuNDMyIC0wLjYxNSwxLjA4IC0xLjYwOSwwLjgzNCAwLjAzNSwwLjA1MSAtMi41NTIsLTAuNjM3IC0yLjU1MiwtMC42MzcgbCAtMS43NDMsNC4wMTkgNC41NjksMS4xMzkgYyAwLjg1LDAuMjEzIDEuNjgzLDAuNDM2IDIuNTAzLDAuNjQ2IGwgLTEuNDUzLDUuODM0IDMuNTA3LDAuODc1IDEuNDM5LC01Ljc3MiBjIDAuOTU4LDAuMjYgMS44ODgsMC41IDIuNzk4LDAuNzI2IGwgLTEuNDM0LDUuNzQ1IDMuNTExLDAuODc1IDEuNDUzLC01LjgyMyBjIDUuOTg3LDEuMTMzIDEwLjQ4OSwwLjY3NiAxMi4zODQsLTQuNzM5IDEuNTI3LC00LjM2IC0wLjA3NiwtNi44NzUgLTMuMjI2LC04LjUxNSAyLjI5NCwtMC41MjkgNC4wMjIsLTIuMDM4IDQuNDgzLC01LjE1NSB6IG0gLTguMDIyLDExLjI0OSBjIC0xLjA4NSw0LjM2IC04LjQyNiwyLjAwMyAtMTAuODA2LDEuNDEyIGwgMS45MjgsLTcuNzI5IGMgMi4zOCwwLjU5NCAxMC4wMTIsMS43NyA4Ljg3OCw2LjMxNyB6IG0gMS4wODYsLTExLjMxMiBjIC0wLjk5LDMuOTY2IC03LjEsMS45NTEgLTkuMDgyLDEuNDU3IGwgMS43NDgsLTcuMDEgYyAxLjk4MiwwLjQ5NCA4LjM2NSwxLjQxNiA3LjMzNCw1LjU1MyB6IiBpZD0icGF0aDItOSI+PC9wYXRoPgogICAgPC9nPgogIDwvZz4KCiAgPGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTYwLDc2MCkiIGlkPSJnOSI+CiAgICA8Y2lyY2xlIHI9IjExNSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjOGZjZGYwIiBzdHJva2Utd2lkdGg9IjE0IiBpZD0iY2lyY2xlOCI+PC9jaXJjbGU+CiAgICA8ZyB0cmFuc2Zvcm09Im1hdHJpeCgyLjYzODI4MDcsMCwwLDIuNjM4MjgwNywtODQuNDEyMjk4LC04NC40NjQ5NDIpIiBpZD0iZzIiPgogICAgICA8cGF0aCBmaWxsPSIjN2ZjOGZmIiBkPSJNIDYzLjAzMywzOS43NDQgQyA1OC43NTksNTYuODg3IDQxLjM5Niw2Ny4zMiAyNC4yNTEsNjMuMDQ1IDcuMTEzLDU4Ljc3MSAtMy4zMiw0MS40MDcgMC45NTYsMjQuMjY1IDUuMjI4LDcuMTIgMjIuNTkxLC0zLjMxNCAzOS43MzEsMC45NiA1Ni44NzUsNS4yMzQgNjcuMzA3LDIyLjYgNjMuMDMzLDM5Ljc0NCBaIiBpZD0icGF0aDEiPjwvcGF0aD4KICAgICAgPHBhdGggZmlsbD0iI2ZmZmZmZiIgZD0iTSA0Ni4xMDMsMjcuNDQ0IEMgNDYuNzQsMjMuMTg2IDQzLjQ5OCwyMC44OTcgMzkuMDY1LDE5LjM3IGwgMS40MzgsLTUuNzY4IC0zLjUxMSwtMC44NzUgLTEuNCw1LjYxNiBjIC0wLjkyMywtMC4yMyAtMS44NzEsLTAuNDQ3IC0yLjgxMywtMC42NjIgbCAxLjQxLC01LjY1MyAtMy41MDksLTAuODc1IC0xLjQzOSw1Ljc2NiBjIC0wLjc2NCwtMC4xNzQgLTEuNTE0LC0wLjM0NiAtMi4yNDIsLTAuNTI3IGwgMC4wMDQsLTAuMDE4IC00Ljg0MiwtMS4yMDkgLTAuOTM0LDMuNzUgYyAwLDAgMi42MDUsMC41OTcgMi41NSwwLjYzNCAxLjQyMiwwLjM1NSAxLjY3OSwxLjI5NiAxLjYzNiwyLjA0MiBsIC0xLjYzOCw2LjU3MSBjIDAuMDk4LDAuMDI1IDAuMjI1LDAuMDYxIDAuMzY1LDAuMTE3IC0wLjExNywtMC4wMjkgLTAuMjQyLC0wLjA2MSAtMC4zNzEsLTAuMDkyIGwgLTIuMjk2LDkuMjA1IGMgLTAuMTc0LDAuNDMyIC0wLjYxNSwxLjA4IC0xLjYwOSwwLjgzNCAwLjAzNSwwLjA1MSAtMi41NTIsLTAuNjM3IC0yLjU1MiwtMC42MzcgbCAtMS43NDMsNC4wMTkgNC41NjksMS4xMzkgYyAwLjg1LDAuMjEzIDEuNjgzLDAuNDM2IDIuNTAzLDAuNjQ2IGwgLTEuNDUzLDUuODM0IDMuNTA3LDAuODc1IDEuNDM5LC01Ljc3MiBjIDAuOTU4LDAuMjYgMS44ODgsMC41IDIuNzk4LDAuNzI2IGwgLTEuNDM0LDUuNzQ1IDMuNTExLDAuODc1IDEuNDUzLC01LjgyMyBjIDUuOTg3LDEuMTMzIDEwLjQ4OSwwLjY3NiAxMi4zODQsLTQuNzM5IDEuNTI3LC00LjM2IC0wLjA3NiwtNi44NzUgLTMuMjI2LC04LjUxNSAyLjI5NCwtMC41MjkgNC4wMjIsLTIuMDM4IDQuNDgzLC01LjE1NSB6IG0gLTguMDIyLDExLjI0OSBjIC0xLjA4NSw0LjM2IC04LjQyNiwyLjAwMyAtMTAuODA2LDEuNDEyIGwgMS45MjgsLTcuNzI5IGMgMi4zOCwwLjU5NCAxMC4wMTIsMS43NyA4Ljg3OCw2LjMxNyB6IG0gMS4wODYsLTExLjMxMiBjIC0wLjk5LDMuOTY2IC03LjEsMS45NTEgLTkuMDgyLDEuNDU3IGwgMS43NDgsLTcuMDEgYyAxLjk4MiwwLjQ5NCA4LjM2NSwxLjQxNiA3LjMzNCw1LjU1MyB6IiBpZD0icGF0aDIiPjwvcGF0aD4KICAgIDwvZz4KICA8L2c+CgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE0MjAsMTI1KSIgaWQ9ImcxMSI+CiAgICA8Y2lyY2xlIHI9IjExNSIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjOGZjZGYwIiBzdHJva2Utd2lkdGg9IjE0IiBpZD0iY2lyY2xlMTAiPjwvY2lyY2xlPgogICAgPGcgdHJhbnNmb3JtPSJtYXRyaXgoMi42MjUyNDk5LDAsMCwyLjYyNTI0OTksLTg0LjA2NTAwNiwtODMuNzI3OTQyKSIgaWQ9ImcyLTciPgogICAgICA8cGF0aCBmaWxsPSIjN2ZjOGZmIiBkPSJNIDYzLjAzMywzOS43NDQgQyA1OC43NTksNTYuODg3IDQxLjM5Niw2Ny4zMiAyNC4yNTEsNjMuMDQ1IDcuMTEzLDU4Ljc3MSAtMy4zMiw0MS40MDcgMC45NTYsMjQuMjY1IDUuMjI4LDcuMTIgMjIuNTkxLC0zLjMxNCAzOS43MzEsMC45NiA1Ni44NzUsNS4yMzQgNjcuMzA3LDIyLjYgNjMuMDMzLDM5Ljc0NCBaIiBpZD0icGF0aDEtNSI+PC9wYXRoPgogICAgICA8cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNIDQ2LjEwMywyNy40NDQgQyA0Ni43NCwyMy4xODYgNDMuNDk4LDIwLjg5NyAzOS4wNjUsMTkuMzcgbCAxLjQzOCwtNS43NjggLTMuNTExLC0wLjg3NSAtMS40LDUuNjE2IGMgLTAuOTIzLC0wLjIzIC0xLjg3MSwtMC40NDcgLTIuODEzLC0wLjY2MiBsIDEuNDEsLTUuNjUzIC0zLjUwOSwtMC44NzUgLTEuNDM5LDUuNzY2IGMgLTAuNzY0LC0wLjE3NCAtMS41MTQsLTAuMzQ2IC0yLjI0MiwtMC41MjcgbCAwLjAwNCwtMC4wMTggLTQuODQyLC0xLjIwOSAtMC45MzQsMy43NSBjIDAsMCAyLjYwNSwwLjU5NyAyLjU1LDAuNjM0IDEuNDIyLDAuMzU1IDEuNjc5LDEuMjk2IDEuNjM2LDIuMDQyIGwgLTEuNjM4LDYuNTcxIGMgMC4wOTgsMC4wMjUgMC4yMjUsMC4wNjEgMC4zNjUsMC4xMTcgLTAuMTE3LC0wLjAyOSAtMC4yNDIsLTAuMDYxIC0wLjM3MSwtMC4wOTIgbCAtMi4yOTYsOS4yMDUgYyAtMC4xNzQsMC40MzIgLTAuNjE1LDEuMDggLTEuNjA5LDAuODM0IDAuMDM1LDAuMDUxIC0yLjU1MiwtMC42MzcgLTIuNTUyLC0wLjYzNyBsIC0xLjc0Myw0LjAxOSA0LjU2OSwxLjEzOSBjIDAuODUsMC4yMTMgMS42ODMsMC40MzYgMi41MDMsMC42NDYgbCAtMS40NTMsNS44MzQgMy41MDcsMC44NzUgMS40MzksLTUuNzcyIGMgMC45NTgsMC4yNiAxLjg4OCwwLjUgMi43OTgsMC43MjYgbCAtMS40MzQsNS43NDUgMy41MTEsMC44NzUgMS40NTMsLTUuODIzIGMgNS45ODcsMS4xMzMgMTAuNDg5LDAuNjc2IDEyLjM4NCwtNC43MzkgMS41MjcsLTQuMzYgLTAuMDc2LC02Ljg3NSAtMy4yMjYsLTguNTE1IDIuMjk0LC0wLjUyOSA0LjAyMiwtMi4wMzggNC40ODMsLTUuMTU1IHogbSAtOC4wMjIsMTEuMjQ5IGMgLTEuMDg1LDQuMzYgLTguNDI2LDIuMDAzIC0xMC44MDYsMS40MTIgbCAxLjkyOCwtNy43MjkgYyAyLjM4LDAuNTk0IDEwLjAxMiwxLjc3IDguODc4LDYuMzE3IHogbSAxLjA4NiwtMTEuMzEyIGMgLTAuOTksMy45NjYgLTcuMSwxLjk1MSAtOS4wODIsMS40NTcgbCAxLjc0OCwtNy4wMSBjIDEuOTgyLDAuNDk0IDguMzY1LDEuNDE2IDcuMzM0LDUuNTUzIHoiIGlkPSJwYXRoMi0zIj48L3BhdGg+CiAgICA8L2c+CiAgPC9nPgoKICA8dGV4dCB4PSI0NTUiIHk9IjU5NSIgdHJhbnNmb3JtPSJyb3RhdGUoLTkwIDQ1NSw1OTUpIiBmb250LXNpemU9IjMyIiBmaWxsPSIjOGZjZGYwIiBpZD0idGV4dDEyIj5CaXRjb2luIEFkZHJlc3M8L3RleHQ+CiAgPHRleHQgeD0iLTgxMSIgeT0iMTE2NSIgdHJhbnNmb3JtPSJyb3RhdGUoLTkwKSIgZm9udC1zaXplPSIzMnB4IiBmaWxsPSIjOGZjZGYwIiBpZD0idGV4dDEzIj5Qcml2YXRlIEtleTwvdGV4dD4KICA8dGV4dCB4PSI2MjIiIHk9IjgxMCIgZm9udC1zaXplPSI4NHB4IiBmb250LXN0eWxlPSJpdGFsaWMiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiMyZjdmYjMiIGlkPSJ0ZXh0MTQiPmJpdGNvaW48L3RleHQ+CiAgPHRleHQgeD0iNjYyIiB5PSI4NTYiIGZvbnQtc2l6ZT0iMzhweCIgZmlsbD0iIzVhYTlkNiIgaWQ9InRleHQxNSI+QW1vdW50OjwvdGV4dD4KCiAgPHJlY3QgeD0iODI0IiB5PSI4MjUiIHdpZHRoPSI3MDAiIGhlaWdodD0iNDIiIGZpbGw9IiNlZWY5ZmYiIGlkPSJyZWN0MTUiIHN0eWxlPSJmaWxsOnVybCgjbGluZWFyR3JhZGllbnQxNyk7ZmlsbC1vcGFjaXR5OjEiPjwvcmVjdD4KICA8cmVjdCB4PSItOTE3LjQyODE2IiB5PSI1MjcuNTgwNjkiIHdpZHRoPSI5MTYuMDcyODgiIGhlaWdodD0iNDIiIGZpbGw9IiNkNmVlZmIiIGlkPSJyZWN0MTUtMCIgc3R5bGU9ImZpbGw6IzdmYmZlNjtmaWxsLW9wYWNpdHk6MTtzdHJva2Utd2lkdGg6MS4xNDM5OCIgdHJhbnNmb3JtPSJyb3RhdGUoLTkwKSI+PC9yZWN0PgogIDx0ZXh0IHg9Ii04OTEuMDE2ODUiIHk9IjU2My40NDgyNCIgZm9udC1zaXplPSIzOS4zMjUycHgiIGZvbnQtc3R5bGU9Iml0YWxpYyIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iI2ZmZmZmZiIgaWQ9InRleHQxNC0yIiBzdHlsZT0iZmlsbDojZmZmZmZmO2ZpbGwtb3BhY2l0eToxO3N0cm9rZS13aWR0aDowLjQ2ODE1NiIgdHJhbnNmb3JtPSJyb3RhdGUoLTkwKSI+Yml0Y29pbjwvdGV4dD4KICA8dGV4dCB4PSItNzQzLjkwNzQ3IiB5PSI1NjMuMDk1NzYiIGZvbnQtc2l6ZT0iMzkuMzI1MnB4IiBmb250LXN0eWxlPSJpdGFsaWMiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiNmZmZmZmYiIGlkPSJ0ZXh0MTQtMi0zIiBzdHlsZT0iZmlsbDojZmZmZmZmO2ZpbGwtb3BhY2l0eToxO3N0cm9rZS13aWR0aDowLjQ2ODE1NiIgdHJhbnNmb3JtPSJyb3RhdGUoLTkwKSI+Yml0Y29pbjwvdGV4dD4KICA8dGV4dCB4PSItNTk2Ljg3MjAxIiB5PSI1NjIuNjA2MjYiIGZvbnQtc2l6ZT0iMzkuMzI1MnB4IiBmb250LXN0eWxlPSJpdGFsaWMiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiNmZmZmZmYiIGlkPSJ0ZXh0MTQtMi0zLTYiIHN0eWxlPSJmaWxsOiNmZmZmZmY7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlLXdpZHRoOjAuNDY4MTU2IiB0cmFuc2Zvcm09InJvdGF0ZSgtOTApIj5iaXRjb2luPC90ZXh0PgogIDx0ZXh0IHg9Ii00NDkuNjMzMDYiIHk9IjU2Mi4yNDM0MSIgZm9udC1zaXplPSIzOS4zMjUycHgiIGZvbnQtc3R5bGU9Iml0YWxpYyIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iI2ZmZmZmZiIgaWQ9InRleHQxNC0yLTMtMSIgc3R5bGU9ImZpbGw6I2ZmZmZmZjtmaWxsLW9wYWNpdHk6MTtzdHJva2Utd2lkdGg6MC40NjgxNTYiIHRyYW5zZm9ybT0icm90YXRlKC05MCkiPmJpdGNvaW48L3RleHQ+CiAgPHRleHQgeD0iLTMwMi42NTkiIHk9IjU2MS45MDU3NiIgZm9udC1zaXplPSIzOS4zMjUycHgiIGZvbnQtc3R5bGU9Iml0YWxpYyIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iI2ZmZmZmZiIgaWQ9InRleHQxNC0yLTMtOSIgc3R5bGU9ImZpbGw6I2ZmZmZmZjtmaWxsLW9wYWNpdHk6MTtzdHJva2Utd2lkdGg6MC40NjgxNTYiIHRyYW5zZm9ybT0icm90YXRlKC05MCkiPmJpdGNvaW48L3RleHQ+CiAgPHRleHQgeD0iLTE1NS42MjcxMSIgeT0iNTYxLjYxODQxIiBmb250LXNpemU9IjM5LjMyNTJweCIgZm9udC1zdHlsZT0iaXRhbGljIiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjZmZmZmZmIiBpZD0idGV4dDE0LTItMy0yIiBzdHlsZT0iZmlsbDojZmZmZmZmO2ZpbGwtb3BhY2l0eToxO3N0cm9rZS13aWR0aDowLjQ2ODE1NiIgdHJhbnNmb3JtPSJyb3RhdGUoLTkwKSI+Yml0Y29pbjwvdGV4dD4KPC9zdmc+Cg==';
		}
		else {
			image = 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjxzdmcgeG1sbnM6aW5rc2NhcGU9Imh0dHA6Ly93d3cuaW5rc2NhcGUub3JnL25hbWVzcGFjZXMvaW5rc2NhcGUiIHhtbG5zOnNvZGlwb2RpPSJodHRwOi8vc29kaXBvZGkuc291cmNlZm9yZ2UubmV0L0RURC9zb2RpcG9kaS0wLmR0ZCIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgd2lkdGg9IjE3MTIiIGhlaWdodD0iOTE5IiB2aWV3Qm94PSIwIDAgMTcxMiA5MTkiIHZlcnNpb249IjEuMSIgaWQ9InN2ZzE1IiB4bWw6c3BhY2U9InByZXNlcnZlIj4KICA8ZGVmcyBpZD0iZGVmczIiPgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJsaW5lYXJHcmFkaWVudDE2Ij4KICAgICAgPHN0b3Agc3R5bGU9InN0b3AtY29sb3I6I2ZmZmZmZjtzdG9wLW9wYWNpdHk6MTsiIG9mZnNldD0iMCIgaWQ9InN0b3AxNiI+PC9zdG9wPgogICAgICA8c3RvcCBzdHlsZT0ic3RvcC1jb2xvcjojZmZlYWMwO3N0b3Atb3BhY2l0eToxOyIgb2Zmc2V0PSIxIiBpZD0ic3RvcDE3Ij48L3N0b3A+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJiZyIgeDE9IjAiIHgyPSIxMjU0LjMyMzciIGdyYWRpZW50VHJhbnNmb3JtPSJtYXRyaXgoMS4zNjQ4Nzg5LDAsMCwwLjczMjY2NTczLDAsLTAuMjY4NzQ3MzcpIiB5MT0iMCIgeTI9IjAiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iI2Y1ZjBlNiIgaWQ9InN0b3AxIj48L3N0b3A+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2YzYzk2YSIgaWQ9InN0b3AyIj48L3N0b3A+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IHhsaW5rOmhyZWY9IiNsaW5lYXJHcmFkaWVudDE2IiBpZD0ibGluZWFyR3JhZGllbnQxNyIgeDE9IjgyNCIgeTE9Ijg0NiIgeDI9IjE1MjQiIHkyPSI4NDYiIGdyYWRpZW50VW5pdHM9InVzZXJTcGFjZU9uVXNlIj48L2xpbmVhckdyYWRpZW50PgogIDwvZGVmcz4KICA8cmVjdCB3aWR0aD0iMTcxMiIgaGVpZ2h0PSI5MTkiIGZpbGw9InVybCgjYmcpIiBpZD0icmVjdDIiIHN0eWxlPSJmaWxsOnVybCgjYmcpIiB4PSIwIiB5PSItMC4yNjg3NDczNiI+PC9yZWN0PgogIDxyZWN0IHg9IjAiIHk9IjAiIHdpZHRoPSI1NjAiIGhlaWdodD0iOTE5IiBmaWxsPSIjZjZmMmVhIiBpZD0icmVjdDMiPjwvcmVjdD4KICA8cmVjdCB4PSI1NjAiIHk9IjAiIHdpZHRoPSI1NjAiIGhlaWdodD0iOTE5IiBmaWxsPSIjZWZlOGRiIiBpZD0icmVjdDQiPjwvcmVjdD4KICA8cmVjdCB4PSIxMTIwIiB5PSIwIiB3aWR0aD0iNTkyIiBoZWlnaHQ9IjkxOSIgZmlsbD0iI2Y2Y2Y3OCIgaWQ9InJlY3Q1Ij48L3JlY3Q+CiAgPHRleHQgeD0iNTUiIHk9IjU0NSIgZm9udC1zaXplPSI0OCIgZmlsbD0iIzAwMCIgaWQ9InRleHQ2Ij5Mb2FkICZhbXA7IFZlcmlmeTwvdGV4dD4KICA8dGV4dCB4PSIxMzU2IiB5PSI4MDAiIGZvbnQtc2l6ZT0iNThweCIgZmlsbD0iIzAwMDAwMCIgaWQ9InRleHQ3Ij5TcGVuZDwvdGV4dD4KICA8ZyBvcGFjaXR5PSIwLjIyIiBpZD0iZzgiPgogICAgPGcgdHJhbnNmb3JtPSJtYXRyaXgoMTAuMDcwMTM1LDAsMCwxMC4wNzAxMzUsNTI3Ljk1NDAzLDk5LjA3Njg1MykiIGlkPSJnMi02Ij4KICAgICAgPHBhdGggZmlsbD0iI2Y3OTMxYSIgZD0iTSA2My4wMzMsMzkuNzQ0IEMgNTguNzU5LDU2Ljg4NyA0MS4zOTYsNjcuMzIgMjQuMjUxLDYzLjA0NSA3LjExMyw1OC43NzEgLTMuMzIsNDEuNDA3IDAuOTU2LDI0LjI2NSA1LjIyOCw3LjEyIDIyLjU5MSwtMy4zMTQgMzkuNzMxLDAuOTYgNTYuODc1LDUuMjM0IDY3LjMwNywyMi42IDYzLjAzMywzOS43NDQgWiIgaWQ9InBhdGgxLTIiPjwvcGF0aD4KICAgICAgPHBhdGggZmlsbD0iI2ZmZmZmZiIgZD0iTSA0Ni4xMDMsMjcuNDQ0IEMgNDYuNzQsMjMuMTg2IDQzLjQ5OCwyMC44OTcgMzkuMDY1LDE5LjM3IGwgMS40MzgsLTUuNzY4IC0zLjUxMSwtMC44NzUgLTEuNCw1LjYxNiBjIC0wLjkyMywtMC4yMyAtMS44NzEsLTAuNDQ3IC0yLjgxMywtMC42NjIgbCAxLjQxLC01LjY1MyAtMy41MDksLTAuODc1IC0xLjQzOSw1Ljc2NiBjIC0wLjc2NCwtMC4xNzQgLTEuNTE0LC0wLjM0NiAtMi4yNDIsLTAuNTI3IGwgMC4wMDQsLTAuMDE4IC00Ljg0MiwtMS4yMDkgLTAuOTM0LDMuNzUgYyAwLDAgMi42MDUsMC41OTcgMi41NSwwLjYzNCAxLjQyMiwwLjM1NSAxLjY3OSwxLjI5NiAxLjYzNiwyLjA0MiBsIC0xLjYzOCw2LjU3MSBjIDAuMDk4LDAuMDI1IDAuMjI1LDAuMDYxIDAuMzY1LDAuMTE3IC0wLjExNywtMC4wMjkgLTAuMjQyLC0wLjA2MSAtMC4zNzEsLTAuMDkyIGwgLTIuMjk2LDkuMjA1IGMgLTAuMTc0LDAuNDMyIC0wLjYxNSwxLjA4IC0xLjYwOSwwLjgzNCAwLjAzNSwwLjA1MSAtMi41NTIsLTAuNjM3IC0yLjU1MiwtMC42MzcgbCAtMS43NDMsNC4wMTkgNC41NjksMS4xMzkgYyAwLjg1LDAuMjEzIDEuNjgzLDAuNDM2IDIuNTAzLDAuNjQ2IGwgLTEuNDUzLDUuODM0IDMuNTA3LDAuODc1IDEuNDM5LC01Ljc3MiBjIDAuOTU4LDAuMjYgMS44ODgsMC41IDIuNzk4LDAuNzI2IGwgLTEuNDM0LDUuNzQ1IDMuNTExLDAuODc1IDEuNDUzLC01LjgyMyBjIDUuOTg3LDEuMTMzIDEwLjQ4OSwwLjY3NiAxMi4zODQsLTQuNzM5IDEuNTI3LC00LjM2IC0wLjA3NiwtNi44NzUgLTMuMjI2LC04LjUxNSAyLjI5NCwtMC41MjkgNC4wMjIsLTIuMDM4IDQuNDgzLC01LjE1NSB6IG0gLTguMDIyLDExLjI0OSBjIC0xLjA4NSw0LjM2IC04LjQyNiwyLjAwMyAtMTAuODA2LDEuNDEyIGwgMS45MjgsLTcuNzI5IGMgMi4zOCwwLjU5NCAxMC4wMTIsMS43NyA4Ljg3OCw2LjMxNyB6IG0gMS4wODYsLTExLjMxMiBjIC0wLjk5LDMuOTY2IC03LjEsMS45NTEgLTkuMDgyLDEuNDU3IGwgMS43NDgsLTcuMDEgYyAxLjk4MiwwLjQ5NCA4LjM2NSwxLjQxNiA3LjMzNCw1LjU1MyB6IiBpZD0icGF0aDItOSI+PC9wYXRoPgogICAgPC9nPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNjAsNzYwKSIgaWQ9Imc5Ij4KICAgIDxjaXJjbGUgcj0iMTE1IiBmaWxsPSIjZmZmIiBzdHJva2U9IiM4YTY4MDAiIHN0cm9rZS13aWR0aD0iMTQiIGlkPSJjaXJjbGU4Ij48L2NpcmNsZT4KICAgIDxnIHRyYW5zZm9ybT0ibWF0cml4KDIuNjM4MjgwNywwLDAsMi42MzgyODA3LC04NC40MTIyOTgsLTg0LjQ2NDk0MikiIGlkPSJnMiI+CiAgICAgIDxwYXRoIGZpbGw9IiNmNzkzMWEiIGQ9Ik0gNjMuMDMzLDM5Ljc0NCBDIDU4Ljc1OSw1Ni44ODcgNDEuMzk2LDY3LjMyIDI0LjI1MSw2My4wNDUgNy4xMTMsNTguNzcxIC0zLjMyLDQxLjQwNyAwLjk1NiwyNC4yNjUgNS4yMjgsNy4xMiAyMi41OTEsLTMuMzE0IDM5LjczMSwwLjk2IDU2Ljg3NSw1LjIzNCA2Ny4zMDcsMjIuNiA2My4wMzMsMzkuNzQ0IFoiIGlkPSJwYXRoMSI+PC9wYXRoPgogICAgICA8cGF0aCBmaWxsPSIjZmZmZmZmIiBkPSJNIDQ2LjEwMywyNy40NDQgQyA0Ni43NCwyMy4xODYgNDMuNDk4LDIwLjg5NyAzOS4wNjUsMTkuMzcgbCAxLjQzOCwtNS43NjggLTMuNTExLC0wLjg3NSAtMS40LDUuNjE2IGMgLTAuOTIzLC0wLjIzIC0xLjg3MSwtMC40NDcgLTIuODEzLC0wLjY2MiBsIDEuNDEsLTUuNjUzIC0zLjUwOSwtMC44NzUgLTEuNDM5LDUuNzY2IGMgLTAuNzY0LC0wLjE3NCAtMS41MTQsLTAuMzQ2IC0yLjI0MiwtMC41MjcgbCAwLjAwNCwtMC4wMTggLTQuODQyLC0xLjIwOSAtMC45MzQsMy43NSBjIDAsMCAyLjYwNSwwLjU5NyAyLjU1LDAuNjM0IDEuNDIyLDAuMzU1IDEuNjc5LDEuMjk2IDEuNjM2LDIuMDQyIGwgLTEuNjM4LDYuNTcxIGMgMC4wOTgsMC4wMjUgMC4yMjUsMC4wNjEgMC4zNjUsMC4xMTcgLTAuMTE3LC0wLjAyOSAtMC4yNDIsLTAuMDYxIC0wLjM3MSwtMC4wOTIgbCAtMi4yOTYsOS4yMDUgYyAtMC4xNzQsMC40MzIgLTAuNjE1LDEuMDggLTEuNjA5LDAuODM0IDAuMDM1LDAuMDUxIC0yLjU1MiwtMC42MzcgLTIuNTUyLC0wLjYzNyBsIC0xLjc0Myw0LjAxOSA0LjU2OSwxLjEzOSBjIDAuODUsMC4yMTMgMS42ODMsMC40MzYgMi41MDMsMC42NDYgbCAtMS40NTMsNS44MzQgMy41MDcsMC44NzUgMS40MzksLTUuNzcyIGMgMC45NTgsMC4yNiAxLjg4OCwwLjUgMi43OTgsMC43MjYgbCAtMS40MzQsNS43NDUgMy41MTEsMC44NzUgMS40NTMsLTUuODIzIGMgNS45ODcsMS4xMzMgMTAuNDg5LDAuNjc2IDEyLjM4NCwtNC43MzkgMS41MjcsLTQuMzYgLTAuMDc2LC02Ljg3NSAtMy4yMjYsLTguNTE1IDIuMjk0LC0wLjUyOSA0LjAyMiwtMi4wMzggNC40ODMsLTUuMTU1IHogbSAtOC4wMjIsMTEuMjQ5IGMgLTEuMDg1LDQuMzYgLTguNDI2LDIuMDAzIC0xMC44MDYsMS40MTIgbCAxLjkyOCwtNy43MjkgYyAyLjM4LDAuNTk0IDEwLjAxMiwxLjc3IDguODc4LDYuMzE3IHogbSAxLjA4NiwtMTEuMzEyIGMgLTAuOTksMy45NjYgLTcuMSwxLjk1MSAtOS4wODIsMS40NTcgbCAxLjc0OCwtNy4wMSBjIDEuOTgyLDAuNDk0IDguMzY1LDEuNDE2IDcuMzM0LDUuNTUzIHoiIGlkPSJwYXRoMiI+PC9wYXRoPgogICAgPC9nPgogIDwvZz4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNDIwLDEyNSkiIGlkPSJnMTEiPgogICAgPGNpcmNsZSByPSIxMTUiIGZpbGw9IiNmZmYiIHN0cm9rZT0iIzhhNjgwMCIgc3Ryb2tlLXdpZHRoPSIxNCIgaWQ9ImNpcmNsZTEwIj48L2NpcmNsZT4KICAgIDxnIHRyYW5zZm9ybT0ibWF0cml4KDIuNjI1MjQ5OSwwLDAsMi42MjUyNDk5LC04NC4wNjUwMDYsLTgzLjcyNzk0MikiIGlkPSJnMi03Ij4KICAgICAgPHBhdGggZmlsbD0iI2Y3OTMxYSIgZD0iTSA2My4wMzMsMzkuNzQ0IEMgNTguNzU5LDU2Ljg4NyA0MS4zOTYsNjcuMzIgMjQuMjUxLDYzLjA0NSA3LjExMyw1OC43NzEgLTMuMzIsNDEuNDA3IDAuOTU2LDI0LjI2NSA1LjIyOCw3LjEyIDIyLjU5MSwtMy4zMTQgMzkuNzMxLDAuOTYgNTYuODc1LDUuMjM0IDY3LjMwNywyMi42IDYzLjAzMywzOS43NDQgWiIgaWQ9InBhdGgxLTUiPjwvcGF0aD4KICAgICAgPHBhdGggZmlsbD0iI2ZmZmZmZiIgZD0iTSA0Ni4xMDMsMjcuNDQ0IEMgNDYuNzQsMjMuMTg2IDQzLjQ5OCwyMC44OTcgMzkuMDY1LDE5LjM3IGwgMS40MzgsLTUuNzY4IC0zLjUxMSwtMC44NzUgLTEuNCw1LjYxNiBjIC0wLjkyMywtMC4yMyAtMS44NzEsLTAuNDQ3IC0yLjgxMywtMC42NjIgbCAxLjQxLC01LjY1MyAtMy41MDksLTAuODc1IC0xLjQzOSw1Ljc2NiBjIC0wLjc2NCwtMC4xNzQgLTEuNTE0LC0wLjM0NiAtMi4yNDIsLTAuNTI3IGwgMC4wMDQsLTAuMDE4IC00Ljg0MiwtMS4yMDkgLTAuOTM0LDMuNzUgYyAwLDAgMi42MDUsMC41OTcgMi41NSwwLjYzNCAxLjQyMiwwLjM1NSAxLjY3OSwxLjI5NiAxLjYzNiwyLjA0MiBsIC0xLjYzOCw2LjU3MSBjIDAuMDk4LDAuMDI1IDAuMjI1LDAuMDYxIDAuMzY1LDAuMTE3IC0wLjExNywtMC4wMjkgLTAuMjQyLC0wLjA2MSAtMC4zNzEsLTAuMDkyIGwgLTIuMjk2LDkuMjA1IGMgLTAuMTc0LDAuNDMyIC0wLjYxNSwxLjA4IC0xLjYwOSwwLjgzNCAwLjAzNSwwLjA1MSAtMi41NTIsLTAuNjM3IC0yLjU1MiwtMC42MzcgbCAtMS43NDMsNC4wMTkgNC41NjksMS4xMzkgYyAwLjg1LDAuMjEzIDEuNjgzLDAuNDM2IDIuNTAzLDAuNjQ2IGwgLTEuNDUzLDUuODM0IDMuNTA3LDAuODc1IDEuNDM5LC01Ljc3MiBjIDAuOTU4LDAuMjYgMS44ODgsMC41IDIuNzk4LDAuNzI2IGwgLTEuNDM0LDUuNzQ1IDMuNTExLDAuODc1IDEuNDUzLC01LjgyMyBjIDUuOTg3LDEuMTMzIDEwLjQ4OSwwLjY3NiAxMi4zODQsLTQuNzM5IDEuNTI3LC00LjM2IC0wLjA3NiwtNi44NzUgLTMuMjI2LC04LjUxNSAyLjI5NCwtMC41MjkgNC4wMjIsLTIuMDM4IDQuNDgzLC01LjE1NSB6IG0gLTguMDIyLDExLjI0OSBjIC0xLjA4NSw0LjM2IC04LjQyNiwyLjAwMyAtMTAuODA2LDEuNDEyIGwgMS45MjgsLTcuNzI5IGMgMi4zOCwwLjU5NCAxMC4wMTIsMS43NyA4Ljg3OCw2LjMxNyB6IG0gMS4wODYsLTExLjMxMiBjIC0wLjk5LDMuOTY2IC03LjEsMS45NTEgLTkuMDgyLDEuNDU3IGwgMS43NDgsLTcuMDEgYyAxLjk4MiwwLjQ5NCA4LjM2NSwxLjQxNiA3LjMzNCw1LjU1MyB6IiBpZD0icGF0aDItMyI+PC9wYXRoPgogICAgPC9nPgogIDwvZz4KICA8dGV4dCB4PSI0NTUiIHk9IjU5NSIgdHJhbnNmb3JtPSJyb3RhdGUoLTkwIDQ1NSw1OTUpIiBmb250LXNpemU9IjMyIiBmaWxsPSIjOGE2ODAwIiBpZD0idGV4dDEyIj5CaXRjb2luIEFkZHJlc3M8L3RleHQ+CiAgPHRleHQgeD0iLTgxMSIgeT0iMTE2NSIgdHJhbnNmb3JtPSJyb3RhdGUoLTkwKSIgZm9udC1zaXplPSIzMnB4IiBmaWxsPSIjOGE2ODAwIiBpZD0idGV4dDEzIj5Qcml2YXRlIEtleTwvdGV4dD4KICA8dGV4dCB4PSI2MjIiIHk9IjgxMCIgZm9udC1zaXplPSI4NHB4IiBmb250LXN0eWxlPSJpdGFsaWMiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiM5YTZkMDAiIGlkPSJ0ZXh0MTQiPmJpdGNvaW48L3RleHQ+CiAgPHRleHQgeD0iNjYyIiB5PSI4NTYiIGZvbnQtc2l6ZT0iMzhweCIgZmlsbD0iIzhhNjgwMCIgaWQ9InRleHQxNSI+QW1vdW50OjwvdGV4dD4KICA8cmVjdCB4PSI4MjQiIHk9IjgyNSIgd2lkdGg9IjcwMCIgaGVpZ2h0PSI0MiIgZmlsbD0iI2VmZTVkMCIgaWQ9InJlY3QxNSIgc3R5bGU9ImZpbGw6dXJsKCNsaW5lYXJHcmFkaWVudDE3KTtmaWxsLW9wYWNpdHk6MSI+PC9yZWN0PgogIDxyZWN0IHg9Ii05MTcuNDI4MTYiIHk9IjUyNy41ODA2OSIgd2lkdGg9IjkxNi4wNzI4OCIgaGVpZ2h0PSI0MiIgZmlsbD0iI2VmZTVkMCIgaWQ9InJlY3QxNS0wIiBzdHlsZT0iZmlsbDojYjE5Zjc2O2ZpbGwtb3BhY2l0eToxO3N0cm9rZS13aWR0aDoxLjE0Mzk4IiB0cmFuc2Zvcm09InJvdGF0ZSgtOTApIj48L3JlY3Q+CiAgPHRleHQgeD0iLTg5MS4wMTY4NSIgeT0iNTYzLjQ0ODI0IiBmb250LXNpemU9IjM5LjMyNTJweCIgZm9udC1zdHlsZT0iaXRhbGljIiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjOWE2ZDAwIiBpZD0idGV4dDE0LTIiIHN0eWxlPSJmaWxsOiNmZmZmZmY7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlLXdpZHRoOjAuNDY4MTU2IiB0cmFuc2Zvcm09InJvdGF0ZSgtOTApIj5iaXRjb2luPC90ZXh0PgogIDx0ZXh0IHg9Ii03NDMuOTA3NDciIHk9IjU2My4wOTU3NiIgZm9udC1zaXplPSIzOS4zMjUycHgiIGZvbnQtc3R5bGU9Iml0YWxpYyIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iIzlhNmQwMCIgaWQ9InRleHQxNC0yLTMiIHN0eWxlPSJmaWxsOiNmZmZmZmY7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlLXdpZHRoOjAuNDY4MTU2IiB0cmFuc2Zvcm09InJvdGF0ZSgtOTApIj5iaXRjb2luPC90ZXh0PgogIDx0ZXh0IHg9Ii01OTYuODcyMDEiIHk9IjU2Mi42MDYyNiIgZm9udC1zaXplPSIzOS4zMjUycHgiIGZvbnQtc3R5bGU9Iml0YWxpYyIgZm9udC13ZWlnaHQ9IjcwMCIgZmlsbD0iIzlhNmQwMCIgaWQ9InRleHQxNC0yLTMtNiIgc3R5bGU9ImZpbGw6I2ZmZmZmZjtmaWxsLW9wYWNpdHk6MTtzdHJva2Utd2lkdGg6MC40NjgxNTYiIHRyYW5zZm9ybT0icm90YXRlKC05MCkiPmJpdGNvaW48L3RleHQ+CiAgPHRleHQgeD0iLTQ0OS42MzMwNiIgeT0iNTYyLjI0MzQxIiBmb250LXNpemU9IjM5LjMyNTJweCIgZm9udC1zdHlsZT0iaXRhbGljIiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjOWE2ZDAwIiBpZD0idGV4dDE0LTItMy0xIiBzdHlsZT0iZmlsbDojZmZmZmZmO2ZpbGwtb3BhY2l0eToxO3N0cm9rZS13aWR0aDowLjQ2ODE1NiIgdHJhbnNmb3JtPSJyb3RhdGUoLTkwKSI+Yml0Y29pbjwvdGV4dD4KICA8dGV4dCB4PSItMzAyLjY1OSIgeT0iNTYxLjkwNTc2IiBmb250LXNpemU9IjM5LjMyNTJweCIgZm9udC1zdHlsZT0iaXRhbGljIiBmb250LXdlaWdodD0iNzAwIiBmaWxsPSIjOWE2ZDAwIiBpZD0idGV4dDE0LTItMy05IiBzdHlsZT0iZmlsbDojZmZmZmZmO2ZpbGwtb3BhY2l0eToxO3N0cm9rZS13aWR0aDowLjQ2ODE1NiIgdHJhbnNmb3JtPSJyb3RhdGUoLTkwKSI+Yml0Y29pbjwvdGV4dD4KICA8dGV4dCB4PSItMTU1LjYyNzExIiB5PSI1NjEuNjE4NDEiIGZvbnQtc2l6ZT0iMzkuMzI1MnB4IiBmb250LXN0eWxlPSJpdGFsaWMiIGZvbnQtd2VpZ2h0PSI3MDAiIGZpbGw9IiM5YTZkMDAiIGlkPSJ0ZXh0MTQtMi0zLTIiIHN0eWxlPSJmaWxsOiNmZmZmZmY7ZmlsbC1vcGFjaXR5OjE7c3Ryb2tlLXdpZHRoOjAuNDY4MTU2IiB0cmFuc2Zvcm09InJvdGF0ZSgtOTApIj5iaXRjb2luPC90ZXh0Pgo8L3N2Zz4K';

		}

		var walletHtml =
							"<div class='artwallet' id='artwallet" + i + "'>" +
		//"<iframe src='bitcoin-wallet-01.svg' id='papersvg" + i + "' class='papersvg' ></iframe>" +
								"<img id='papersvg" + i + "' class='papersvg' src='" + image + "' />" +
								"<div id='qrcode_public" + i + "' class='qrcode_public'></div>" +
								"<div id='qrcode_private" + i + "' class='qrcode_private'></div>" +
								"<div class='btcaddress' id='btcaddress" + i + "'></div>" +
								"<div class='" + keyelement + "' id='" + keyelement + i + "'></div>" +
							"</div>";
		return walletHtml;
	},

	showArtisticWallet: function (idPostFix, bitcoinAddress, privateKey) {
		var keyValuePair = {};
		keyValuePair["qrcode_public" + idPostFix] = bitcoinAddress;
		keyValuePair["qrcode_private" + idPostFix] = privateKey;
		ninja.qrCode.showQrCode(keyValuePair, 2.5);

		// Scale font size so rotated text stays within the card (char width ≈ 0.60 × fontSize)
		var artFontSize = function (text, availPx, defaultPx) {
			return Math.min(defaultPx, Math.max(5, Math.floor(availPx / (text.length * 0.60))));
		};

		var addrEl = document.getElementById("btcaddress" + idPostFix);
		addrEl.innerHTML = bitcoinAddress;
		addrEl.style.fontSize = artFontSize(bitcoinAddress, 253, 10) + "px";

		if (ninja.wallets.paperwallet.encrypt) {
			var half = Math.ceil(privateKey.length / 2);
			var encEl = document.getElementById("btcencryptedkey" + idPostFix);
			encEl.innerHTML = privateKey.slice(0, half) + '<br />' + privateKey.slice(half);
			encEl.style.fontSize = artFontSize(privateKey.slice(0, half), 174, 8) + "px";
		}
		else {
			var privEl = document.getElementById("btcprivwif" + idPostFix);
			privEl.innerHTML = privateKey;
			privEl.style.fontSize = artFontSize(privateKey, 229, 7) + "px";
		}

		// CODE to modify SVG DOM elements
		//var paperSvg = document.getElementById("papersvg" + idPostFix);
		//if (paperSvg) {
		//	svgDoc = paperSvg.contentDocument;
		//	if (svgDoc) {
		//		var bitcoinAddressElement = svgDoc.getElementById("bitcoinaddress");
		//		var privateKeyElement = svgDoc.getElementById("privatekey");
		//		if (bitcoinAddressElement && privateKeyElement) {
		//			bitcoinAddressElement.textContent = bitcoinAddress;
		//			privateKeyElement.textContent = privateKeyWif;
		//		}
		//	}
		//}
	},

	toggleArt: function (element) {
		ninja.wallets.paperwallet.resetLimits();
	},

	// Return address for the key according to the currently selected address type
	getAddress: function (key) {
		var type = document.getElementById("paperaddrtype").value;
		key.setAddressType(type);
		switch (type) {
			case "p2sh":    return key.getP2SHAddress();
			case "segwit":  return key.getSegwitAddress();
			case "taproot": return key.getTaprootAddress();
			default:        return key.getBitcoinAddress();
		}
	},

	// Called when the address type <select> changes
	onAddressTypeChange: function (element) {
		var isLegacy = (element.value === "legacy");
		var encryptCheckbox = document.getElementById("paperencrypt");
		if (!isLegacy && encryptCheckbox.checked) {
			// BIP38 only supports legacy P2PKH - disable it
			encryptCheckbox.checked = false;
			document.getElementById("paperpassphrase").disabled = true;
			ninja.wallets.paperwallet.encrypt = false;
		}
		// BIP38 checkbox available only for legacy addresses
		encryptCheckbox.disabled = !isLegacy;
	},

	toggleEncrypt: function (element) {
		// enable/disable passphrase textbox
		document.getElementById("paperpassphrase").disabled = !element.checked;
		ninja.wallets.paperwallet.encrypt = element.checked;
		if (element.checked) {
			// Force legacy address type - BIP38 requires it
			document.getElementById("paperaddrtype").value = "legacy";
			document.getElementById("paperaddrtype").disabled = true;
		} else {
			document.getElementById("paperaddrtype").disabled = false;
		}
		ninja.wallets.paperwallet.resetLimits();
	},

	resetLimits: function () {
		var hideArt = document.getElementById("paperart");
		var paperEncrypt = document.getElementById("paperencrypt");
		var limit;
		var limitperpage;

		document.getElementById("paperkeyarea").style.fontSize = "100%";
		if (!hideArt.checked) {
			limit = ninja.wallets.paperwallet.pageBreakAtArtisticDefault;
			limitperpage = ninja.wallets.paperwallet.pageBreakAtArtisticDefault;
		}
		else if (hideArt.checked && paperEncrypt.checked) {
			limit = ninja.wallets.paperwallet.pageBreakAtDefault;
			limitperpage = ninja.wallets.paperwallet.pageBreakAtDefault;
			// reduce font size
			document.getElementById("paperkeyarea").style.fontSize = "95%";
		}
		else if (hideArt.checked && !paperEncrypt.checked) {
			limit = ninja.wallets.paperwallet.pageBreakAtDefault;
			limitperpage = ninja.wallets.paperwallet.pageBreakAtDefault;
		}
		document.getElementById("paperlimitperpage").value = limitperpage;
		document.getElementById("paperlimit").value = limit;
	}
};