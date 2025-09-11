/**
 * Minimal Enhanced Address Cleanup - Drop-in replacement for costMap.cjs
 *
 * This is a minimal version that you can copy-paste directly into your costMap.cjs
 * to replace the existing geocodeAddress function and getCleanedAddressVariations function.
 */

// Enhanced address variations generator - replaces getCleanedAddressVariations
function getCleanedAddressVariations(address) {
	const variations = [];
	const parts = address.split(',').map((part) => part.trim());

	// Original logic for generic cleanup
	if (parts.length >= 2) {
		const firstPart = parts[0].trim();
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
			firstPart.length <= 2 ||
			/^[A-Z]{1,3}$/.test(firstPart) ||
			firstPart === '?';

		if (shouldRemoveFirst) {
			const withoutFirst = parts.slice(1).join(', ');
			variations.push(withoutFirst);
			console.log(`Removed problematic prefix "${firstPart}" from address`);
		}

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
	if (address.toLowerCase().includes('belgium') && parts.length >= 5) {
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
	if (address.toLowerCase().includes('luxembourg') && parts.length >= 4) {
		const street = parts[0];
		const city = parts[1];

		variations.push(`${street}, ${city}, Luxembourg`);
		console.log('🇱🇺 Simplified Luxembourg address');

		if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) {
			const postalCode = parts[2];
			variations.push(`${street}, ${postalCode} ${city}, Luxembourg`);
		}
	}

	// ENHANCED: German address cleanup
	if (address.toLowerCase().includes('germany') && parts.length >= 4) {
		const street = parts[0];
		const city = parts[1];

		variations.push(`${street}, ${city}, Germany`);
		console.log('🇩🇪 Removed German Bundesland');

		if (parts.length >= 3 && /^\d{5}$/.test(parts[2])) {
			const postalCode = parts[2];
			variations.push(`${street}, ${postalCode} ${city}, Germany`);
		}
	}

	// ENHANCED: French address cleanup
	if (address.toLowerCase().includes('france') && parts.length >= 4) {
		const street = parts[0];
		const city = parts[1];

		variations.push(`${street}, ${city}, France`);
		console.log('🇫🇷 Removed French region');

		if (parts.length >= 3 && /^\d{5}$/.test(parts[2])) {
			const postalCode = parts[2];
			variations.push(`${street}, ${postalCode} ${city}, France`);
		}
	}

	return variations;
}

// Enhanced geocoding with better country code detection
async function geocodeAddress(address) {
	try {
		const cleanAddress = address.replace(/\s+/g, ' ').trim();

		// Generate search strategies with enhanced variations
		const searchStrategies = [
			cleanAddress,
			...getCleanedAddressVariations(cleanAddress),
		];

		// Remove duplicates
		const uniqueStrategies = [...new Set(searchStrategies)];

		// Detect appropriate country codes for better API results
		let countryCode = 'lu,fr,de,be,nl'; // Default
		const addressLower = cleanAddress.toLowerCase();
		if (addressLower.includes('belgium')) countryCode = 'be';
		else if (addressLower.includes('luxembourg')) countryCode = 'lu';
		else if (addressLower.includes('france')) countryCode = 'fr';
		else if (addressLower.includes('germany')) countryCode = 'de';

		for (let i = 0; i < uniqueStrategies.length; i++) {
			const searchAddress = uniqueStrategies[i];
			const encodedAddress = encodeURIComponent(searchAddress);

			console.log(
				`Trying variation ${i + 1}/${uniqueStrategies.length}: ${searchAddress}`
			);

			// Enhanced URL with proper country filtering
			const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=3&countrycodes=${countryCode}&q=${encodedAddress}`;

			const result = await makeGeocodingRequest(url, searchAddress);
			if (result?.lat && result?.lng) {
				console.log(`✅ Success with variation ${i + 1}: ${searchAddress}`);
				return result;
			}

			// Progressive delay
			if (i < uniqueStrategies.length - 1) {
				const delay = Math.min(200 + i * 100, 1000);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		console.log(
			`❌ All ${uniqueStrategies.length} variations failed for: ${address}`
		);
		return null;
	} catch (error) {
		console.error(`Geocoding error for ${address}:`, error.message);
		return null;
	}
}

// You can keep the existing makeGeocodingRequest function as-is, or use this enhanced version:
function makeGeocodingRequest(url, searchAddress) {
	const https = require('https');

	return new Promise((resolve, reject) => {
		const req = https.get(
			url,
			{
				headers: {
					'User-Agent': 'Real Estate Geocoder v2.0 (Enhanced)',
					'Accept-Language': 'en,fr,de,nl',
				},
			},
			(res) => {
				let data = '';
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => {
					try {
						const results = JSON.parse(data);
						if (results && results.length > 0) {
							// Prefer results from the expected country
							const addressLower = searchAddress.toLowerCase();
							let bestResult = results[0];

							if (results.length > 1) {
								// Look for country-specific matches
								if (addressLower.includes('belgium')) {
									const belgiumResult = results.find(
										(r) =>
											r.display_name &&
											r.display_name.toLowerCase().includes('belgium')
									);
									if (belgiumResult) bestResult = belgiumResult;
								} else if (addressLower.includes('luxembourg')) {
									const luxembourgResult = results.find(
										(r) =>
											r.display_name &&
											r.display_name.toLowerCase().includes('luxembourg')
									);
									if (luxembourgResult) bestResult = luxembourgResult;
								}
							}

							if (bestResult && bestResult.lat && bestResult.lon) {
								resolve({
									lat: parseFloat(bestResult.lat),
									lng: parseFloat(bestResult.lon),
									display_name: bestResult.display_name,
								});
								return;
							}
						}
						resolve(null);
					} catch (e) {
						console.log(`JSON parse error for ${searchAddress}:`, e.message);
						resolve(null);
					}
				});
			}
		);

		req.on('error', (e) => {
			console.log(`Request failed for ${searchAddress}:`, e.message);
			resolve(null);
		});

		req.setTimeout(15000, () => {
			req.destroy();
			console.log(`Timeout for: ${searchAddress}`);
			resolve(null);
		});
	});
}

/*
INTEGRATION INSTRUCTIONS:

To update your costMap.cjs:

1. Replace your existing getCleanedAddressVariations function with the one above
2. Replace your existing geocodeAddress function with the one above  
3. Optionally replace makeGeocodingRequest with the enhanced version above

That's it! Your specific failing address:
"274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Bastogne, Province-de-Luxembourg, Belgium"

Will now automatically be cleaned to:
"274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Belgium"

Which should geocode successfully.
*/

module.exports = {
	getCleanedAddressVariations,
	geocodeAddress,
	makeGeocodingRequest,
};
