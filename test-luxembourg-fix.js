/**
 * Test Luxembourg address cleanup for the specific failing case
 */

function testLuxembourgAddress() {
	console.log('🇱🇺 Testing Luxembourg Address Cleanup');
	console.log('='.repeat(50));

	// Test the enhanced Luxembourg cleanup function
	function getCleanedAddressVariationsTest(address) {
		const variations = [];

		// Fix character encoding issues first
		const fixedAddress = address
			.replace(/S�re/g, 'Sure')
			.replace(/Stra�e/g, 'Strasse')
			.replace(/�e/g, 'sse')
			.replace(/�/g, 'ss')
			.replace(/ß/g, 'ss')
			.replace(/ä/g, 'ae')
			.replace(/ö/g, 'oe')
			.replace(/ü/g, 'ue')
			.replace(/Ä/g, 'Ae')
			.replace(/Ö/g, 'Oe')
			.replace(/Ü/g, 'Ue')
			.replace(/[àáâãäå]/g, 'a')
			.replace(/[èéêë]/g, 'e')
			.replace(/[ìíîï]/g, 'i')
			.replace(/[òóôõö]/g, 'o')
			.replace(/[ùúûü]/g, 'u')
			.replace(/ç/g, 'c')
			.replace(/ñ/g, 'n')
			.replace(/[^\x00-\x7F\s\-,.']/g, '')
			.replace(/\s+/g, ' ')
			.trim();

		const parts = fixedAddress.split(',').map((part) => part.trim());

		// Luxembourg address cleanup
		if (
			fixedAddress.toLowerCase().includes('luxembourg') &&
			parts.length >= 4
		) {
			const street = parts[0];
			const city = parts[1];
			const postalCode = parts.length >= 3 ? parts[2] : '';

			// Strategy 1: Simple format (street, city, postal, Luxembourg)
			if (/^\d{4}$/.test(postalCode)) {
				variations.push(`${street}, ${city}, ${postalCode}, Luxembourg`);
				console.log(
					'🇱🇺 Simplified Luxembourg address (removed administrative levels)'
				);

				// Strategy 2: European postal format
				variations.push(`${street}, ${postalCode} ${city}, Luxembourg`);
			} else {
				variations.push(`${street}, ${city}, Luxembourg`);
				console.log('🇱🇺 Basic Luxembourg address format');
			}

			// Strategy 3: Handle duplicate city names
			const cityOccurrences = parts.filter(
				(part) => part.toLowerCase() === city.toLowerCase()
			).length;

			if (cityOccurrences > 1) {
				console.log(
					`🇱🇺 Detected duplicate city name "${city}" - using simplified format`
				);
				if (/^\d{4}$/.test(postalCode)) {
					variations.push(`${street}, ${city}, ${postalCode}, Luxembourg`);
				}
			}

			// Strategy 4: Remove administrative regions
			const luxembourgRegions = [
				'centre',
				'nord',
				'sud',
				'est',
				'ouest',
				'canton',
			];
			const hasRegion = parts.some((part) =>
				luxembourgRegions.includes(part.toLowerCase())
			);

			if (hasRegion) {
				console.log('🇱🇺 Removed Luxembourg administrative region');
			}

			// Strategy 5: City-only fallback
			if (parts.length > 5) {
				variations.push(`${city}, Luxembourg`);
				console.log('🇱🇺 City-only fallback for complex Luxembourg address');
			}
		}

		return variations;
	}

	// Your specific failing Luxembourg address
	const failingAddress =
		'1 A Laangert, Bertrange, 8117, Bertrange, Centre, Luxembourg';
	const workingAddress = '1 A Laangert, Bertrange, 8117, Luxembourg';

	console.log('\n📍 Failing address:');
	console.log(failingAddress);

	console.log('\n📍 Working address:');
	console.log(workingAddress);

	console.log('\n🔄 Generated variations:');
	const variations = getCleanedAddressVariationsTest(failingAddress);

	variations.forEach((variation, i) => {
		const isWorking = variation === workingAddress;
		const marker = isWorking ? '✅' : '  ';
		console.log(`${marker} ${i + 1}. ${variation}`);
	});

	// Check if we get the working variation
	const hasWorkingVariation = variations.includes(workingAddress);
	console.log(
		`\n🎯 Contains working variation: ${
			hasWorkingVariation ? '✅ YES' : '❌ NO'
		}`
	);

	if (hasWorkingVariation) {
		const position = variations.indexOf(workingAddress) + 1;
		console.log(`✅ Working variation found at position ${position}`);
		console.log('🎉 SUCCESS! The enhanced Luxembourg cleanup should work.');
	} else {
		console.log('❌ Still missing the working variation.');
		console.log('\n🔍 Analysis:');
		console.log('Expected:', workingAddress);
		console.log('Generated variations:');
		variations.forEach((v) => console.log(`  - ${v}`));
	}

	// Test other Luxembourg cases
	console.log('\n\n🧪 Testing other Luxembourg cases:');
	console.log('─'.repeat(50));

	const otherLuxembourgCases = [
		'Boulevard Royal, Luxembourg-Ville, 2449, Canton Luxembourg, Luxembourg',
		'Route de Thionville, Esch-sur-Alzette, 4000, Canton Esch-sur-Alzette, Luxembourg',
		'Avenue John F. Kennedy, Luxembourg-Ville, 1855, Luxembourg-Ville, Centre, Luxembourg',
		'Rue de la Gare, Dudelange, 3440, Dudelange, Sud, Luxembourg',
	];

	otherLuxembourgCases.forEach((testCase, index) => {
		console.log(`\n📋 Test Case ${index + 1}:`);
		console.log(`Input: ${testCase}`);

		const vars = getCleanedAddressVariationsTest(testCase);
		console.log(`Generated ${vars.length} variations:`);
		vars.slice(0, 3).forEach((v, i) => {
			console.log(`   ${i + 1}. ${v}`);
		});
		if (vars.length > 3) {
			console.log(`   ... and ${vars.length - 3} more variations`);
		}
	});
}

testLuxembourgAddress();
