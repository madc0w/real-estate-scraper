/**
 * Test the specific encoding fix for Neunkirchen-l�s-Bouzonville
 */

function testSpecificEncodingFix() {
	console.log(
		'🔧 Testing Specific Encoding Fix for Neunkirchen-l�s-Bouzonville'
	);
	console.log('='.repeat(70));

	// The exact corrupted address from your CSV
	const corruptedAddress =
		'Rue de la Vieille Forge, Neunkirchen-l�s-Bouzonville, 57320, Boulay-Moselle, Lorraine, France';

	// What it should become
	const expectedFixed =
		'Rue de la Vieille Forge, Neunkirchen-les-Bouzonville, 57320, Boulay-Moselle, Lorraine, France';

	// Apply the same fix as in costMap.cjs
	function fixCharacterEncoding(address) {
		return (
			address
				// Fix corrupted characters FIRST (encoding issues that are already corrupted)
				.replace(/S�re/g, 'Sure') // Specific fix for Sûre -> S�re
				.replace(/Stra�e/g, 'Strasse') // Specific fix for Straße -> Stra�e
				.replace(/l�s-/g, 'les-') // Specific fix for lès- -> l�s- (French) - MAIN FIX
				.replace(/l\?s-/g, 'les-') // Specific fix for lès- -> l?s- (French) - Alternative encoding
				.replace(/\?/g, 'e') // Generic fix for corrupted è -> ?
				.replace(/�e/g, 'sse') // Fix corrupted ße -> �e
				.replace(/�/g, 'e') // Generic fix for corrupted è -> � (UPDATED)
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

	console.log('\n📍 Corrupted address (from CSV):');
	console.log(`"${corruptedAddress}"`);

	console.log('\n✅ Expected fixed address:');
	console.log(`"${expectedFixed}"`);

	const fixedAddress = fixCharacterEncoding(corruptedAddress);

	console.log('\n🔧 Actually fixed address:');
	console.log(`"${fixedAddress}"`);

	const isMatching = fixedAddress === expectedFixed;
	console.log(
		`\n🔍 Result: ${isMatching ? '✅ PERFECT MATCH!' : '❌ MISMATCH'}`
	);

	if (!isMatching) {
		console.log('\n🔍 Character-by-character comparison:');
		const maxLen = Math.max(fixedAddress.length, expectedFixed.length);
		for (let i = 0; i < maxLen; i++) {
			const fixed = fixedAddress[i] || '(end)';
			const expected = expectedFixed[i] || '(end)';
			if (fixed !== expected) {
				console.log(
					`Position ${i}: Got "${fixed}" (${fixed.charCodeAt(
						0
					)}) but expected "${expected}" (${expected.charCodeAt(0)})`
				);
			}
		}
	}

	console.log('\n🌐 URL encoded for geocoding:');
	console.log(encodeURIComponent(fixedAddress));

	console.log('\n🔗 Test URL:');
	console.log(
		`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&countrycodes=fr&q=${encodeURIComponent(
			fixedAddress
		)}`
	);

	console.log('\n📝 Character codes in original corrupted text:');
	const problemPart = 'l�s-';
	for (let i = 0; i < problemPart.length; i++) {
		console.log(`"${problemPart[i]}" = ${problemPart.charCodeAt(i)}`);
	}

	console.log('\n📝 Character codes in target text:');
	const targetPart = 'les-';
	for (let i = 0; i < targetPart.length; i++) {
		console.log(`"${targetPart[i]}" = ${targetPart.charCodeAt(i)}`);
	}

	return isMatching;
}

const success = testSpecificEncodingFix();

if (success) {
	console.log('\n🎉 SUCCESS! The encoding fix should now work correctly.');
	console.log('   Your geocoding should work for: Neunkirchen-l�s-Bouzonville');
} else {
	console.log(
		'\n⚠️  The fix needs more work. Check the character-by-character comparison above.'
	);
}
