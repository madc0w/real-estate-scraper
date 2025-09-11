/**
 * Test the encoding fix for the German address
 */

function testGermanEncodingFix() {
	console.log('🇩🇪 Testing German Encoding Fix');
	console.log('='.repeat(40));

	// The failing German address
	const corruptedAddress =
		'31 Von Vah Stra�e, Mettlach, 66693, Merzig-Wadern, Saarland, Germany';

	// What it should become
	const expectedFixed =
		'31 Von Vah Strasse, Mettlach, 66693, Merzig-Wadern, Saarland, Germany';

	// Apply the encoding fix
	const cleanAddress = corruptedAddress
		// Fix UTF-8 replacement character (65533) which appears when original encoding was corrupted
		.replace(/\uFFFD/g, 'e')
		// Fix corrupted ß (eszett) that appears as �
		.replace(/�/g, 'ss')
		// Normalize whitespace
		.replace(/\s+/g, ' ')
		.trim();

	console.log('\n📍 Original:');
	console.log(`"${corruptedAddress}"`);

	console.log('\n✅ Fixed:');
	console.log(`"${cleanAddress}"`);

	console.log('\n🎯 Expected:');
	console.log(`"${expectedFixed}"`);

	// Check if the fix worked
	const isCorrect = cleanAddress === expectedFixed;

	console.log('\n🔍 Results:');
	console.log(`   Contains "Stra�e": ${corruptedAddress.includes('Stra�e')}`);
	console.log(`   Contains "Strasse": ${cleanAddress.includes('Strasse')}`);
	console.log(`   Matches expected: ${isCorrect}`);

	console.log(
		`\n${isCorrect ? '✅ SUCCESS' : '❌ FAILED'}: Encoding fix is ${
			isCorrect ? 'working' : 'not working'
		}`
	);

	if (isCorrect) {
		console.log('\n🌐 URL encoded:');
		console.log(encodeURIComponent(cleanAddress));
	}

	// Show character codes for debugging
	console.log('\n📝 Character analysis:');
	const problematicPart = 'Stra�e';
	for (let i = 0; i < problematicPart.length; i++) {
		const char = problematicPart[i];
		console.log(`   "${char}" = ${char.charCodeAt(0)}`);
	}

	return isCorrect;
}

testGermanEncodingFix();
