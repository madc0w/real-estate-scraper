/**
 * Test the improved transliteration approach
 */

function testTransliteration() {
	console.log('🔤 Testing Improved Transliteration');
	console.log('='.repeat(50));

	const testCases = [
		{
			name: 'Belgian with corrupted û',
			input:
				'274 Chaussee de Saint Hubert, Vaux-sur-S�re, 6640, Bastogne, Province-de-Luxembourg, Belgium',
			expected:
				'274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Bastogne, Province-de-Luxembourg, Belgium',
		},
		{
			name: 'German with corrupted ß',
			input:
				'31 Von Vah Stra�e, Mettlach, 66693, Merzig-Wadern, Saarland, Germany',
			expected:
				'31 Von Vah Strasse, Mettlach, 66693, Merzig-Wadern, Saarland, Germany',
		},
		{
			name: 'French with corrupted è',
			input:
				'Rue de la Vieille Forge, Neunkirchen-l�s-Bouzonville, 57320, Boulay-Moselle, Lorraine, France',
			expected:
				'274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Bastogne, Province-de-Luxembourg, Belgium',
		},
		{
			name: 'Normal accented characters',
			input: 'Café, Münich, François, Zürich, Sûre',
			expected: 'Cafe, Munich, Francois, Zurich, Sure',
		},
	];

	// Apply the improved transliteration
	function transliterateAddress(address) {
		return (
			address
				// First normalize and transliterate properly
				.normalize('NFD') // Decompose accented characters
				.replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
				// Then handle specific characters that don't decompose properly
				.replace(/[àáâãäåæ]/g, 'a')
				.replace(/[èéêë]/g, 'e')
				.replace(/[ìíîï]/g, 'i')
				.replace(/[òóôõöø]/g, 'o')
				.replace(/[ùúûü]/g, 'u')
				.replace(/[ýÿ]/g, 'y')
				.replace(/[ñ]/g, 'n')
				.replace(/[ç]/g, 'c')
				.replace(/[ß]/g, 'ss')
				.replace(/[ÀÁÂÃÄÅÆ]/g, 'A')
				.replace(/[ÈÉÊË]/g, 'E')
				.replace(/[ÌÍÎÏ]/g, 'I')
				.replace(/[ÒÓÔÕÖØ]/g, 'O')
				.replace(/[ÙÚÛÜ]/g, 'U')
				.replace(/[ÝŸ]/g, 'Y')
				.replace(/[Ñ]/g, 'N')
				.replace(/[Ç]/g, 'C')
				// Remove any remaining non-ASCII characters
				.replace(/[^\x00-\x7F]/g, '')
				// Normalize whitespace
				.replace(/\s+/g, ' ')
				.trim()
		);
	}

	testCases.forEach((testCase, index) => {
		console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
		console.log(`Input:    "${testCase.input}"`);

		const result = transliterateAddress(testCase.input);
		console.log(`Result:   "${result}"`);

		if (index < 3) {
			// Only check expected for first 3 tests
			console.log(`Expected: "${testCase.expected}"`);
			const matches = result === testCase.expected;
			console.log(`Status:   ${matches ? '✅ PASS' : '❌ FAIL'}`);
		}

		// Check specifically for the critical parts
		if (testCase.input.includes('S�re')) {
			const hasSure = result.includes('Sure');
			console.log(`Contains "Sure": ${hasSure ? '✅ YES' : '❌ NO'}`);
		}

		if (testCase.input.includes('Stra�e')) {
			const hasStrasse = result.includes('Strasse');
			console.log(`Contains "Strasse": ${hasStrasse ? '✅ YES' : '❌ NO'}`);
		}

		// Show if this would be geocodable
		const isClean = /^[a-zA-Z0-9\s\-,.']+$/.test(result);
		console.log(`Geocodable: ${isClean ? '✅ YES' : '❌ NO'}`);
	});

	console.log('\n📝 Key Test:');
	console.log('Testing the specific failing case:');
	const problematicAddress =
		'274 Chaussee de Saint Hubert, Vaux-sur-S�re, 6640, Bastogne, Province-de-Luxembourg, Belgium';
	const fixed = transliterateAddress(problematicAddress);
	console.log(`Original: ${problematicAddress}`);
	console.log(`Fixed:    ${fixed}`);
	console.log(
		`Should contain "Vaux-sur-Sure": ${
			fixed.includes('Vaux-sur-Sure') ? '✅ YES' : '❌ NO'
		}`
	);
}

testTransliteration();
