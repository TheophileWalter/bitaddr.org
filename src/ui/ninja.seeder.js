// All entropy comes from window.crypto.getRandomValues — no interactive seeding.
// This object is kept for API compatibility (ninja.seeder.isStillSeeding is checked
// by ninja.tab.select and other callers).
ninja.seeder = {
	isStillSeeding: false,
	seederDependentWallets: ["singlewallet", "paperwallet", "bulkwallet", "vanitywallet", "splitwallet"],

	seedingOver: function () {
		ninja.seeder.isStillSeeding = false;
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

// seedingOver() is called from ninja.onload.js, after all scripts are loaded.
