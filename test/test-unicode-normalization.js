/**
 * Test the clean Unicode normalization approach
 */

function testUnicodeNormalization() {
	console.log('🧹 Testing Unicode Normalization Approach');
	console.log('='.repeat(50));

	const testCases = [
		{
			name: 'German with corrupted ß',
			input:
				'31 Von Vah Stra�e, Mettlach, 66693, Merzig-Wadern, Saarland, Germany',
			expected:
				'31 Von Vah Strae, Mettlach, 66693, Merzig-Wadern, Saarland, Germany',
		},
		{
			name: 'Belgian with corrupted û',
			input:
				'274 Chaussee de Saint Hubert, Vaux-sur-S�re, 6640, Bastogne, Province-de-Luxembourg, Belgium',
			expected:
				'274 Chaussee de Saint Hubert, Vaux-sur-Sre, 6640, Bastogne, Province-de-Luxembourg, Belgium',
		},
		{
			name: 'French with corrupted è',
			input:
				'Rue de la Vieille Forge, Neunkirchen-l�s-Bouzonville, 57320, Boulay-Moselle, Lorraine, France',
			expected:
				'Rue de la Vieille Forge, Neunkirchen-ls-Bouzonville, 57320, Boulay-Moselle, Lorraine, France',
		},
		{
			name: 'Normal text should pass through',
			input: 'Normal Street, Normal City, 12345, Normal Country',
			expected: 'Normal Street, Normal City, 12345, Normal Country',
		},
		{
			name: 'Accented characters should be normalized',
			input: 'Café, Münich, François, Zürich',
			expected: 'Cafe, Munich, Francois, Zurich',
		},
	];

	// Apply the normalization function
	function normalizeAddress(address) {
		return (
			address
				// Normalize text by removing or replacing problematic Unicode characters
				.normalize('NFD') // Decompose accented characters
				.replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
				.replace(/[^\x00-\x7F]/g, '') // Remove any remaining non-ASCII characters
				// Normalize whitespace
				.replace(/\s+/g, ' ')
				.trim()
		);
	}

	testCases.forEach((testCase, index) => {
		console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
		console.log(`Input:    "${testCase.input}"`);

		const result = normalizeAddress(testCase.input);
		console.log(`Result:   "${result}"`);
		console.log(`Expected: "${testCase.expected}"`);

		const matches = result === testCase.expected;
		console.log(`Status:   ${matches ? '✅ PASS' : '❌ FAIL'}`);

		if (!matches) {
			console.log(`Note: Expected "${testCase.expected}" but got "${result}"`);
		}

		// Show if this would be geocodable
		const isClean = /^[a-zA-Z0-9\s\-,.']+$/.test(result);
		console.log(`Geocodable: ${isClean ? '✅ YES' : '❌ NO'}`);
	});

	console.log('\n📝 Summary:');
	console.log(
		'This approach removes all non-ASCII characters, making addresses'
	);
	console.log(
		'geocodable even if not perfectly accurate. The geocoding service'
	);
	console.log('should still find the locations based on the remaining text.');
}

testUnicodeNormalization();
