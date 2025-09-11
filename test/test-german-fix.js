/**
 * Quick test for the specific German address that was failing
 */

function testGermanAddress() {
	console.log('🇩🇪 Testing German Address Encoding Fix');
	console.log('='.repeat(50));

	// Your specific failing German address
	const failingAddress =
		'31 Von Vah Stra�e, Mettlach, 66693, Merzig-Wadern, Saarland, Germany';

	console.log('\n📍 Original failing address:');
	console.log(failingAddress);

	// Apply the same character encoding fix as in costMap.cjs
	const fixedAddress = failingAddress
		// Fix corrupted characters FIRST (encoding issues that are already corrupted)
		.replace(/S�re/g, 'Sure') // Specific fix for Sûre -> S�re
		.replace(/Stra�e/g, 'Strasse') // Specific fix for Straße -> Stra�e
		.replace(/�e/g, 'sse') // Fix corrupted ße -> �e
		.replace(/�/g, 'ss') // Generic fix for corrupted ß -> �
		// German characters (proper Unicode)
		.replace(/ß/g, 'ss') // German eszett
		.replace(/ä/g, 'ae') // German a-umlaut
		.replace(/ö/g, 'oe') // German o-umlaut
		.replace(/ü/g, 'ue') // German u-umlaut
		.replace(/Ä/g, 'Ae') // German A-umlaut
		.replace(/Ö/g, 'Oe') // German O-umlaut
		.replace(/Ü/g, 'Ue') // German U-umlaut
		// French characters
		.replace(/[àáâãäå]/g, 'a') // French a variants
		.replace(/[èéêë]/g, 'e') // French e variants
		.replace(/[ìíîï]/g, 'i') // French i variants
		.replace(/[òóôõö]/g, 'o') // French o variants
		.replace(/[ùúûü]/g, 'u') // French u variants
		.replace(/ç/g, 'c') // French cedilla
		.replace(/ñ/g, 'n') // Spanish/French n
		// Remove any remaining problematic characters but keep basic punctuation
		.replace(/[^\x00-\x7F\s\-,.']/g, '')
		.replace(/\s+/g, ' ') // Normalize whitespace
		.trim();

	console.log('\n✅ Fixed address:');
	console.log(fixedAddress);

	// Expected working address (from your working URL)
	const expectedAddress =
		'31 Von Vah Strasse, Mettlach, 66693, Merzig-Wadern, Saarland, Germany';

	console.log('\n🎯 Expected address:');
	console.log(expectedAddress);

	const matches = fixedAddress === expectedAddress;
	console.log(`\n🔍 Result: ${matches ? '✅ PERFECT MATCH' : '❌ NO MATCH'}`);

	if (!matches) {
		console.log(`\nDifference:`);
		console.log(`Fixed:    "${fixedAddress}"`);
		console.log(`Expected: "${expectedAddress}"`);
	}

	// Show URL encoding
	const encodedFixed = encodeURIComponent(fixedAddress);
	console.log('\n🌐 URL encoded:');
	console.log(encodedFixed);

	console.log('\n🔗 Full Nominatim URL:');
	console.log(
		`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodedFixed}`
	);

	// Check if this matches your working URL
	const yourWorkingURL =
		'31%20Von%20Vah%20Strasse,%20Mettlach,%2066693,%20Merzig-Wadern,%20Saarland,%20Germany';
	console.log('\n📋 Your working URL encoding:');
	console.log(yourWorkingURL);

	// Compare encodings (allowing for slight formatting differences)
	const normalizedFixed = encodedFixed.replace(/%2C%20/g, ',%20'); // Normalize comma spacing
	const normalizedWorking = yourWorkingURL.replace(/%2C%20/g, ',%20');

	const urlMatches = normalizedFixed === normalizedWorking;
	console.log(`\n🎯 URL encoding matches: ${urlMatches ? '✅ YES' : '❌ NO'}`);

	if (matches) {
		console.log(
			'\n🎉 SUCCESS! The character encoding fix should resolve your German address issue.'
		);
	} else {
		console.log('\n⚠️  Still needs adjustment.');
	}
}

testGermanAddress();
