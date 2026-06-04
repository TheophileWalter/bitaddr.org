#!/usr/bin/env node
// Simple build script — equivalent to `grunt` (grunt 0.4.x is incompatible with Node ≥ 18)
// Usage: node build.js

const fs = require('fs');

const tokens = [
	{ token: '//biginteger.js',            file: './src/biginteger.js' },
	{ token: '//bitcoinjs-lib.js',         file: './src/bitcoinjs-lib.js' },
	{ token: '//bitcoinjs-lib.address.js', file: './src/bitcoinjs-lib.address.js' },
	{ token: '//bitcoinjs-lib.base58.js',  file: './src/bitcoinjs-lib.base58.js' },
	{ token: '//bitcoinjs-lib.ecdsa.js',   file: './src/bitcoinjs-lib.ecdsa.js' },
	{ token: '//bitcoinjs-lib.eckey.js',   file: './src/bitcoinjs-lib.eckey.js' },
	{ token: '//bitcoinjs-lib.util.js',    file: './src/bitcoinjs-lib.util.js' },
	{ token: '//cryptojs.js',              file: './src/cryptojs.js' },
	{ token: '//cryptojs.sha256.js',       file: './src/cryptojs.sha256.js' },
	{ token: '//cryptojs.pbkdf2.js',       file: './src/cryptojs.pbkdf2.js' },
	{ token: '//cryptojs.hmac.js',         file: './src/cryptojs.hmac.js' },
	{ token: '//cryptojs.aes.js',          file: './src/cryptojs.aes.js' },
	{ token: '//cryptojs.blockmodes.js',   file: './src/cryptojs.blockmodes.js' },
	{ token: '//cryptojs.ripemd160.js',    file: './src/cryptojs.ripemd160.js' },
	{ token: '//crypto-scrypt.js',         file: './src/crypto-scrypt.js' },
	{ token: '//ellipticcurve.js',         file: './src/ellipticcurve.js' },
	{ token: '//secrets.js',               file: './src/secrets.js' },
	{ token: '//ninja.key.js',             file: './src/ninja.key.js' },
	{ token: '//ninja.misc.js',            file: './src/ninja.misc.js' },
	{ token: '//ninja.onload.js',          file: './src/ninja.onload.js' },
	{ token: '//ninja.qrcode.js',          file: './src/ninja.qrcode.js' },
	{ token: '//ninja.seeder.js',          file: './src/ninja.seeder.js' },
	{ token: '//ninja.unittests.js',       file: './src/ninja.unittests.js' },
	{ token: '//ninja.translator.js',      file: './src/ninja.translator.js' },
	{ token: '//ninja.singlewallet.js',    file: './src/ninja.singlewallet.js' },
	{ token: '//ninja.paperwallet.js',     file: './src/ninja.paperwallet.js' },
	{ token: '//ninja.bulkwallet.js',      file: './src/ninja.bulkwallet.js' },
	{ token: '//ninja.brainwallet.js',     file: './src/ninja.brainwallet.js' },
	{ token: '//ninja.vanitywallet.js',    file: './src/ninja.vanitywallet.js' },
	{ token: '//ninja.splitwallet.js',     file: './src/ninja.splitwallet.js' },
	{ token: '//ninja.detailwallet.js',    file: './src/ninja.detailwallet.js' },
	{ token: '//qrcode.js',               file: './src/qrcode.js' },
	{ token: '//securerandom.js',          file: './src/securerandom.js' },
	{ token: '//main.css',                 file: './src/main.css' },
	{ token: '//cs.js',                    file: './src/culture/cs.js' },
	{ token: '//de.js',                    file: './src/culture/de.js' },
	{ token: '//el.js',                    file: './src/culture/el.js' },
	{ token: '//es.js',                    file: './src/culture/es.js' },
	{ token: '//fr.js',                    file: './src/culture/fr.js' },
	{ token: '//hu.js',                    file: './src/culture/hu.js' },
	{ token: '//it.js',                    file: './src/culture/it.js' },
	{ token: '//jp.js',                    file: './src/culture/jp.js' },
	{ token: '//pt-br.js',                file: './src/culture/pt-br.js' },
	{ token: '//ru.js',                    file: './src/culture/ru.js' },
	{ token: '//zh-cn.js',                 file: './src/culture/zh-cn.js' },
];

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
let html = fs.readFileSync('./src/bitaddr-ui.html', 'utf8');

for (const { token, file } of tokens) {
	html = html.replace(token, fs.readFileSync(file, 'utf8'));
}

html = html.replace(/\/\/version/g, pkg.version);
html = html.replace(/\r\n/g, '\n');

fs.writeFileSync('./bitaddr.org.html', html, 'utf8');
console.log('Build OK → bitaddr.org.html');
