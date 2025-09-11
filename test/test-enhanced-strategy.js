/**
 * Test the enhanced address cleanup strategy with your specific failing case
 */

const {
	generateEnhancedAddressVariations,
	geocodeAddressWithEnhancedStrategy,
} = require('./address-cleanup-strategy.js');

async function testSpecificCase() {
	console.log('🧪 Testing Enhanced Address Cleanup Strategy');
	console.log('='.repeat(60));

	// Your specific failing case
	const failingAddress =
		'274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Bastogne, Province-de-Luxembourg, Belgium';
	const workingAddress =
		'274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Belgium';

	console.log('\n📍 ORIGINAL FAILING ADDRESS:');
	console.log(failingAddress);

	console.log('\n📍 KNOWN WORKING ADDRESS:');
	console.log(workingAddress);

	console.log('\n🔄 GENERATING VARIATIONS:');
	console.log('-'.repeat(40));

	const variations = generateEnhancedAddressVariations(failingAddress);

	console.log('\n✅ ANALYSIS:');
	console.log(
		`Generated ${variations.length} variations from the failing address`
	);

	// Check if our strategy generates the working address
	const containsWorkingAddress = variations.includes(workingAddress);
	console.log(
		`Working address found in variations: ${
			containsWorkingAddress ? '✅ YES' : '❌ NO'
		}`
	);

	if (containsWorkingAddress) {
		const position = variations.indexOf(workingAddress) + 1;
		console.log(`Working address is variation #${position}`);
	}

	console.log('\n📝 ALL GENERATED VARIATIONS:');
	variations.forEach((variation, i) => {
		const isWorking = variation === workingAddress;
		const marker = isWorking ? '✅' : '  ';
		console.log(`${marker} ${i + 1}. ${variation}`);
	});

	// Test additional problematic cases
	console.log('\n\n🔍 TESTING OTHER PROBLEMATIC CASES:');
	console.log('='.repeat(60));

	const otherTestCases = [
		// Belgian cases with too many administrative levels
		'Avenue Louise, Brussels, 1050, Brussels-Capital Region, Belgium',
		'Rue de la Loi, Namur, 5000, Province de Namur, Wallonie, Belgium',
		'Grote Markt, Antwerp, 2000, Province of Antwerp, Flanders, Belgium',

		// Luxembourg cases
		'Boulevard Royal, Luxembourg-Ville, 2449, Canton Luxembourg, Luxembourg',
		'Route de Thionville, Esch-sur-Alzette, 4000, Canton Esch-sur-Alzette, Luxembourg',

		// German cases with Bundesland
		'Unter den Linden, Berlin, 10117, Berlin, Germany',
		'Maximilianstraße, Munich, 80539, Bavaria, Germany',

		// French cases with department/region
		'Champs-Élysées, Paris, 75008, Île-de-France, France',
		'Rue de la République, Lyon, 69002, Auvergne-Rhône-Alpes, France',
	];

	otherTestCases.forEach((testCase, index) => {
		console.log(`\n📋 Test Case ${index + 1}:`);
		console.log(`Input: ${testCase}`);

		const vars = generateEnhancedAddressVariations(testCase);
		console.log(`Generated ${vars.length} variations:`);
		vars.slice(0, 3).forEach((v, i) => {
			console.log(`   ${i + 1}. ${v}`);
		});
		if (vars.length > 3) {
			console.log(`   ... and ${vars.length - 3} more variations`);
		}
		console.log('');
	});
}

// Actually test geocoding (optional - can be slow)
async function testActualGeocoding() {
	console.log('\n\n🌍 TESTING ACTUAL GEOCODING (This may take a while...)');
	console.log('='.repeat(60));

	const testAddress =
		'274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Bastogne, Province-de-Luxembourg, Belgium';

	console.log('⚠️  This will make actual API calls to test geocoding');
	console.log("Press Ctrl+C to skip this test if you don't want to wait");

	// Wait a moment to allow user to cancel
	await new Promise((resolve) => setTimeout(resolve, 3000));

	const result = await geocodeAddressWithEnhancedStrategy(testAddress);

	if (result) {
		console.log('\n🎉 GEOCODING SUCCESS!');
		console.log(`Original: ${result.original_address}`);
		console.log(`Successful variation: ${result.successful_address}`);
		console.log(`Strategy used: ${result.strategy_used}`);
		console.log(`Coordinates: ${result.lat}, ${result.lng}`);
		console.log(`Display name: ${result.display_name}`);
	} else {
		console.log('\n❌ GEOCODING FAILED');
		console.log('Even with all strategies, could not geocode the address');
	}
}

// Run the tests
async function runTests() {
	await testSpecificCase();

	// Uncomment the next line to test actual geocoding (slower)
	// await testActualGeocoding();

	console.log('\n\n🏁 Tests completed!');
	console.log('\nTo integrate this strategy into your costMap.cjs:');
	console.log(
		'1. Replace the geocodeAddress function with geocodeAddressWithEnhancedStrategy'
	);
	console.log('2. Update the address variation generation logic');
	console.log(
		'3. The enhanced strategy should find working variations for problematic addresses'
	);
}

runTests().catch(console.error);
