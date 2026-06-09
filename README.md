# [bitaddr.org](https://bitaddr.org)
JavaScript Client-Side Bitcoin Wallet Generator

This project is a fork of [bitaddress.org](https://github.com/pointbiz/bitaddress.org) by pointbiz,
maintained and extended by Théophile Walter.

The [bitaddr.org](https://bitaddr.org) project provides an all-in-one HTML document with embedded
JavaScript/CSS/Images. The JavaScript is readable, not minified, and contains no
XMLHttpRequest's (no AJAX). The benefit of this technique is you can load the
JavaScript locally and trust that the JavaScript did not change after being loaded.

Improvements compared to the original:

- **Modern address support** — Native SegWit (bc1q…) and Taproot (bc1p…) addresses across all wallet types (Single, Brain, Split, Bulk, Detail).
- **Hardened cryptography** — Custom BigInteger and EllipticCurve code fully replaced by [noble-secp256k1](https://github.com/paulmillr/noble-secp256k1) (audited, MIT). Private keys stored as `Uint8Array(32)`, deterministic RFC 6979 signatures, no custom scalar arithmetic.
- **Responsive dark/light theme** — Fully redesigned UI with mobile-first layout, dark/light mode toggle, and paper wallets that scale correctly on all screen sizes.
- **UX polish** — Copy-to-clipboard buttons on all addresses and keys, paper wallets rendered in SVG (fully vector, never blurry at any print size), print views cleaned up (no form elements, no copy buttons), bulk wallet renders all rows when printed.
- **Performance** — Bulk wallet generation optimised from O(n²) to O(n) (key pool deduplication via `Set`, debounced textarea updates).

Project structure:
```
src/
├── crypto/   noble-secp256k1, CryptoJS (SHA-256, AES, RIPEMD-160, PBKDF2, HMAC), scrypt, ECDSA bridge
├── wallet/   address formats, Base58, ECKey, BIP38, split wallet, secrets.js
├── ui/       HTML template, CSS, wallet panels, QR code, seeder, translations
└── tests/    unit tests (73 synchronous tests)
```

Build: `node build.js` - produces a single self-contained `bitaddr.org.html`.
Tests: `node run-tests.js` - runs all 73 tests in Node.js (no browser required).


Please send DONATIONS for this project to Bitcoin Address:
bc1qx4z2w9lmudccutv79jze0zzdcmg7mxxj7jd3k4


END USER NOTES:

 1) For Bulk Wallet I recommended using Google Chrome, it's the fastest.

 2) Requires a modern browser with sufficient JavaScript support.

 3) DO NOT use Opera Mini it renders JavaScript output server side, therefore
    they might record the private key you generated.

 4) BIP38 most likely will not work on mobile devices due to hardware limitations.


Notice of Copyrights and Licenses:
---------------------------------------
This project is a fork of bitaddress.org by pointbiz.
Original repository: https://github.com/pointbiz/bitaddress.org

The [bitaddr.org](https://bitaddr.org) project, software and embedded resources are copyright Théophile Walter.
The [bitaddr.org](https://bitaddr.org) name and logo are not part of the open source license.

Portions of the all-in-one HTML document contain JavaScript codes that are the
copyrights of others. The individual copyrights are included throughout the document
along with their licenses. Included JavaScript libraries are separated with HTML
script tags.

Summary of JavaScript functions with a redistributable license:

JavaScript function      | License
----------------------- | ---------------
window.Crypto           | BSD License
window.SecureRandom     | BSD License
window.nobleSecp256k1   | MIT License
window.QRCode           | MIT License
window.Bitcoin          | MIT License
window.Crypto_scrypt    | MIT License

The [bitaddr.org](https://bitaddr.org) software is available under The MIT License (MIT)
Copyright (c) 2011-2016 bitaddress.org (pointbiz)
Copyright (c) 2026 Théophile Walter

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
