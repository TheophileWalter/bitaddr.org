#!/usr/bin/env node
// Simple build script — equivalent to `grunt` (grunt 0.4.x is incompatible with Node ≥ 18)
// Usage: node build.js

const fs = require('fs');

// Module layout:
//   src/crypto/   — cryptographic primitives (noble, biginteger, CryptoJS, ECC, ECDSA)
//   src/wallet/   — wallet logic (address formats, ECKey, BIP38, key helpers)
//   src/ui/       — wallet UI wallets, CSS, HTML template, translations
//   src/tests/    — unit tests

const tokens = [
	// noble-secp256k1 must be loaded first — ECDSA, ECKey and EllipticCurve all depend on it
	{ token: '//noble-secp256k1.js',       file: './src/crypto/noble-secp256k1.js' },
	{ token: '//biginteger.js',            file: './src/crypto/biginteger.js' },
	{ token: '//bitcoinjs-lib.js',         file: './src/wallet/bitcoinjs-lib.js' },
	{ token: '//bitcoinjs-lib.address.js', file: './src/wallet/bitcoinjs-lib.address.js' },
	{ token: '//bitcoinjs-lib.base58.js',  file: './src/wallet/bitcoinjs-lib.base58.js' },
	{ token: '//bitcoinjs-lib.ecdsa.js',   file: './src/crypto/bitcoinjs-lib.ecdsa.js' },
	{ token: '//bitcoinjs-lib.eckey.js',   file: './src/wallet/bitcoinjs-lib.eckey.js' },
	{ token: '//bitcoinjs-lib.util.js',    file: './src/wallet/bitcoinjs-lib.util.js' },
	{ token: '//cryptojs.js',              file: './src/crypto/cryptojs.js' },
	{ token: '//cryptojs.sha256.js',       file: './src/crypto/cryptojs.sha256.js' },
	{ token: '//cryptojs.pbkdf2.js',       file: './src/crypto/cryptojs.pbkdf2.js' },
	{ token: '//cryptojs.hmac.js',         file: './src/crypto/cryptojs.hmac.js' },
	{ token: '//cryptojs.aes.js',          file: './src/crypto/cryptojs.aes.js' },
	{ token: '//cryptojs.blockmodes.js',   file: './src/crypto/cryptojs.blockmodes.js' },
	{ token: '//cryptojs.ripemd160.js',    file: './src/crypto/cryptojs.ripemd160.js' },
	{ token: '//crypto-scrypt.js',         file: './src/crypto/crypto-scrypt.js' },
	{ token: '//ellipticcurve.js',         file: './src/crypto/ellipticcurve.js' },
	{ token: '//secrets.js',               file: './src/wallet/secrets.js' },
	{ token: '//ninja.key.js',             file: './src/wallet/ninja.key.js' },
	{ token: '//ninja.misc.js',            file: './src/ui/ninja.misc.js' },
	{ token: '//ninja.onload.js',          file: './src/ui/ninja.onload.js' },
	{ token: '//ninja.qrcode.js',          file: './src/ui/ninja.qrcode.js' },
	{ token: '//ninja.seeder.js',          file: './src/ui/ninja.seeder.js' },
	{ token: '//ninja.unittests.js',       file: './src/tests/ninja.unittests.js' },
	{ token: '//ninja.translator.js',      file: './src/ui/ninja.translator.js' },
	{ token: '//ninja.singlewallet.js',    file: './src/ui/ninja.singlewallet.js' },
	{ token: '//ninja.paperwallet.js',     file: './src/ui/ninja.paperwallet.js' },
	{ token: '//ninja.bulkwallet.js',      file: './src/ui/ninja.bulkwallet.js' },
	{ token: '//ninja.brainwallet.js',     file: './src/ui/ninja.brainwallet.js' },
	{ token: '//ninja.vanitywallet.js',    file: './src/ui/ninja.vanitywallet.js' },
	{ token: '//ninja.splitwallet.js',     file: './src/ui/ninja.splitwallet.js' },
	{ token: '//ninja.detailwallet.js',    file: './src/ui/ninja.detailwallet.js' },
	{ token: '//qrcode.js',               file: './src/ui/qrcode.js' },
	{ token: '//securerandom.js',          file: './src/crypto/securerandom.js' },
	{ token: '//main.css',                 file: './src/ui/main.css' },
	{ token: '//cs.js',                    file: './src/ui/culture/cs.js' },
	{ token: '//de.js',                    file: './src/ui/culture/de.js' },
	{ token: '//el.js',                    file: './src/ui/culture/el.js' },
	{ token: '//es.js',                    file: './src/ui/culture/es.js' },
	{ token: '//fr.js',                    file: './src/ui/culture/fr.js' },
	{ token: '//hu.js',                    file: './src/ui/culture/hu.js' },
	{ token: '//it.js',                    file: './src/ui/culture/it.js' },
	{ token: '//jp.js',                    file: './src/ui/culture/jp.js' },
	{ token: '//pt-br.js',                file: './src/ui/culture/pt-br.js' },
	{ token: '//ru.js',                    file: './src/ui/culture/ru.js' },
	{ token: '//zh-cn.js',                 file: './src/ui/culture/zh-cn.js' },
];

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
let html = fs.readFileSync('./src/ui/bitaddr-ui.html', 'utf8');

for (const { token, file } of tokens) {
	html = html.replace(token, fs.readFileSync(file, 'utf8'));
}

html = html.replace(/\/\/version/g, pkg.version);
html = html.replace(/\r\n/g, '\n');

fs.writeFileSync('./bitaddr.org.html', html, 'utf8');
console.log('Build OK → bitaddr.org.html');
