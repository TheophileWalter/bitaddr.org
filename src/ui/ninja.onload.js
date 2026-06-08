// All scripts loaded - start entropy collection.
// seedingOver() is called internally once enough mouse/keyboard events have
// been collected; the #generate overlay hides at that point.
ninja.seeder.start();

// sync theme toggle button with the theme applied by the inline head script
ninja.theme.init();
// run unit tests
if (ninja.getQueryString()["unittests"] == "true" || ninja.getQueryString()["unittests"] == "1") {
	ninja.unitTests.runSynchronousTests(true);
	ninja.translator.showEnglishJson();
}
// run async unit tests
if (ninja.getQueryString()["asyncunittests"] == "true" || ninja.getQueryString()["asyncunittests"] == "1") {
	ninja.unitTests.runAsynchronousTests(true);
}
// change language - priority: URL param > localStorage > browser language
ninja.translator.extractEnglishFromDomAndUpdateDictionary();
if (ninja.getQueryString()["culture"] != undefined) {
	ninja.translator.translate(ninja.getQueryString()["culture"]);
} else {
	var savedLang = null;
	try { savedLang = localStorage.getItem('bitaddr-lang'); } catch(e) {}
	if (savedLang && !ninja.translator.translate(savedLang)) {
		ninja.translator.autoDetectTranslation();
	} else if (!savedLang) {
		ninja.translator.autoDetectTranslation();
	}
}
// testnet, check if testnet edition should be activated
if (ninja.getQueryString()["testnet"] == "true" || ninja.getQueryString()["testnet"] == "1") {
	document.getElementById("testnet").innerHTML = ninja.translator.get("testneteditionactivated");
	document.getElementById("testnet").style.display = "block";
	document.getElementById("detailwifprefix").innerHTML = "'9'";
	document.getElementById("detailcompwifprefix").innerHTML = "'c'";
	Bitcoin.Address.networkVersion = 0x6F; // testnet
	Bitcoin.ECKey.privateKeyPrefix = 0xEF; // testnet
	ninja.testnetMode = true;
}
// showseedpool URL parameter removed - the entropy pool is never exposed in the UI