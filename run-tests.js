#!/usr/bin/env node
// Run synchronous unit tests from the built bitaddr.org.html in a Node.js VM.
// Key constraints (learned from prior debugging):
//   - ctx.self = ctx          : required for noble's CSPRNG detection
//   - no host intrinsics      : injecting String/Array/Object/etc. breaks CryptoJS
//                               cross-realm constructor checks (message.constructor == String)

const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('./bitaddr.org.html', 'utf8');

// Extract all inline <script> blocks (the build inlines everything)
const scripts = [];
const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
let m;
while ((m = re.exec(html)) !== null) {
	if (m[1].trim()) scripts.push(m[1]);
}

// Minimal browser environment - only what the code actually needs.
// Do NOT inject host String/Array/Object/JSON/Error etc. - CryptoJS uses
// `message.constructor == String` which breaks when the String comes from
// a different realm (the host) rather than the VM's own String constructor.
const ctx = vm.createContext({
	// window / global aliases
	navigator: { appName: 'Node', appVersion: '', userAgent: '', language: 'en-US', languages: ['en-US'] },
	document: {
		getElementById: function (id) { return { id: id, className: '', innerHTML: '', style: {}, value: '', getAttribute: function (a) { return a === 'id' ? id : null; }, setAttribute: function () {} }; },
		querySelectorAll: function () { return []; },
		querySelector: function () { return null; },
		addEventListener: function () {},
		createElementNS: function () { return {}; },
		documentElement: { setAttribute: function () {}, getAttribute: function () { return null; } },
	},
	location: { href: '', search: '' },
	setTimeout: setTimeout,
	clearTimeout: clearTimeout,
	setInterval: setInterval,
	clearInterval: clearInterval,
	console: console,
	localStorage: { getItem: function () { return null; }, setItem: function () {} },
	// CSPRNG - noble detects: typeof self === 'object' && 'crypto' in self
	crypto: require('crypto').webcrypto,
});
// self must point to ctx itself (noble checks `self.crypto`)
ctx.self = ctx;
ctx.window = ctx;

// Run all scripts in sequence
for (let idx = 0; idx < scripts.length; idx++) {
	const src = scripts[idx];
	try {
		vm.runInContext(src, ctx);
	} catch (e) {
		console.error('Script #' + idx + ' error:', e.message);
		console.error('Script start:', src.trim().slice(0, 200));
		if (e.stack) console.error(e.stack.split('\n').slice(0, 5).join('\n'));
		process.exit(1);
	}
}

// Run tests
const { passCount, testCount } = ctx.ninja.unitTests.runSynchronousTests(false);
console.log(passCount + '/' + testCount + ' tests passed');
process.exit(passCount < testCount ? 1 : 0);
