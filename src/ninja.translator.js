(function (ninja) {
	var translator = ninja.translator = {
		currentCulture: "en",

		autoDetectTranslation: function () {
			// window.navigator.language for Firefox / Chrome / Opera Safari
			// window.navigator.userLanguage for IE
			var language = window.navigator.language || window.navigator.userLanguage;
			if (!this.translate(language)) {
				// Try to remove part after dash, for example cs-CZ -> cs
				language = language.substr(0, language.indexOf('-'));
				this.translate(language);
			}
		},

		translate: function (culture) {
			var dict = translator.translations[culture];
			if (dict) {
				// set current culture
				translator.currentCulture = culture;
				// persist chosen language across sessions
				try { localStorage.setItem('bitaddress-lang', culture); } catch(e) {}
				// sync the language dropdown
				var langSel = document.getElementById("langselect");
				if (langSel) langSel.value = culture;

				// apply translations
				for (var id in dict) {
					var elem = document.getElementById(id);
					if (!elem) continue;
					var val = dict[id];

					// SELECT element: translate option labels by their value attribute
					if (elem.tagName === "SELECT" && typeof val === "object" && val !== null) {
						for (var o = 0; o < elem.options.length; o++) {
							if (val[elem.options[o].value] !== undefined) {
								elem.options[o].text = val[elem.options[o].value];
							}
						}
					}
					// input / button: update .value
					else if (elem.value !== undefined && elem.tagName === "INPUT" && elem.type !== "checkbox") {
						elem.value = val;
					}
					// everything else: innerHTML
					else {
						elem.innerHTML = val;
					}
				}
				return true;
			} else {
				return false;
			}
		},

		get: function (id) {
			var cur = translator.translations[translator.currentCulture];
			var translation = cur ? cur[id] : undefined;
			// fallback to English when the key is missing from the current culture
			if (translation === undefined) {
				var en = translator.translations["en"];
				translation = en ? en[id] : undefined;
			}
			return translation !== undefined ? translation : "";
		},

		translations: {
			"en": {
				// javascript alerts
				"testneteditionactivated": "TESTNET EDITION ACTIVATED",
				"paperlabelbitcoinaddress": "Bitcoin Address:",
				"paperlabelprivatekey": "Private Key:",
				"paperlabelencryptedkey": "Encrypted Private Key (Password required)",
				"bulkgeneratingaddresses": "Generating addresses... ",
				"brainalertpassphrasetooshort": "The passphrase you entered is too short.\n\n",
				"brainalertpassphrasewarning": "Warning: Choosing a strong passphrase is important to avoid brute force attempts to guess your passphrase and steal your bitcoins.",
				"brainalertpassphrasedoesnotmatch": "The passphrase does not match the confirm passphrase.",
				"detailalertnotvalidprivatekey": "The text you entered is not a valid Private Key",
				"detailconfirmsha256": "The text you entered is not a valid Private Key!\n\nWould you like to use the entered text as a passphrase and create a Private Key using a SHA256 hash of the passphrase?\n\nWarning: Choosing a strong passphrase is important to avoid brute force attempts to guess your passphrase and steal your bitcoins.",
				"detailbip38decryptbutton": "Decrypt BIP38",
				"detailbip38encryptbutton": "Encrypt BIP38",
				"bip38alertincorrectpassphrase": "Incorrect passphrase for this encrypted private key.",
				"bip38alertpassphraserequired": "Passphrase required for BIP38 key",
				"vanityinvalidinputcouldnotcombinekeys": "Invalid input. Could not combine keys.",
				"vanityalertinvalidinputpublickeysmatch": "Invalid input. The Public Key of both entries match. You must input two different keys.",
				"vanityalertinvalidinputcannotmultiple": "Invalid input. Cannot multiply two public keys. Select 'Add' to add two public keys to get a bitcoin address.",
				"vanityprivatekeyonlyavailable": "Only available when combining two private keys",
				"vanityalertinvalidinputprivatekeysmatch": "Invalid input. The Private Key of both entries match. You must input two different keys.",

				// address type select options (object → translated by value attribute)
				"paperaddrtype":  { "legacy": "Legacy P2PKH (1…)", "p2sh": "P2SH-P2WPKH (3…)", "segwit": "Native SegWit (bc1q…)", "taproot": "Taproot (bc1p…)" },
				"bulkaddrtype":   { "legacy": "Legacy P2PKH (1…)", "p2sh": "P2SH-P2WPKH (3…)", "segwit": "Native SegWit (bc1q…)", "taproot": "Taproot (bc1p…)" },
				"brainaddrtype":  { "legacy": "Legacy P2PKH (1…)", "p2sh": "P2SH-P2WPKH (3…)", "segwit": "Native SegWit (bc1q…)", "taproot": "Taproot (bc1p…)" },
				"vanityaddrtype": { "legacy": "Legacy P2PKH (1…)", "p2sh": "P2SH-P2WPKH (3…)", "segwit": "Native SegWit (bc1q…)", "taproot": "Taproot (bc1p…)" },
				"splitaddrtype":  { "legacy": "Legacy P2PKH (1…)", "p2sh": "P2SH-P2WPKH (3…)", "segwit": "Native SegWit (bc1q…)", "taproot": "Taproot (bc1p…)" },

				// address type labels
				"paperlabeladdrtype": "Address type:",
				"bulklabeladdrtype": "Address type:",
				"brainlabeladdrtype": "Address type:",
				"vanitylabeladdrtype": "Address type:",
				"splitlabeladdrtype": "Address type:",

				// header and menu
				"tagline": "Open Source JavaScript Client-Side Bitcoin Wallet Generator",
				"generatelabelbitcoinaddress": "Generating Bitcoin Address...",
				"generatelabelmovemouse": "MOVE your mouse around to add some extra randomness...",
				"generatelabelkeypress": "OR type some random characters into this textbox",
				"singlewallet": "Single Wallet",
				"paperwallet": "Paper Wallet",
				"bulkwallet": "Bulk Wallet",
				"brainwallet": "Brain Wallet",
				"vanitywallet": "Vanity Wallet",
				"splitwallet": "Split Wallet",
				"detailwallet": "Wallet Details",

				// single wallet
				"newaddress": "Generate New Address",
				"singleprint": "Print",
				"singlelabelbitcoinaddress": "Bitcoin Address (Legacy P2PKH)",
				"singlelabelP2SH": "P2SH-P2WPKH (3…)",
				"singlelabelSegwit": "Native SegWit P2WPKH (bc1q…)",
				"singlelabelTaproot": "Taproot P2TR (bc1p…)",
				"singlelabelprivatekey": "Private Key (WIF compressed)",
				"singleshare": "SHARE",
				"singlesecret": "SECRET",

				// paper wallet
				"paperlabelhideart": "Hide Art?",
				"paperlabeladdressesperpage": "Addresses per page:",
				"paperlabeladdressestogenerate": "Addresses to generate:",
				"papergenerate": "Generate",
				"paperprint": "Print",
				"paperlabelBIPpassphrase": "Passphrase:",
				"paperlabelencrypt": "BIP38 Encrypt?",

				// bulk wallet
				"bulklabelstartindex": "Start index:",
				"bulklabelrowstogenerate": "Rows to generate:",
				"bulklabelcompressed": "Compressed addresses?",
				"bulkgenerate": "Generate",
				"bulkprint": "Print",
				"bulklabelcsv": "Comma Separated Values:",
				"bulklabelformat": "Index,Address,Private Key (WIF)",
				"bulklabelencrypt": "BIP38 Encrypt?",
				"bulklabelBIPpassphrase": "Passphrase:",
				"bulklabelq1": "Why should I use a Bulk Wallet to accept bitcoins on my website?",
				"bulklabelq2": "How do I use a Bulk Wallet to accept bitcoins on my website?",

				// brain wallet
				"brainlabelenterpassphrase": "Enter Passphrase: ",
				"brainlabelshow": "Show?",
				"brainprint": "Print",
				"brainlabelconfirm": "Confirm Passphrase: ",
				"brainlabelcompressed": "Compressed address?",
				"brainview": "View",
				"brainalgorithm": "Algorithm: SHA256(passphrase)",
				"brainlabelbitcoinaddress": "Bitcoin Address:",
				"brainlabelprivatekey": "Private Key (Wallet Import Format):",

				// vanity wallet
				"vanitylabelstep1": "Step 1 - Generate your \"Step1 Key Pair\"",
				"vanitynewkeypair": "Generate",
				"vanitylabelstep1publickey": "Step 1 Public Key:",
				"vanitylabelstep1pubnotes": "Copy and paste the above into the Your-Part-Public-Key field in the Vanity Pool Website.",
				"vanitylabelstep1privatekey": "Step 1 Private Key:",
				"vanitylabelstep1privnotes": "Copy and paste the above Private Key field into a text file. Ideally save to an encrypted drive. You will need this to retrieve the Bitcoin Private Key once the Pool has found your prefix.",
				"vanitylabelstep2calculateyourvanitywallet": "Step 2 - Calculate your Vanity Wallet",
				"vanitylabelenteryourpart": "Enter Your Part Private Key (generated in Step 1 above and previously saved):",
				"vanitylabelenteryourpoolpart": "Enter Pool Part Private Key (from Vanity Pool):",
				"vanitylabelnote1": "[NOTE: this input box can accept a public key or private key]",
				"vanitylabelnote2": "[NOTE: this input box can accept a public key or private key]",
				"vanitylabelradioadd": "Add",
				"vanitylabelradiomultiply": "Multiply",
				"vanitycalc": "Calculate Vanity Wallet",
				"vanitylabelbitcoinaddress": "Vanity Bitcoin Address:",
				"vanitylabelnotesbitcoinaddress": "The above is your new address that should include your required prefix.",
				"vanitylabelpublickeyhex": "Vanity Public Key (HEX):",
				"vanitylabelnotespublickeyhex": "The above is the Public Key in hexadecimal format.",
				"vanitylabelprivatekey": "Vanity Private Key (WIF):",
				"vanitylabelnotesprivatekey": "The above is the Private Key to load into your wallet.",

				// split wallet
				"splitlabelthreshold": "Minimum share threshold needed to combine",
				"splitlabelshares": "Number of shares",
				"splitview": "Generate",
				"combinelabelentershares": "Enter Available Shares (whitespace separated)",
				"combineview": "Combine Shares",
				"combinelabelprivatekey": "Combined Private Key",

				// detail wallet
				"detaillabelenterprivatekey": "Enter Private Key",
				"detailkeyformats": "Key Formats: WIF, WIFC, HEX, B64, B6, MINI, BIP38",
				"detailview": "View Details",
				"detailprint": "Print",
				"detaillabelencrypt": "BIP38 Encrypt?",
				"detaillabelpassphrase": "Enter BIP38 Passphrase",
				"detaillabelnote1": "Your Bitcoin Private Key is a unique secret number that only you know. It can be encoded in a number of different formats. Below we show the Bitcoin Address and Public Key that corresponds to your Private Key as well as your Private Key in the most popular encoding formats (WIF, WIFC, HEX, B64).",
				"detaillabelnote2": "Bitcoin v0.6+ stores public keys in compressed format. The client now also supports import and export of private keys with importprivkey/dumpprivkey. The format of the exported private key is determined by whether the address was generated in an old or new wallet.",
				"detaillabelbitcoinaddress": "Bitcoin Address (Legacy P2PKH)",
				"detaillabelbitcoinaddresscomp": "Bitcoin Address Compressed (Legacy P2PKH)",
				"detaillabelP2SH": "P2SH-P2WPKH Address (3…)",
				"detaillabelSegwit": "Native SegWit P2WPKH (bc1q…)",
				"detaillabelTaproot": "Taproot P2TR (bc1p…)",
				"detaillabelpublickey": "Public Key (130 characters [0-9A-F]):",
				"detaillabelpublickeycomp": "Public Key (compressed, 66 characters [0-9A-F]):",
				"detaillabelprivwif": "Private Key WIF\n51 characters base58, starts with a",
				"detailwifprefix": "'5'",
				"detaillabelprivwifcomp": "Private Key WIF Compressed\n52 characters base58, starts with a",
				"detailcompwifprefix": "'K' or 'L'",
				"detaillabelprivhex": "Private Key Hexadecimal Format (64 characters [0-9A-F]):",
				"detaillabelprivb64": "Private Key Base64 (44 characters):",
				"detaillabelprivmini": "Private Key Mini Format (22, 26 or 30 characters, starts with an 'S'):",
				"detaillabelprivb6": "Private Key Base6 Format (99 characters [0-5]):",
				"detaillabelq1": "How do I make a wallet using dice? What is B6?",
				"detaila1": "An important part of creating a Bitcoin wallet is ensuring the random numbers used to create the wallet are truly random. Physical randomness is better than computer generated pseudo-randomness. The easiest way to generate physical randomness is with dice. To create a Bitcoin private key you only need one six sided die which you roll 99 times. Stopping each time to record the value of the die. When recording the values follow these rules: 1=1, 2=2, 3=3, 4=4, 5=5, 6=0. By doing this you are recording the big random number, your private key, in B6 or base 6 format. You can then enter the 99 character base 6 private key into the text field above and click View Details. You will then see the Bitcoin address associated with your private key. You should also make note of your private key in WIF format since it is more widely used.",

				// footer
				"footerlabeldonations": "Donations:",
				"footerlabeltranslatedby": "",
				"footerlabelpgp": "PGP",
				"footerlabelversion": "Version History",
				"footerlabelgithub": "GitHub Repository",
				"footerlabelgithubzip": "zip",
				"footerlabelsig": "sig",
				"footerlabelcopyright1": "Copyright bitaddress.org.",
				"footerlabelcopyright2": "JavaScript copyrights are included in the source.",
				"footerlabelnowarranty": "No warranty.",

				// status bar
				"statuslabelcryptogood": "&#10004; Good!",
				"statuslabelcryptogood1": "Your browser can generate cryptographically random keys using window.crypto.getRandomValues",
				"statusokcryptogood": "OK",
				"statuslabelcryptobad": "&times; Oh no!",
				"statuslabelcryptobad1": "Your browser does NOT support window.crypto.getRandomValues. You should use a more modern browser with this generator to increase the security of the keys generated.",
				"statusokcryptobad": "OK",
				"statuslabelunittestsgood": "&#10004; Good!",
				"statuslabelunittestsgood1": "All synchronous unit tests passed.",
				"statusokunittestsgood": "OK",
				"statuslabelunittestsbad": "&times; Oh no!",
				"statuslabelunittestsbad1": "Some synchronous unit tests DID NOT pass. You should find another browser to use with this generator.",
				"statusokunittestsbad": "OK",
				"statuslabelprotocolgood": "&#10004; Good!",
				"statuslabelprotocolgood1": "You are running this generator from your local computer. <br />Tip: Double check you are offline by trying ",
				"statusokprotocolgood": "OK",
				"statuslabelprotocolbad": "&#9888; Think twice!",
				"statuslabelprotocolbad1": "You appear to be running this generator online from a live website. For valuable wallets it is recommended to",
				"statuslabelprotocolbad2": "download",
				"statuslabelprotocolbad3": "the zip file from GitHub and run this generator offline as a local html file.",
				"statusokprotocolbad": "OK",
				"statuslabelkeypool1": "This is a log of all the Bitcoin Addresses and Private Keys you generated during your current session. Reloading the page will create a new session.",
				"statuskeypoolrefresh": "Refresh",
				"statusokkeypool": "OK"
			}
		},

		extractEnglishFromDomAndUpdateDictionary: function () {
			var english = translator.translations["en"];
			var spanish = translator.translations["es"];
			var spanishClone = {};
			for (var key in spanish) {
				spanishClone[key] = spanish[key];
			}
			var newLang = {};
			for (var key in english) {
				newLang[key] = english[key];
				delete spanishClone[key];
			}
			for (var key in spanishClone) {
				if (document.getElementById(key)) {
					if (document.getElementById(key).value) {
						newLang[key] = document.getElementById(key).value;
					}
					else {
						newLang[key] = document.getElementById(key).innerHTML;
					}
				}
			}
			translator.translations["en"] = newLang;
		},

		showEnglishJson: function () {
			var english = ninja.translator.translations["en"];
			var spanish = ninja.translator.translations["es"];
			var spanishClone = {};
			for (var key in spanish) {
				spanishClone[key] = spanish[key];
			}
			var newLang = {};
			for (var key in english) {
				newLang[key] = english[key];
				delete spanishClone[key];
			}
			for (var key in spanishClone) {
				if (document.getElementById(key)) {
					if (document.getElementById(key).value) {
						newLang[key] = document.getElementById(key).value;
					}
					else {
						newLang[key] = document.getElementById(key).innerHTML;
					}
				}
			}
			var div = document.createElement("div");
			div.setAttribute("class", "englishjson");
			div.innerHTML = "<h3>English Json</h3>";
			var elem = document.createElement("textarea");
			elem.setAttribute("rows", "15");
			elem.setAttribute("cols", "110");
			elem.setAttribute("wrap", "off");
			var langJson = "{\n";
			for (var key in newLang) {
				langJson += "\t\"" + key + "\"" + ": " + "\"" + newLang[key].replace(/\"/g, "\\\"").replace(/\n/g, "\\n") + "\",\n";
			}
			langJson = langJson.substr(0, langJson.length - 2);
			langJson += "\n}\n";
			elem.innerHTML = langJson;
			div.appendChild(elem);
			document.body.appendChild(div);

		}
	};
})(ninja);