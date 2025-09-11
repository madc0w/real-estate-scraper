const https = require('https');

// Test our specific failing address
const testAddress =
	'274 Chaussee de Saint Hubert, Vaux-sur-S\uFFFDre, 6640, Bastogne, Province-de-Luxembourg, Belgium';

console.log('Original address:', testAddress);
console.log('Has replacement char:', testAddress.includes('\uFFFD'));

// Test the contextual substitutions logic
function getContextualSubstitutions(address, position) {
	const surrounding = address
		.substring(Math.max(0, position - 3), position + 4)
		.toLowerCase();

	console.log('Surrounding context:', surrounding);

	// For French/Belgian place names, prioritize based on common patterns
	if (surrounding.includes('sur-s') || surrounding.includes('ux-s')) {
		// "Vaux-sur-S?re" pattern - prioritize 'u' for "Sûre"
		console.log('Detected "sur-s" pattern - prioritizing "u"');
		return ['u', 'e', 'a', 'o', 'i', 'ss'];
	}

	// Default order for general cases
	return ['e', 'a', 'u', 'o', 'i', 'ss'];
}

// Find replacement character position
const position = testAddress.indexOf('\uFFFD');
console.log('Replacement char position:', position);

if (position !== -1) {
	const substitutions = getContextualSubstitutions(testAddress, position);
	console.log('Substitutions to try:', substitutions);

	// Generate the combinations
	const combinations = [];
	for (const sub of substitutions) {
		const result =
			testAddress.substring(0, position) +
			sub +
			testAddress.substring(position + 1);
		combinations.push(result);
	}

	console.log('\nGenerated combinations:');
	combinations.forEach((combo, i) => {
		console.log(`${i + 1}. ${combo}`);
	});

	// Test the working URL pattern
	const workingVersion =
		'274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Belgium';
	console.log('\nWorking version should be:', workingVersion);

	// Check if our first suggestion matches
	const firstSuggestion = combinations[0];
	console.log('Our first suggestion:', firstSuggestion);

	if (firstSuggestion.includes('Vaux-sur-Sure')) {
		console.log('✅ SUCCESS: Our first suggestion includes "Vaux-sur-Sure"!');
	} else {
		console.log(
			'❌ FAIL: Our first suggestion does not include "Vaux-sur-Sure"'
		);
	}
}
