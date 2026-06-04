(function (Bitcoin) {
	Bitcoin.Base58 = {
		alphabet: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
		validRegex: /^[1-9A-HJ-NP-Za-km-z]+$/,

		encode: function (input) {
			var leadingZeros = 0;
			for (var i = 0; i < input.length && input[i] === 0; i++) leadingZeros++;
			var hex = input.map(function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
			var n = hex.length ? BigInt('0x' + hex) : 0n;
			var result = '';
			while (n > 0n) {
				result = B58.alphabet[Number(n % 58n)] + result;
				n /= 58n;
			}
			for (var i = 0; i < leadingZeros; i++) result = '1' + result;
			return result;
		},

		decode: function (input) {
			var leadingZeros = 0;
			for (var i = 0; i < input.length && input[i] === '1'; i++) leadingZeros++;
			var n = 0n;
			for (var i = 0; i < input.length; i++) {
				var idx = B58.alphabet.indexOf(input[i]);
				if (idx < 0) throw "Invalid Base58 character: '" + input[i] + "'";
				n = n * 58n + BigInt(idx);
			}
			var hex = n.toString(16);
			if (hex.length % 2) hex = '0' + hex;
			var bytes = n > 0n ? hex.match(/.{2}/g).map(function (h) { return parseInt(h, 16); }) : [];
			while (leadingZeros-- > 0) bytes.unshift(0);
			return bytes;
		}
	};

	var B58 = Bitcoin.Base58;
})(
	'undefined' != typeof Bitcoin ? Bitcoin : module.exports
);
