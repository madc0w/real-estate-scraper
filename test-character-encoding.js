/**
 * Test character encoding fixes for German and other European addresses
 */

function testCharacterEncoding() {
	console.log('🧪 Testing Character Encoding Fixes');
	console.log('='.repeat(50));

	// Test cases with various encoding issues
	const testCases = [
		// Your specific German case
		{
			original:
				'31 Von Vah Straße, Mettlach, 66693, Merzig-Wadern, Saarland, Germany',
			corrupted:
				'31 Von Vah Stra�e, Mettlach, 66693, Merzig-Wadern, Saarland, Germany',
			expected:
				'31 Von Vah Strasse, Mettlach, 66693, Merzig-Wadern, Saarland, Germany',
		},
		// Belgian case you already found
		{
			original:
				'274 Chaussée de Saint Hubert, Vaux-sur-Sûre, 6640, Bastogne, Province-de-Luxembourg, Belgium',
			corrupted:
				'274 Chaussee de Saint Hubert, Vaux-sur-S�re, 6640, Bastogne, Province-de-Luxembourg, Belgium',
			expected:
				'274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Bastogne, Province-de-Luxembourg, Belgium',
		},
		// Other German examples
		{
			original: 'Königstraße 45, München, 80539, Bayern, Germany',
			corrupted: 'K�nigstra�e 45, M�nchen, 80539, Bayern, Germany',
			expected: 'Koenigstrasse 45, Muenchen, 80539, Bayern, Germany',
		},
		// French examples
		{
			original: 'Rue de la Paix, Strasbourg, 67000, Bas-Rhin, France',
			corrupted: 'Rue de la Paix, Strasbourg, 67000, Bas-Rhin, France',
			expected: 'Rue de la Paix, Strasbourg, 67000, Bas-Rhin, France',
		},
	];

	// Define the character encoding fix function (same as in costMap.cjs)
	function fixCharacterEncoding(address) {
		return (
			address
				// German characters
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
				// Fix corrupted characters (encoding issues)
				.replace(/S�re/g, 'Sure') // Specific fix for Sûre -> S�re
				.replace(/Stra�e/g, 'Strasse') // Specific fix for Straße -> Stra�e
				.replace(/�/g, 'ss') // Generic fix for corrupted ß
				// Remove any remaining problematic characters but keep basic punctuation
				.replace(/[^\x00-\x7F\s\-,.']/g, '')
				.replace(/\s+/g, ' ') // Normalize whitespace
				.trim()
		);
	}

	testCases.forEach((testCase, index) => {
		console.log(`\n📋 Test Case ${index + 1}:`);
		console.log(`Original:  ${testCase.original}`);
		console.log(`Corrupted: ${testCase.corrupted}`);

		const fixed = fixCharacterEncoding(testCase.corrupted);
		console.log(`Fixed:     ${fixed}`);
		console.log(`Expected:  ${testCase.expected}`);

		const matches = fixed === testCase.expected;
		console.log(`Result:    ${matches ? '✅ PASS' : '❌ FAIL'}`);

		if (!matches) {
			console.log(
				`Difference: Expected "${testCase.expected}" but got "${fixed}"`
			);
		}

		// Test URL encoding
		const encoded = encodeURIComponent(fixed);
		console.log(`URL:       ${encoded}`);
		console.log('─'.repeat(80));
	});

	// Test the specific German URL that works
	console.log('\n🌐 Testing Your Working German URL:');
	const workingAddress =
		'31 Von Vah Strasse, Mettlach, 66693, Merzig-Wadern, Saarland, Germany';
	const workingEncoded = encodeURIComponent(workingAddress);
	console.log(`Address: ${workingAddress}`);
	console.log(`Encoded: ${workingEncoded}`);
	console.log(
		`URL: https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${workingEncoded}`
	);
}

testCharacterEncoding();
