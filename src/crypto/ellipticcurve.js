//https://raw.github.com/bitcoinjs/bitcoinjs-lib/faa10f0f6a1fff0b9a99fffb9bc30cee33b17212/src/ecdsa.js
/*!
* Basic Javascript Elliptic Curve implementation
* Ported loosely from BouncyCastle's Java EC code
* Only Fp curves implemented for now
* 
* Copyright Tom Wu, bitaddr.org  BSD License.
* http://www-cs-students.stanford.edu/~tjw/jsbn/LICENSE
*/
(function () {

	// Constructor function of Global EllipticCurve object
	var ec = window.EllipticCurve = function () { };


	// ----------------
	// ECFieldElementFp constructor
	// q instanceof BigInteger
	// x instanceof BigInteger
	ec.FieldElementFp = function (q, x) {
		// Normalise x into [0, q) — handles both negative values and x ≥ q that
		// can arise from intermediate arithmetic (e.g. q.subtract(0) == q).
		this.x = (x.signum() < 0 || x.compareTo(q) >= 0) ? x.mod(q) : x;
		this.q = q;
	};

	ec.FieldElementFp.prototype.equals = function (other) {
		if (other == this) return true;
		return (this.q.equals(other.q) && this.x.equals(other.x));
	};

	ec.FieldElementFp.prototype.toBigInteger = function () {
		return this.x;
	};

	ec.FieldElementFp.prototype.negate = function () {
		return new ec.FieldElementFp(this.q, this.x.negate().mod(this.q));
	};

	ec.FieldElementFp.prototype.add = function (b) {
		return new ec.FieldElementFp(this.q, this.x.add(b.toBigInteger()).mod(this.q));
	};

	ec.FieldElementFp.prototype.subtract = function (b) {
		return new ec.FieldElementFp(this.q, this.x.subtract(b.toBigInteger()).mod(this.q));
	};

	ec.FieldElementFp.prototype.multiply = function (b) {
		return new ec.FieldElementFp(this.q, this.x.multiply(b.toBigInteger()).mod(this.q));
	};

	ec.FieldElementFp.prototype.square = function () {
		return new ec.FieldElementFp(this.q, this.x.square().mod(this.q));
	};

	ec.FieldElementFp.prototype.divide = function (b) {
		return new ec.FieldElementFp(this.q, this.x.multiply(b.toBigInteger().modInverse(this.q)).mod(this.q));
	};

	ec.FieldElementFp.prototype.getByteLength = function () {
		return Math.floor((this.toBigInteger().bitLength() + 7) / 8);
	};

	// ----------------
	// ECPointFp constructor
	ec.PointFp = function (curve, x, y, z, compressed) {
		this.curve = curve;
		this.x = x;
		this.y = y;
		// Projective coordinates: either zinv == null or z * zinv == 1
		// z and zinv are just BigIntegers, not fieldElements
		if (z == null) {
			this.z = BigInteger.ONE;
		}
		else {
			this.z = z;
		}
		this.zinv = null;
		// compression flag
		this.compressed = !!compressed;
	};

	ec.PointFp.prototype.getX = function () {
		if (this.zinv == null) {
			this.zinv = this.z.modInverse(this.curve.q);
		}
		var r = this.x.toBigInteger().multiply(this.zinv);
		this.curve.reduce(r);
		return this.curve.fromBigInteger(r);
	};

	ec.PointFp.prototype.getY = function () {
		if (this.zinv == null) {
			this.zinv = this.z.modInverse(this.curve.q);
		}
		var r = this.y.toBigInteger().multiply(this.zinv);
		this.curve.reduce(r);
		return this.curve.fromBigInteger(r);
	};

	ec.PointFp.prototype.equals = function (other) {
		if (other == this) return true;
		if (this.isInfinity()) return other.isInfinity();
		if (other.isInfinity()) return this.isInfinity();
		var u, v;
		// u = Y2 * Z1 - Y1 * Z2
		u = other.y.toBigInteger().multiply(this.z).subtract(this.y.toBigInteger().multiply(other.z)).mod(this.curve.q);
		if (!u.equals(BigInteger.ZERO)) return false;
		// v = X2 * Z1 - X1 * Z2
		v = other.x.toBigInteger().multiply(this.z).subtract(this.x.toBigInteger().multiply(other.z)).mod(this.curve.q);
		return v.equals(BigInteger.ZERO);
	};

	ec.PointFp.prototype.isInfinity = function () {
		if ((this.x == null) && (this.y == null)) return true;
		return this.z.equals(BigInteger.ZERO) && !this.y.toBigInteger().equals(BigInteger.ZERO);
	};

	ec.PointFp.prototype.negate = function () {
		return new ec.PointFp(this.curve, this.x, this.y.negate(), this.z);
	};

	ec.PointFp.prototype.add = function (b) {
		if (this.isInfinity()) return b;
		if (b.isInfinity()) return this;

		// u = Y2 * Z1 - Y1 * Z2
		var u = b.y.toBigInteger().multiply(this.z).subtract(this.y.toBigInteger().multiply(b.z)).mod(this.curve.q);
		// v = X2 * Z1 - X1 * Z2
		var v = b.x.toBigInteger().multiply(this.z).subtract(this.x.toBigInteger().multiply(b.z)).mod(this.curve.q);


		if (BigInteger.ZERO.equals(v)) {
			if (BigInteger.ZERO.equals(u)) {
				return this.twice(); // this == b, so double
			}
			return this.curve.getInfinity(); // this = -b, so infinity
		}

		var THREE = new BigInteger("3");
		var x1 = this.x.toBigInteger();
		var y1 = this.y.toBigInteger();
		var x2 = b.x.toBigInteger();
		var y2 = b.y.toBigInteger();

		var v2 = v.square();
		var v3 = v2.multiply(v);
		var x1v2 = x1.multiply(v2);
		var zu2 = u.square().multiply(this.z);

		// x3 = v * (z2 * (z1 * u^2 - 2 * x1 * v^2) - v^3)
		var x3 = zu2.subtract(x1v2.shiftLeft(1)).multiply(b.z).subtract(v3).multiply(v).mod(this.curve.q);
		// y3 = z2 * (3 * x1 * u * v^2 - y1 * v^3 - z1 * u^3) + u * v^3
		var y3 = x1v2.multiply(THREE).multiply(u).subtract(y1.multiply(v3)).subtract(zu2.multiply(u)).multiply(b.z).add(u.multiply(v3)).mod(this.curve.q);
		// z3 = v^3 * z1 * z2
		var z3 = v3.multiply(this.z).multiply(b.z).mod(this.curve.q);

		return new ec.PointFp(this.curve, this.curve.fromBigInteger(x3), this.curve.fromBigInteger(y3), z3);
	};

	ec.PointFp.prototype.twice = function () {
		if (this.isInfinity()) return this;
		if (this.y.toBigInteger().signum() == 0) return this.curve.getInfinity();

		// TODO: optimized handling of constants
		var THREE = new BigInteger("3");
		var x1 = this.x.toBigInteger();
		var y1 = this.y.toBigInteger();

		var y1z1 = y1.multiply(this.z);
		var y1sqz1 = y1z1.multiply(y1).mod(this.curve.q);
		var a = this.curve.a.toBigInteger();

		// w = 3 * x1^2 + a * z1^2
		var w = x1.square().multiply(THREE);
		if (!BigInteger.ZERO.equals(a)) {
			w = w.add(this.z.square().multiply(a));
		}
		w = w.mod(this.curve.q);
		//this.curve.reduce(w);
		// x3 = 2 * y1 * z1 * (w^2 - 8 * x1 * y1^2 * z1)
		var x3 = w.square().subtract(x1.shiftLeft(3).multiply(y1sqz1)).shiftLeft(1).multiply(y1z1).mod(this.curve.q);
		// y3 = 4 * y1^2 * z1 * (3 * w * x1 - 2 * y1^2 * z1) - w^3
		var y3 = w.multiply(THREE).multiply(x1).subtract(y1sqz1.shiftLeft(1)).shiftLeft(2).multiply(y1sqz1).subtract(w.square().multiply(w)).mod(this.curve.q);
		// z3 = 8 * (y1 * z1)^3
		var z3 = y1z1.square().multiply(y1z1).shiftLeft(3).mod(this.curve.q);

		return new ec.PointFp(this.curve, this.curve.fromBigInteger(x3), this.curve.fromBigInteger(y3), z3);
	};

	// Simple NAF (Non-Adjacent Form) multiplication algorithm
	// TODO: modularize the multiplication algorithm
	ec.PointFp.prototype.multiply = function (k) {
		if (this.isInfinity()) return this;
		if (k.signum() == 0) return this.curve.getInfinity();

		var e = k;
		var h = e.multiply(new BigInteger("3"));

		var neg = this.negate();
		var R = this;

		var i;
		for (i = h.bitLength() - 2; i > 0; --i) {
			R = R.twice();

			var hBit = h.testBit(i);
			var eBit = e.testBit(i);

			if (hBit != eBit) {
				R = R.add(hBit ? this : neg);
			}
		}

		return R;
	};

	// patched by bitaddr.org and Casascius for use with Bitcoin.ECKey
	// patched by coretechs to support compressed public keys
	ec.PointFp.prototype.getEncoded = function (compressed) {
		var x = this.getX().toBigInteger();
		var y = this.getY().toBigInteger();
		var len = 32; // integerToBytes will zero pad if integer is less than 32 bytes. 32 bytes length is required by the Bitcoin protocol.
		var enc = ec.integerToBytes(x, len);

		// when compressed prepend byte depending if y point is even or odd 
		if (compressed) {
			if (y.isEven()) {
				enc.unshift(0x02);
			}
			else {
				enc.unshift(0x03);
			}
		}
		else {
			enc.unshift(0x04);
			enc = enc.concat(ec.integerToBytes(y, len)); // uncompressed public key appends the bytes of the y point
		}
		return enc;
	};

	ec.PointFp.decodeFrom = function (curve, enc) {
		var type = enc[0];
		var dataLen = enc.length - 1;

		// Extract x and y as byte arrays
		var xBa = enc.slice(1, 1 + dataLen / 2);
		var yBa = enc.slice(1 + dataLen / 2, 1 + dataLen);

		// Prepend zero byte to prevent interpretation as negative integer
		xBa.unshift(0);
		yBa.unshift(0);

		// Convert to BigIntegers
		var x = new BigInteger(xBa);
		var y = new BigInteger(yBa);

		// Return point
		return new ec.PointFp(curve, curve.fromBigInteger(x), curve.fromBigInteger(y));
	};

	ec.PointFp.prototype.toString = function () {
		return '(' + this.getX().toBigInteger().toString() + ',' + this.getY().toBigInteger().toString() + ')';
	};

	/**
	* Validate an elliptic curve point.
	*
	* See SEC 1, section 3.2.2.1: Elliptic Curve Public Key Validation Primitive
	*/
	/*
	 * Validate a public key point.
	 * Delegates to noble-secp256k1 which enforces:
	 *   - prefix byte canonical (02/03/04)
	 *   - coordinates in [0, p)
	 *   - point satisfies y² ≡ x³ + 7 (mod p)
	 *   - point is not at infinity
	 * For secp256k1 (cofactor h=1) every point on the curve is in the
	 * prime-order subgroup, so no separate nQ=O check is needed.
	 */
	ec.PointFp.prototype.validate = function () {
		if (this.isInfinity()) {
			throw new Error("Point is at infinity.");
		}
		// Encode to compressed bytes and let noble do the authoritative check
		var encoded = this.getEncoded(1);
		var hex = Crypto.util.bytesToHex(encoded).toUpperCase();
		nobleSecp256k1.Point.fromHex(hex); // throws on any invalid input
		return true;
	};




	// ----------------
	// ECCurveFp constructor
	ec.CurveFp = function (q, a, b) {
		this.q = q;
		this.a = this.fromBigInteger(a);
		this.b = this.fromBigInteger(b);
		this.infinity = new ec.PointFp(this, null, null);
		this.reducer = new Barrett(this.q);
	}

	ec.CurveFp.prototype.getQ = function () {
		return this.q;
	};

	ec.CurveFp.prototype.getA = function () {
		return this.a;
	};

	ec.CurveFp.prototype.getB = function () {
		return this.b;
	};

	ec.CurveFp.prototype.equals = function (other) {
		if (other == this) return true;
		return (this.q.equals(other.q) && this.a.equals(other.a) && this.b.equals(other.b));
	};

	ec.CurveFp.prototype.getInfinity = function () {
		return this.infinity;
	};

	ec.CurveFp.prototype.fromBigInteger = function (x) {
		return new ec.FieldElementFp(this.q, x);
	};

	ec.CurveFp.prototype.reduce = function (x) {
		this.reducer.reduce(x);
	};

	// Decode a hex-encoded public key point.
	// noble-secp256k1 is the authoritative decoder for all cases:
	// decompression (02/03), uncompressed validation (04), and on-curve check.
	// Hybrid encoding (06/07) is rejected by noble automatically.
	ec.CurveFp.prototype.decodePointHex = function (s) {
		var firstByte = parseInt(s.substr(0, 2), 16);
		if (firstByte === 0) return this.infinity;
		// Delegate to noble: handles 02/03/04, validates on-curve, rejects 06/07
		var np = nobleSecp256k1.Point.fromHex(s.toUpperCase());
		var xBig = new BigInteger(np.x.toString(16), 16);
		var yBig = new BigInteger(np.y.toString(16), 16);
		var compressed = (firstByte === 2 || firstByte === 3);
		return new ec.PointFp(this, this.fromBigInteger(xBig), this.fromBigInteger(yBig), null, compressed);
	};

	ec.CurveFp.prototype.encodePointHex = function (p) {
		if (p.isInfinity()) return "00";
		var xHex = p.getX().toBigInteger().toString(16);
		var yHex = p.getY().toBigInteger().toString(16);
		var oLen = this.getQ().toString(16).length;
		if ((oLen % 2) != 0) oLen++;
		while (xHex.length < oLen) {
			xHex = "0" + xHex;
		}
		while (yHex.length < oLen) {
			yHex = "0" + yHex;
		}
		return "04" + xHex + yHex;
	};

	ec.fromHex = function (s) { return new BigInteger(s, 16); };

	ec.integerToBytes = function (i, len) {
		var bytes = i.toByteArrayUnsigned();
		if (len < bytes.length) {
			bytes = bytes.slice(bytes.length - len);
		} else while (len > bytes.length) {
			bytes.unshift(0);
		}
		return bytes;
	};


	// Named EC curves
	// ----------------
	// X9ECParameters constructor
	ec.X9Parameters = function (curve, g, n, h) {
		this.curve = curve;
		this.g = g;
		this.n = n;
		this.h = h;
	}
	ec.X9Parameters.prototype.getCurve = function () { return this.curve; };
	ec.X9Parameters.prototype.getG = function () { return this.g; };
	ec.X9Parameters.prototype.getN = function () { return this.n; };
	ec.X9Parameters.prototype.getH = function () { return this.h; };

	// secp256k1 is the Curve used by Bitcoin
	ec.secNamedCurves = {
		// used by Bitcoin
		"secp256k1": function () {
			// p = 2^256 - 2^32 - 2^9 - 2^8 - 2^7 - 2^6 - 2^4 - 1
			var p = ec.fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F");
			var a = BigInteger.ZERO;
			var b = ec.fromHex("7");
			var n = ec.fromHex("FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");
			var h = BigInteger.ONE;
			var curve = new ec.CurveFp(p, a, b);
			var G = curve.decodePointHex("04"
					+ "79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798"
					+ "483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8");
			return new ec.X9Parameters(curve, G, n, h);
		}
	};

	// secp256k1 called by Bitcoin's ECKEY
	ec.getSECCurveByName = function (name) {
		if (ec.secNamedCurves[name] == undefined) return null;
		return ec.secNamedCurves[name]();
	}
})();