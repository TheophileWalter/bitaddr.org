// ── Theme toggle ────────────────────────────────────────────────────────
ninja.theme = {
	current: function () {
		return document.documentElement.getAttribute('data-theme') || 'light';
	},
	apply: function (theme) {
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('bitaddr-theme', theme);
		var label = document.getElementById('themelabel');
		var icon  = document.querySelector('#themetoggle .theme-icon');
		var dark  = (window.ninja && ninja.translator) ? (ninja.translator.get('themedark')  || 'Dark')  : 'Dark';
		var light = (window.ninja && ninja.translator) ? (ninja.translator.get('themelight') || 'Light') : 'Light';
		if (label) label.textContent = theme === 'light' ? dark : light;
		if (icon)  icon.innerHTML    = theme === 'light' ? '&#9790;' : '&#9788;';
	},
	toggle: function () {
		ninja.theme.apply(ninja.theme.current() === 'light' ? 'dark' : 'light');
	},
	init: function () {
		// Sync button label with the theme already applied by the inline <head> script
		ninja.theme.apply(ninja.theme.current());
	}
};

(function (ninja) {
	var status = ninja.status = function() {
		var cryptoCase = "";
		if (window.crypto && window.crypto.getRandomValues) {
			document.getElementById("statuscrypto").innerHTML = "&#10004;"; //✔
			cryptoCase = "good";
		}
		else {
			document.getElementById("statuscrypto").innerHTML = "&times;"; //×
			cryptoCase = "bad";
		}

		var protocolCase = "";
		switch (window.location.protocol) {
			case 'file:':
				document.getElementById("statusprotocol").innerHTML = "&#10004;"; //✔
				protocolCase = "good";
				break;
			case 'http:':
			case 'https:':
				document.getElementById("statusprotocol").innerHTML = "&#9888;"; //⚠
				protocolCase = "bad";
				break;
			default:
		}

		var unitTestsCase = "";
		var unitTests = function () {
			var result = ninja.unitTests.runSynchronousTests();
			if (result.passCount == result.testCount) {
				document.getElementById("statusunittests").innerHTML = "&#10004;"; //✔
				unitTestsCase = "good";
			}
			else {
				document.getElementById("statusunittests").innerHTML = "&times;"; //×
				unitTestsCase = "bad";
			}
		};

		var showCrypto = function () {
			document.getElementById('statuscrypto' + cryptoCase).style.display = 'block';
		};

		var showProtocol = function () {
			document.getElementById('statusprotocol' + protocolCase).style.display = 'block';
		};

		var showUnitTests = function () {
			if(unitTestsCase != "") document.getElementById('statusunittests' + unitTestsCase).style.display = 'block';
		};

		var showKeyPool = function () {
			document.getElementById('statuskeypoolgood').style.display = 'block';
			document.getElementById("keypooltextarea").value = Bitcoin.KeyPool.toString();
		};

		return {
			unitTests: unitTests, showCrypto: showCrypto, showProtocol: showProtocol,
			showUnitTests: showUnitTests, showKeyPool: showKeyPool
		};
	}();
})(ninja);

ninja.donation = {
	addr: "bc1qx4z2w9lmudccutv79jze0zzdcmg7mxxj7jd3k4",
	show: function () {
		var qrDiv = document.getElementById("donationqr");
		qrDiv.innerHTML = "";
		qrDiv.appendChild(ninja.qrCode.createCanvas("bitcoin:" + ninja.donation.addr, 5));
		document.getElementById("donationmodal").classList.add("open");
		if (navigator.clipboard) {
			navigator.clipboard.writeText(ninja.donation.addr).then(function () {
				var confirm = document.getElementById("donationcopyconfirm");
				confirm.textContent = ninja.translator.get('donationcopyconfirm') || 'Address copied!';
				setTimeout(function () { confirm.textContent = ""; }, 2500);
			});
		}
	},
	hide: function () {
		document.getElementById("donationmodal").classList.remove("open");
	}
};

ninja.tab = {
    select: function (walletTab) {
        // detect type: normally an HtmlElement/object but when string then get the element
        if (typeof walletTab === 'string') {
            walletTab = document.getElementById(walletTab);
        }
        var walletType = walletTab.getAttribute("id");

        if (walletTab.className.indexOf("selected") == -1) {
            // unselect all tabs
            for (var wType in ninja.wallets) {
                document.getElementById(wType).className = "tab";
                ninja.wallets[wType].close();
            }
            walletTab.className += " selected";
            ninja.wallets[walletTab.getAttribute("id")].open();
        }
    },

    whichIsOpen: function () {
        var isOpen;
        for (var wType in ninja.wallets) {
            isOpen = ninja.wallets[wType].isOpen();
            if (isOpen) {
                return wType;
            }
        }
        return null;
    }

};

ninja.copy = function(btn, id) {
	var el = document.getElementById(id);
	if (!el) return;
	var text = (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') ? el.value : el.textContent;
	text = text.trim();
	if (!text) return;
	var origHtml = btn.innerHTML;
	var flash = function() {
		btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l3 3 6-7"/></svg>';
		btn.classList.add('copied');
		setTimeout(function() { btn.innerHTML = origHtml; btn.classList.remove('copied'); }, 1500);
	};
	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(text).then(flash).catch(function() { ninja.copy._legacy(text); flash(); });
	} else { ninja.copy._legacy(text); flash(); }
};
ninja.copy._legacy = function(text) {
	var ta = document.createElement('textarea');
	ta.value = text;
	ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
	document.body.appendChild(ta); ta.select();
	try { document.execCommand('copy'); } catch(e) {}
	document.body.removeChild(ta);
};
ninja.copy._icon = '<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x=".5" y="3.5" width="8.5" height="9" rx="1.5" stroke="currentColor" stroke-width="1.2"/><rect x="3.5" y=".5" width="8.5" height="9" rx="1.5" fill="var(--bg-card)" stroke="currentColor" stroke-width="1.2"/></svg>';

ninja.getQueryString = function () {
	var result = {}, queryString = location.search.substring(1), re = /([^&=]+)=([^&]*)/g, m;
	while (m = re.exec(queryString)) {
		result[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
	}
	return result;
};

// use when passing an Array of Functions
ninja.runSerialized = function (functions, onComplete) {
	onComplete = onComplete || function () { };

	if (functions.length === 0) onComplete();
	else {
		// run the first function, and make it call this
		// function when finished with the rest of the list
		var f = functions.shift();
		f(function () { ninja.runSerialized(functions, onComplete); });
	}
};

ninja.forSerialized = function (initial, max, whatToDo, onComplete) {
	onComplete = onComplete || function () { };

	if (initial === max) { onComplete(); }
	else {
		// same idea as runSerialized
		whatToDo(initial, function () { ninja.forSerialized(++initial, max, whatToDo, onComplete); });
	}
};

// use when passing an Object (dictionary) of Functions
ninja.foreachSerialized = function (collection, whatToDo, onComplete) {
	var keys = [];
	for (var name in collection) {
		keys.push(name);
	}
	ninja.forSerialized(0, keys.length, function (i, callback) {
		whatToDo(keys[i], callback);
	}, onComplete);
};