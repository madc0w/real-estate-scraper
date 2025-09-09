/**
 * Test the replacement character fix
 */

function testReplacementCharFix() {
	console.log('🔧 Testing Replacement Character Fix');
	console.log('='.repeat(50));

	// Test the encoding fix
	function fixEncoding(address) {
		return (
			address
				// First handle corrupted UTF-8 replacement characters
				.replace(/\uFFFD/g, 'u') // Replace replacement char with 'u' (most common case)
				// Then normalize and transliterate properly
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

	const testCases = [
		{
			input:
				'274 Chaussee de Saint Hubert, Vaux-sur-S�re, 6640, Bastogne, Province-de-Luxembourg, Belgium',
			expected: 'Vaux-sur-Sure',
		},
		{
			input:
				'31 Von Vah Stra�e, Mettlach, 66693, Merzig-Wadern, Saarland, Germany',
			expected: 'Strasse',
		},
		{
			input:
				'Rue de la Vieille Forge, Neunkirchen-l�s-Bouzonville, 57320, Boulay-Moselle, Lorraine, France',
			expected: 'les-Bouzonville',
		},
	];

	testCases.forEach((testCase, index) => {
		console.log(`\n📋 Test ${index + 1}:`);
		console.log(`Input: ${testCase.input}`);

		const result = fixEncoding(testCase.input);
		console.log(`Result: ${result}`);

		const hasExpected = result.includes(testCase.expected);
		console.log(
			`Contains "${testCase.expected}": ${hasExpected ? '✅ YES' : '❌ NO'}`
		);

		// Show what the replacement character becomes
		const problemChar = testCase.input.match(/[^\x00-\x7F]/g);
		if (problemChar) {
			console.log(
				`Problem chars found: ${problemChar
					.map((c) => `"${c}" (${c.charCodeAt(0)})`)
					.join(', ')}`
			);
		}
	});

	// Test specifically for the Belgian case
	console.log('\n🎯 Specific Belgian Test:');
	const belgianInput =
		'274 Chaussee de Saint Hubert, Vaux-sur-S�re, 6640, Bastogne, Province-de-Luxembourg, Belgium';
	const belgianResult = fixEncoding(belgianInput);
	console.log(`Input:  ${belgianInput}`);
	console.log(`Result: ${belgianResult}`);
	console.log(
		`Should geocode better: ${
			belgianResult.includes('Sure') ? '✅ YES' : '❌ NO'
		}`
	);
}

testReplacementCharFix();
