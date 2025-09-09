/**
 * Test the clean encoding fix
 */

function testCleanEncodingFix() {
	console.log('🔧 Testing Clean Encoding Fix');
	console.log('='.repeat(40));

	// The exact address with the UTF-8 replacement character
	const corruptedAddress =
		'Rue de la Vieille Forge, Neunkirchen-l�s-Bouzonville, 57320, Boulay-Moselle, Lorraine, France';

	// Apply the clean fix
	const cleanAddress = corruptedAddress
		// Fix UTF-8 replacement character (65533) which appears when original encoding was corrupted
		.replace(/\uFFFD/g, 'e')
		// Normalize whitespace
		.replace(/\s+/g, ' ')
		.trim();

	console.log('\n📍 Original:');
	console.log(`"${corruptedAddress}"`);

	console.log('\n✅ Fixed:');
	console.log(`"${cleanAddress}"`);

	// Check if the problematic character is gone
	const hasReplacementChar = corruptedAddress.includes('\uFFFD');
	const fixedHasReplacementChar = cleanAddress.includes('\uFFFD');

	console.log('\n🔍 Results:');
	console.log(`   Original has replacement char: ${hasReplacementChar}`);
	console.log(`   Fixed has replacement char: ${fixedHasReplacementChar}`);
	console.log(`   Contains "les": ${cleanAddress.includes('les')}`);

	const success =
		hasReplacementChar &&
		!fixedHasReplacementChar &&
		cleanAddress.includes('les');
	console.log(
		`\n${success ? '✅ SUCCESS' : '❌ FAILED'}: Encoding fix is ${
			success ? 'working' : 'not working'
		}`
	);

	if (success) {
		console.log('\n🌐 URL encoded:');
		console.log(encodeURIComponent(cleanAddress));
	}

	return success;
}

testCleanEncodingFix();
