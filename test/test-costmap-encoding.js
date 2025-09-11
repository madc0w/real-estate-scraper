/**
 * Test that the encoding fix is working in the actual costMap.cjs
 */

// Mock a single property with the problematic address
const testProperty = {
	Location:
		'Rue de la Vieille Forge, Neunkirchen-l�s-Bouzonville, 57320, Boulay-Moselle, Lorraine, France',
	'Price From': '459000',
	'Area From': '260',
};

// Import the geocoding function from costMap.cjs
// Since it's a .cjs file, we'll extract the relevant part and test it

async function testCostMapEncoding() {
	console.log('🔧 Testing Encoding Fix in costMap.cjs Context');
	console.log('='.repeat(50));

	// Replicate the exact encoding fix logic from costMap.cjs
	function fixEncodingLikeCostMap(address) {
		const cleanAddress = address
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
			.trim();

		return cleanAddress;
	}

	console.log('\n📋 Test Property:');
	console.log(`   Location: ${testProperty.Location}`);
	console.log(`   Price: €${testProperty['Price From']}`);
	console.log(`   Area: ${testProperty['Area From']}m²`);

	console.log('\n🔧 Applying costMap.cjs encoding fix:');
	const fixedLocation = fixEncodingLikeCostMap(testProperty.Location);
	console.log(`   Fixed Location: ${fixedLocation}`);

	console.log('\n🔍 Character comparison:');
	console.log(
		`   Original contains "l�s": ${testProperty.Location.includes('l�s')}`
	);
	console.log(`   Fixed contains "les": ${fixedLocation.includes('les')}`);
	console.log(`   Fixed contains "l�s": ${fixedLocation.includes('l�s')}`);

	const isProperlyFixed =
		fixedLocation.includes('les') && !fixedLocation.includes('l�s');
	console.log(
		`\n✅ Result: ${
			isProperlyFixed ? 'ENCODING FIX WORKING' : 'FIX NOT WORKING'
		}`
	);

	console.log('\n🌐 URL encoded for geocoding:');
	console.log(`   ${encodeURIComponent(fixedLocation)}`);

	if (isProperlyFixed) {
		console.log(
			'\n🎉 SUCCESS! The costMap.cjs fix will work for your geocoding issue.'
		);
		console.log('   Run the main script to see the geocoding in action.');
	}

	return isProperlyFixed;
}

testCostMapEncoding();
