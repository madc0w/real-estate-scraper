/**
 * Test French character encoding fix for the specific failing case
 */

function testFrenchEncoding() {
	console.log('🇫🇷 Testing French Character Encoding Fix');
	console.log('='.repeat(50));

	// Define the character encoding fix function (same as in costMap.cjs)
	function fixCharacterEncoding(address) {
		return (
			address
				// Fix corrupted characters FIRST (encoding issues that are already corrupted)
				.replace(/S�re/g, 'Sure') // Specific fix for Sûre -> S�re
				.replace(/Stra�e/g, 'Strasse') // Specific fix for Straße -> Stra�e
				.replace(/l\?s-/g, 'les-') // Specific fix for lès- -> l?s- (French)
				.replace(/\?/g, 'e') // Generic fix for corrupted è -> ?
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
				.trim()
		);
	}

	// Your specific failing French address from CSV line 14
	const failingAddress =
		'Rue de la Vieille Forge, Neunkirchen-l?s-Bouzonville, 57320, Boulay-Moselle, Lorraine, France';
	const expectedFixed =
		'Rue de la Vieille Forge, Neunkirchen-les-Bouzonville, 57320, Boulay-Moselle, Lorraine, France';

	console.log('\n📍 Original failing address (from CSV line 14):');
	console.log(failingAddress);

	console.log('\n✅ Fixed address:');
	const fixedAddress = fixCharacterEncoding(failingAddress);
	console.log(fixedAddress);

	console.log('\n🎯 Expected address:');
	console.log(expectedFixed);

	const matches = fixedAddress === expectedFixed;
	console.log(`\n🔍 Result: ${matches ? '✅ PERFECT MATCH' : '❌ NO MATCH'}`);

	if (!matches) {
		console.log(`\nDifference:`);
		console.log(`Fixed:    "${fixedAddress}"`);
		console.log(`Expected: "${expectedFixed}"`);
	}

	// Show URL encoding
	const encodedFixed = encodeURIComponent(fixedAddress);
	console.log('\n🌐 URL encoded (for geocoding):');
	console.log(encodedFixed);

	console.log('\n🔗 Test Nominatim URL:');
	console.log(
		`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&countrycodes=fr&q=${encodedFixed}`
	);

	// Test other similar French encoding issues
	console.log('\n\n🧪 Testing other French encoding cases:');
	console.log('─'.repeat(50));

	const otherFrenchCases = [
		// Various French encoding issues
		{
			corrupted: 'Rue de l?Église, Metz, 57000, Moselle, France',
			expected: 'Rue de l Eglise, Metz, 57000, Moselle, France',
		},
		{
			corrupted: 'Place de la R?publique, Strasbourg, 67000, France',
			expected: 'Place de la Republique, Strasbourg, 67000, France',
		},
		{
			corrupted: 'Avenue de l?Op?ra, Paris, 75001, France',
			expected: 'Avenue de l Opera, Paris, 75001, France',
		},
		// Mix of issues
		{
			corrupted: 'Rue Ma?tre Kanter, Schiltigheim, 67300, Alsace, France',
			expected: 'Rue Maitre Kanter, Schiltigheim, 67300, Alsace, France',
		},
	];

	otherFrenchCases.forEach((testCase, index) => {
		console.log(`\n📋 Test Case ${index + 1}:`);
		console.log(`Corrupted: ${testCase.corrupted}`);

		const fixed = fixCharacterEncoding(testCase.corrupted);
		console.log(`Fixed:     ${fixed}`);
		console.log(`Expected:  ${testCase.expected}`);

		const matches = fixed === testCase.expected;
		console.log(`Result:    ${matches ? '✅ PASS' : '❌ FAIL'}`);

		if (!matches) {
			console.log(
				`Note: May need additional specific rules for: "${testCase.corrupted}"`
			);
		}
	});

	if (matches) {
		console.log(
			'\n🎉 SUCCESS! The French character encoding fix should resolve your geocoding issue.'
		);
		console.log(
			'The address "Neunkirchen-l?s-Bouzonville" will now become "Neunkirchen-les-Bouzonville"'
		);
	} else {
		console.log('\n⚠️  Still needs adjustment.');
	}
}

testFrenchEncoding();
