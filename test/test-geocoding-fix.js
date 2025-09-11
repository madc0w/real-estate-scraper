/**
 * Test geocoding with both the corrupted and fixed addresses
 */

const https = require('https');

async function testGeocoding() {
	console.log('🌍 Testing Geocoding with Fixed Address');
	console.log('='.repeat(50));

	// The failing address (corrupted)
	const corruptedAddress =
		'Rue de la Vieille Forge, Neunkirchen-l�s-Bouzonville, 57320, Boulay-Moselle, Lorraine, France';

	// The fixed address
	const fixedAddress =
		'Rue de la Vieille Forge, Neunkirchen-les-Bouzonville, 57320, Boulay-Moselle, Lorraine, France';

	// Function to make geocoding request
	function geocodeAddress(address) {
		return new Promise((resolve, reject) => {
			const encodedAddress = encodeURIComponent(address);
			const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&countrycodes=fr&q=${encodedAddress}`;

			console.log(`\n🔍 Testing: ${address}`);
			console.log(`📡 URL: ${url}`);

			const req = https.get(
				url,
				{
					headers: {
						'User-Agent': 'Real Estate Heat Map Generator Luxembourg',
						'Accept-Language': 'en,fr,de',
					},
				},
				(res) => {
					let data = '';
					res.on('data', (chunk) => (data += chunk));
					res.on('end', () => {
						try {
							const results = JSON.parse(data);
							resolve(results);
						} catch (e) {
							reject(e);
						}
					});
				}
			);

			req.on('error', (e) => {
				reject(e);
			});

			req.setTimeout(10000, () => {
				req.destroy();
				reject(new Error('Timeout'));
			});
		});
	}

	try {
		console.log('\n❌ Testing corrupted address:');
		const corruptedResults = await geocodeAddress(corruptedAddress);
		console.log(`   Results: ${corruptedResults.length} found`);
		if (corruptedResults.length > 0) {
			console.log(`   Best match: ${corruptedResults[0].display_name}`);
			console.log(
				`   Coordinates: ${corruptedResults[0].lat}, ${corruptedResults[0].lon}`
			);
		}

		// Wait a moment between requests to be respectful
		await new Promise((resolve) => setTimeout(resolve, 1000));

		console.log('\n✅ Testing fixed address:');
		const fixedResults = await geocodeAddress(fixedAddress);
		console.log(`   Results: ${fixedResults.length} found`);
		if (fixedResults.length > 0) {
			console.log(`   Best match: ${fixedResults[0].display_name}`);
			console.log(
				`   Coordinates: ${fixedResults[0].lat}, ${fixedResults[0].lon}`
			);
		}

		console.log('\n📊 Summary:');
		console.log(
			`   Corrupted address geocoded: ${
				corruptedResults.length > 0 ? 'YES' : 'NO'
			}`
		);
		console.log(
			`   Fixed address geocoded: ${fixedResults.length > 0 ? 'YES' : 'NO'}`
		);

		if (fixedResults.length > 0 && corruptedResults.length === 0) {
			console.log(
				'\n🎉 SUCCESS! The encoding fix resolved the geocoding issue.'
			);
		} else if (fixedResults.length > 0 && corruptedResults.length > 0) {
			console.log('\n✅ Both work, but the fix ensures consistency.');
		} else {
			console.log('\n⚠️  Neither address worked - there may be other issues.');
		}
	} catch (error) {
		console.error('Error during geocoding test:', error.message);
	}
}

testGeocoding();
