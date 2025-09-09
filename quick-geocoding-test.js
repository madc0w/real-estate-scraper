/**
 * Quick test to verify the enhanced strategy works with real geocoding API calls
 */

const {
	geocodeAddressWithEnhancedStrategy,
} = require('./address-cleanup-strategy.js');

async function quickGeocodingTest() {
	console.log('🧪 Quick Real Geocoding Test');
	console.log('='.repeat(50));

	// Your specific failing address
	const testAddress =
		'274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Bastogne, Province-de-Luxembourg, Belgium';

	console.log('\n📍 Testing address:');
	console.log(testAddress);
	console.log('\n🔄 Starting enhanced geocoding...\n');

	try {
		const result = await geocodeAddressWithEnhancedStrategy(testAddress);

		if (result) {
			console.log('\n🎉 SUCCESS!');
			console.log('─'.repeat(40));
			console.log(`✅ Original: ${result.original_address}`);
			console.log(`✅ Working variation: ${result.successful_address}`);
			console.log(`✅ Strategy: ${result.strategy_used}`);
			console.log(
				`✅ Coordinates: ${result.lat.toFixed(6)}, ${result.lng.toFixed(6)}`
			);
			console.log(`✅ Location: ${result.display_name}`);
			console.log(`✅ Confidence: ${result.confidence || 'N/A'}`);

			// Verify this is in Belgium/Luxembourg area
			const isInRegion =
				result.lat >= 49.4 &&
				result.lat <= 50.2 &&
				result.lng >= 5.7 &&
				result.lng <= 6.5;
			console.log(`✅ In expected region: ${isInRegion ? 'YES' : 'NO'}`);
		} else {
			console.log('\n❌ FAILED');
			console.log('Even the enhanced strategy could not geocode this address');
		}
	} catch (error) {
		console.error('\n💥 ERROR:', error.message);
	}

	console.log('\n🏁 Test completed');
}

// Run the test
quickGeocodingTest().catch(console.error);
