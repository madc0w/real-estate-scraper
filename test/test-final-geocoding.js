/**
 * Test the actual geocoding with the fixed address
 */

const https = require('https');

async function testActualGeocoding() {
	console.log('🌍 Testing Actual Geocoding with Clean Fix');
	console.log('='.repeat(50));

	// Test address with the replacement character
	const testAddress =
		'Rue de la Vieille Forge, Neunkirchen-l�s-Bouzonville, 57320, Boulay-Moselle, Lorraine, France';

	// Apply the same fix as in costMap.cjs
	const cleanAddress = testAddress
		.replace(/\uFFFD/g, 'e')
		.replace(/\s+/g, ' ')
		.trim();

	console.log('\n📍 Testing address:');
	console.log(`Original: ${testAddress}`);
	console.log(`Cleaned:  ${cleanAddress}`);

	// Test geocoding
	function geocodeAddress(address) {
		return new Promise((resolve, reject) => {
			const encodedAddress = encodeURIComponent(address);
			const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&countrycodes=fr&q=${encodedAddress}`;

			const req = https.get(
				url,
				{
					headers: {
						'User-Agent': 'Real Estate Heat Map Generator',
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
		console.log('\n🔍 Geocoding...');
		const results = await geocodeAddress(cleanAddress);

		if (results && results.length > 0) {
			console.log('✅ SUCCESS!');
			console.log(`   Found: ${results[0].display_name}`);
			console.log(`   Coordinates: ${results[0].lat}, ${results[0].lon}`);
		} else {
			console.log('❌ No results found');
		}
	} catch (error) {
		console.error('❌ Error:', error.message);
	}
}

testActualGeocoding();
