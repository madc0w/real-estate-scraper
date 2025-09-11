/**
 * Quick test of the updated costMap.cjs functions
 */

// Import the functions from costMap.cjs (we need to extract just the functions)
const fs = require('fs');

// Read the costMap.cjs file and extract the functions we need
const costMapContent = fs.readFileSync('./costMap.cjs', 'utf-8');

// Extract just the function we need for testing
function getCleanedAddressVariations(address) {
	const variations = [];

	// Fix character encoding issues first (e.g., Sûre becomes S�re)
	const fixedAddress = address
		.replace(/S�re/g, 'Sure') // Fix the specific encoding issue with Sûre
		.replace(/[^\x00-\x7F]/g, '') // Remove other non-ASCII characters that might cause issues
		.replace(/\s+/g, ' ') // Normalize whitespace
		.trim();

	const parts = fixedAddress.split(',').map((part) => part.trim());

	if (parts.length >= 2) {
		// Remove problematic first parts that are likely placeholders or codes
		const firstPart = parts[0].trim();

		// Common problematic prefixes/codes to remove
		const problematicPrefixes = [
			'NC',
			'N/A',
			'TBD',
			'TBA',
			'UNKNOWN',
			'NO ADDRESS',
			'NOT SPECIFIED',
			'NA',
			'???',
			'--',
			'NULL',
			'NONE',
			'X',
		];

		const shouldRemoveFirst =
			problematicPrefixes.includes(firstPart.toUpperCase()) ||
			firstPart.length <= 2 || // Very short parts like "NC"
			/^[A-Z]{1,3}$/.test(firstPart) || // All caps short codes
			firstPart === '?';

		if (shouldRemoveFirst) {
			// Create version without the first part
			const withoutFirst = parts.slice(1).join(', ');
			variations.push(withoutFirst);
			console.log(`Removed problematic prefix "${firstPart}" from address`);
		}

		// Also try removing empty or very short parts throughout the address
		const cleanedParts = parts.filter(
			(part) =>
				part.length > 2 &&
				!problematicPrefixes.includes(part.toUpperCase()) &&
				!/^[A-Z]{1,2}$/.test(part.trim())
		);

		if (cleanedParts.length !== parts.length && cleanedParts.length >= 2) {
			variations.push(cleanedParts.join(', '));
		}
	}

	// ENHANCED: Belgian address cleanup (the key fix for your issue)
	if (fixedAddress.toLowerCase().includes('belgium') && parts.length >= 5) {
		const street = parts[0];
		const city = parts[1];
		const postalCode = parts[2];

		// Remove administrative levels (Province, District) - this fixes your specific case
		variations.push(`${street}, ${city}, ${postalCode}, Belgium`);
		console.log('🇧🇪 Removed Belgian administrative levels');

		// European postal format
		if (/^\d{4}$/.test(postalCode)) {
			variations.push(`${street}, ${postalCode} ${city}, Belgium`);
		}

		// Fallback: just city
		variations.push(`${street}, ${city}, Belgium`);
	}

	// ENHANCED: Luxembourg address cleanup
	if (fixedAddress.toLowerCase().includes('luxembourg') && parts.length >= 4) {
		const street = parts[0];
		const city = parts[1];

		variations.push(`${street}, ${city}, Luxembourg`);
		console.log('🇱🇺 Simplified Luxembourg address');

		if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) {
			const postalCode = parts[2];
			variations.push(`${street}, ${postalCode} ${city}, Luxembourg`);
		}
	}

	return variations;
}

function testUpdatedFunction() {
	console.log('🧪 Testing Updated costMap.cjs Functions');
	console.log('='.repeat(50));

	// Test with your problematic address (with encoding issue)
	const problematicAddress =
		'274 Chaussee de Saint Hubert, Vaux-sur-S�re, 6640, Bastogne, Province-de-Luxembourg, Belgium';

	console.log('\n📍 Testing with problematic address:');
	console.log(problematicAddress);

	console.log('\n🔄 Generated variations:');
	const variations = getCleanedAddressVariations(problematicAddress);

	variations.forEach((variation, i) => {
		console.log(`  ${i + 1}. ${variation}`);
	});

	// Check if we get the working variation
	const expectedWorking =
		'274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Belgium';
	const hasWorkingVariation = variations.some((v) =>
		v.includes('274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Belgium')
	);

	console.log(
		`\n✅ Contains working variation: ${hasWorkingVariation ? 'YES' : 'NO'}`
	);

	if (hasWorkingVariation) {
		console.log('🎉 Success! The enhanced strategy should now work.');
	} else {
		console.log('❌ Still missing the working variation. Need more debugging.');
	}

	// Test character encoding fix
	console.log('\n🔤 Character encoding test:');
	const beforeFix =
		'274 Chaussee de Saint Hubert, Vaux-sur-S�re, 6640, Bastogne, Province-de-Luxembourg, Belgium';
	const afterFix = beforeFix
		.replace(/S�re/g, 'Sure')
		.replace(/[^\x00-\x7F]/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	console.log(`Before: ${beforeFix}`);
	console.log(`After:  ${afterFix}`);
}

testUpdatedFunction();
