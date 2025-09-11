// Quick test of the address cleaning function
function getCleanedAddressVariations(address) {
	const variations = [];
	const parts = address.split(',').map((part) => part.trim());

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

	return variations;
}

// Test cases
console.log('Testing address cleaning:');
console.log('');

const testAddress =
	'NC, Merzig-Brotdorf, 66663, Merzig-Wadern, Saarland, Germany';
console.log(`Original: ${testAddress}`);
console.log('Variations:');
const variations = getCleanedAddressVariations(testAddress);
variations.forEach((variation, i) => {
	console.log(`  ${i + 1}: ${variation}`);
});

console.log('');
console.log('Other test cases:');

const otherTests = [
	'X, Luxembourg-Ville, 1234, Luxembourg',
	'???, Paris, France',
	'123 Main Street, City, State, Country',
	'TBD, Berlin, Germany',
];

otherTests.forEach((test) => {
	console.log(`\nOriginal: ${test}`);
	const vars = getCleanedAddressVariations(test);
	vars.forEach((variation, i) => {
		console.log(`  ${i + 1}: ${variation}`);
	});
});
