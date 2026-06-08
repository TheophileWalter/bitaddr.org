/*
 * ninja.seeder - Auxiliary entropy collection from mouse and keyboard events.
 *
 * The browser CSPRNG (window.crypto.getRandomValues) is the primary and
 * sufficient source of randomness.  This seeder exists ONLY as a
 * defence-in-depth measure: if the browser CSPRNG were ever compromised,
 * the collected interaction entropy is mixed in via SHA-256 inside
 * SecureRandom.nextBytes(), ensuring generated keys remain strong.
 *
 * User-interaction entropy can only improve key quality, never weaken it.
 * Entropy values are never displayed on screen.
 */

ninja.seeder = {
	// Randomised target (50–100 events) so completion timing cannot be
	// predicted by an observer watching network traffic or screen.
	seedLimit: (function () {
		var b = new Uint8Array(1);
		window.crypto.getRandomValues(b);
		return 100 + (b[0] % 101);
	}()),

	seedCount: 0,
	lastInputTime: 0,
	isStillSeeding: true,
	seederDependentWallets: ["singlewallet", "paperwallet", "bulkwallet", "vanitywallet", "splitwallet"],

	// Called from ninja.onload.js once all scripts are loaded.
	start: function () {
		ninja.seeder.lastInputTime = Date.now();
		// The #generate overlay is visible by default (CSS: display flex).
		// Mouse events are bound via onmousemove on <body>.
		// Keyboard events are bound via onkeydown on #generatekeyinput.
	},

	// Bound to body onmousemove - collects coordinates and timing.
	seed: function (evt) {
		if (!ninja.seeder.isStillSeeding) return;
		var now = Date.now();
		if (now - ninja.seeder.lastInputTime < 40) return; // throttle: ≥ 40 ms apart
		ninja.seeder.lastInputTime = now;

		var x = evt.clientX || 0;
		var y = evt.clientY || 0;
		SecureRandom.mixEntropy([
			x & 0xff, (x >> 8) & 0xff,
			y & 0xff, (y >> 8) & 0xff,
			now & 0xff, (now >> 8) & 0xff, (now >> 16) & 0xff, (now >> 24) & 0xff
		]);
		ninja.seeder._advance();
	},

	// Bound to #generatekeyinput onkeydown - collects key identity and timing.
	seedKeyPress: function (evt) {
		if (!ninja.seeder.isStillSeeding) return;
		var now = Date.now();
		var which = evt.which || evt.keyCode || 0;
		// Inter-keystroke interval carries ~6–8 bits of human-sourced entropy.
		var dt = now - ninja.seeder.lastInputTime;
		ninja.seeder.lastInputTime = now;
		SecureRandom.mixEntropy([
			which & 0xff,
			dt & 0xff, (dt >> 8) & 0xff,
			now & 0xff, (now >> 8) & 0xff
		]);
		ninja.seeder._advance();
	},

	_advance: function () {
		ninja.seeder.seedCount++;
		ninja.seeder._updateProgress();
		if (ninja.seeder.seedCount === ninja.seeder.seedLimit) {
			// Delay slightly so the progress bar transition reaches 100% before hiding.
			setTimeout(function () { ninja.seeder.seedingOver(); }, 400);
		}
	},

	_updateProgress: function () {
		var pct = Math.min(100, Math.round((ninja.seeder.seedCount / ninja.seeder.seedLimit) * 100));
		var fill = document.getElementById("entropyprogressfill");
		if (fill) fill.style.width = pct + "%";
		var bar = document.getElementById("entropyprogressbar");
		if (bar) bar.setAttribute("aria-valuenow", pct);
		var label = document.getElementById("mousemovelimit");
		if (label) label.innerHTML = pct + "%";
	},

	seedingOver: function () {
		ninja.seeder.isStillSeeding = false;
		var gen = document.getElementById("generate");
		if (gen) gen.style.display = "none";
		var menu = document.getElementById("menu");
		if (menu) menu.classList.remove("seeding");
		ninja.status.unitTests();
		var walletType = ninja.tab.whichIsOpen();
		if (walletType == null) {
			ninja.tab.select("singlewallet");
		} else {
			ninja.tab.select(walletType);
		}
		var culture = ninja.getQueryString()["culture"] || ninja.translator.currentCulture;
		ninja.translator.translate(culture);
	}
};
