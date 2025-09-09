/**
 * Enhanced Address Cleanup Strategy for Real Estate Geocoding
 *
 * This module provides a comprehensive strategy for cleaning up addresses
 * that fail to geocode, specifically targeting Belgian and Luxembourg addresses.
 *
 * Key principle: When geocoding fails, progressively simplify the address
 * by removing administrative components that might be confusing the service.
 */

/**
 * Belgian administrative hierarchy removal strategy
 * Problem: Addresses like "Street, City, Postal, District, Province, Belgium"
 * often fail because of too many administrative levels
 */
function generateBelgianAddressVariations(address) {
	const variations = [];
	const parts = address.split(',').map((part) => part.trim());

	// Skip if not enough parts or doesn't look like Belgium
	if (parts.length < 3 || !address.toLowerCase().includes('belgium')) {
		return variations;
	}

	// Extract components
	const street = parts[0];
	const city = parts[1];
	const postalCode = parts[2];

	// Strategy 1: Remove district/province (most common fix)
	// From: "Street, City, Postal, District, Province, Belgium"
	// To: "Street, City, Postal, Belgium"
	if (parts.length >= 5) {
		variations.push(`${street}, ${city}, ${postalCode}, Belgium`);
		console.log('🇧🇪 Strategy: Removed administrative levels for Belgium');
	}

	// Strategy 2: Postal code + city format (European standard)
	// To: "Street, Postal City, Belgium"
	if (postalCode && /^\d{4}$/.test(postalCode)) {
		variations.push(`${street}, ${postalCode} ${city}, Belgium`);
		console.log('🇧🇪 Strategy: European postal format for Belgium');
	}

	// Strategy 3: Just city and country
	// To: "Street, City, Belgium"
	variations.push(`${street}, ${city}, Belgium`);

	// Strategy 4: City-focused search
	// To: "City, Belgium"
	variations.push(`${city}, Belgium`);

	return variations;
}

/**
 * Luxembourg administrative hierarchy removal strategy
 */
function generateLuxembourgAddressVariations(address) {
	const variations = [];
	const parts = address.split(',').map((part) => part.trim());

	if (parts.length < 2 || !address.toLowerCase().includes('luxembourg')) {
		return variations;
	}

	const street = parts[0];
	const city = parts[1];

	// Strategy 1: Simple format
	variations.push(`${street}, ${city}, Luxembourg`);

	// Strategy 2: If there's a postal code
	if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) {
		const postalCode = parts[2];
		variations.push(`${street}, ${postalCode} ${city}, Luxembourg`);
		variations.push(`${postalCode} ${city}, Luxembourg`);
	}

	// Strategy 3: City only
	variations.push(`${city}, Luxembourg`);

	return variations;
}

/**
 * French administrative hierarchy removal strategy
 */
function generateFrenchAddressVariations(address) {
	const variations = [];
	const parts = address.split(',').map((part) => part.trim());

	if (parts.length < 2 || !address.toLowerCase().includes('france')) {
		return variations;
	}

	const street = parts[0];
	const city = parts[1];

	// Strategy 1: Remove department/region
	variations.push(`${street}, ${city}, France`);

	// Strategy 2: If there's a postal code (French postal codes are 5 digits)
	if (parts.length >= 3 && /^\d{5}$/.test(parts[2])) {
		const postalCode = parts[2];
		variations.push(`${street}, ${postalCode} ${city}, France`);
	}

	// Strategy 3: City only
	variations.push(`${city}, France`);

	return variations;
}

/**
 * German administrative hierarchy removal strategy
 */
function generateGermanAddressVariations(address) {
	const variations = [];
	const parts = address.split(',').map((part) => part.trim());

	if (parts.length < 2 || !address.toLowerCase().includes('germany')) {
		return variations;
	}

	const street = parts[0];
	const city = parts[1];

	// Strategy 1: Remove Bundesland
	variations.push(`${street}, ${city}, Germany`);

	// Strategy 2: If there's a postal code (German postal codes are 5 digits)
	if (parts.length >= 3 && /^\d{5}$/.test(parts[2])) {
		const postalCode = parts[2];
		variations.push(`${street}, ${postalCode} ${city}, Germany`);
	}

	// Strategy 3: City only
	variations.push(`${city}, Germany`);

	return variations;
}

/**
 * Detect problematic address components that often cause geocoding failures
 */
function detectProblematicComponents(address) {
	const problems = [];
	const parts = address.split(',').map((part) => part.trim());

	// Check for too many administrative levels
	if (parts.length > 5) {
		problems.push('too_many_parts');
	}

	// Check for common Belgian administrative terms that confuse geocoders
	const belgianAdminTerms = [
		'province-de-luxembourg',
		'bastogne',
		'liège',
		'namur',
		'hainaut',
		'brabant',
		'flandre',
		'wallonie',
	];

	const addressLower = address.toLowerCase();
	belgianAdminTerms.forEach((term) => {
		if (addressLower.includes(term)) {
			problems.push(`belgian_admin_${term}`);
		}
	});

	// Check for duplicate country mentions
	const countryMentions = (
		address.match(/belgium|luxembourg|france|germany/gi) || []
	).length;
	if (countryMentions > 1) {
		problems.push('duplicate_country');
	}

	return problems;
}

/**
 * Main enhanced address cleanup function
 * This replaces and extends the existing getCleanedAddressVariations function
 */
function generateEnhancedAddressVariations(address) {
	const variations = new Set(); // Use Set to avoid duplicates
	const originalAddress = address.trim();

	console.log(`🔍 Analyzing address: ${originalAddress}`);

	// Detect problems
	const problems = detectProblematicComponents(originalAddress);
	if (problems.length > 0) {
		console.log(`⚠️  Detected issues: ${problems.join(', ')}`);
	}

	// Always try original first
	variations.add(originalAddress);

	// Apply existing generic cleanup
	const genericVariations = getCleanedAddressVariations(originalAddress);
	genericVariations.forEach((v) => variations.add(v));

	// Apply country-specific strategies
	const addressLower = originalAddress.toLowerCase();

	if (addressLower.includes('belgium')) {
		console.log('🇧🇪 Applying Belgian address strategies');
		const belgianVariations = generateBelgianAddressVariations(originalAddress);
		belgianVariations.forEach((v) => variations.add(v));
	}

	if (addressLower.includes('luxembourg')) {
		console.log('🇱🇺 Applying Luxembourg address strategies');
		const luxembourgVariations =
			generateLuxembourgAddressVariations(originalAddress);
		luxembourgVariations.forEach((v) => variations.add(v));
	}

	if (addressLower.includes('france')) {
		console.log('🇫🇷 Applying French address strategies');
		const frenchVariations = generateFrenchAddressVariations(originalAddress);
		frenchVariations.forEach((v) => variations.add(v));
	}

	if (addressLower.includes('germany')) {
		console.log('🇩🇪 Applying German address strategies');
		const germanVariations = generateGermanAddressVariations(originalAddress);
		germanVariations.forEach((v) => variations.add(v));
	}

	// Convert Set back to Array and remove original to avoid duplicate
	const finalVariations = Array.from(variations);
	const withoutOriginal = finalVariations.filter((v) => v !== originalAddress);

	console.log(`💡 Generated ${withoutOriginal.length} address variations`);
	withoutOriginal.forEach((variation, i) => {
		console.log(`   ${i + 1}: ${variation}`);
	});

	return withoutOriginal;
}

/**
 * Legacy function for backward compatibility
 * This is the original function from costMap.cjs
 */
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

/**
 * Enhanced geocoding function with progressive fallback strategy
 */
async function geocodeAddressWithEnhancedStrategy(address) {
	try {
		console.log(`\n🌍 Starting enhanced geocoding for: ${address}`);

		// Generate all possible address variations
		const addressVariations = [
			address, // Always try original first
			...generateEnhancedAddressVariations(address),
		];

		// Remove duplicates while preserving order
		const uniqueVariations = [];
		const seen = new Set();
		addressVariations.forEach((addr) => {
			if (!seen.has(addr)) {
				seen.add(addr);
				uniqueVariations.push(addr);
			}
		});

		console.log(`📍 Will try ${uniqueVariations.length} address variations`);

		// Try each variation with exponential backoff
		for (let i = 0; i < uniqueVariations.length; i++) {
			const searchAddress = uniqueVariations[i];
			const encodedAddress = encodeURIComponent(searchAddress);

			console.log(
				`🔄 Attempt ${i + 1}/${uniqueVariations.length}: ${searchAddress}`
			);

			// Use Nominatim API with appropriate country codes
			const countryCode = detectCountryCode(searchAddress);
			const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=3&countrycodes=${countryCode}&q=${encodedAddress}`;

			const result = await makeGeocodingRequest(url, searchAddress);
			if (result?.lat && result?.lng) {
				console.log(`✅ SUCCESS with variation ${i + 1}: ${searchAddress}`);
				console.log(
					`📍 Coordinates: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`
				);
				return {
					...result,
					strategy_used: `variation_${i + 1}`,
					original_address: address,
					successful_address: searchAddress,
				};
			}

			// Progressive delay: start fast, get slower for later attempts
			if (i < uniqueVariations.length - 1) {
				const delay = Math.min(200 + i * 100, 1000);
				console.log(`⏳ Waiting ${delay}ms before next attempt...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		console.log(
			`❌ All ${uniqueVariations.length} attempts failed for: ${address}`
		);
		return null;
	} catch (error) {
		console.error(`💥 Geocoding error for ${address}:`, error.message);
		return null;
	}
}

/**
 * Detect appropriate country code for Nominatim API
 */
function detectCountryCode(address) {
	const addressLower = address.toLowerCase();
	if (addressLower.includes('luxembourg')) return 'lu';
	if (addressLower.includes('belgium')) return 'be';
	if (addressLower.includes('france')) return 'fr';
	if (addressLower.includes('germany')) return 'de';
	if (addressLower.includes('netherlands')) return 'nl';
	// Default to broader European search
	return 'lu,be,fr,de,nl';
}

/**
 * Enhanced geocoding request with better error handling
 */
function makeGeocodingRequest(url, searchAddress) {
	const https = require('https');

	return new Promise((resolve, reject) => {
		const req = https.get(
			url,
			{
				headers: {
					'User-Agent': 'Real Estate Geocoder v2.0 (Enhanced Address Cleanup)',
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
							// Find the best result with preference for exact country matches
							const bestResult = findBestGeocodingResult(
								results,
								searchAddress
							);

							if (bestResult && bestResult.lat && bestResult.lon) {
								resolve({
									lat: parseFloat(bestResult.lat),
									lng: parseFloat(bestResult.lon),
									display_name: bestResult.display_name,
									confidence: bestResult.importance || 0,
								});
								return;
							}
						}
						resolve(null);
					} catch (e) {
						console.log(`📊 JSON parse error for ${searchAddress}:`, e.message);
						resolve(null);
					}
				});
			}
		);

		req.on('error', (e) => {
			console.log(`🔥 Request failed for ${searchAddress}:`, e.message);
			resolve(null);
		});

		req.setTimeout(15000, () => {
			req.destroy();
			console.log(`⏰ Timeout for: ${searchAddress}`);
			resolve(null);
		});
	});
}

/**
 * Find the best geocoding result based on relevance and country matching
 */
function findBestGeocodingResult(results, searchAddress) {
	// If only one result, return it
	if (results.length === 1) {
		return results[0];
	}

	// Detect expected country from search address
	const expectedCountry = detectCountryCode(searchAddress);

	// Score results based on multiple factors
	const scoredResults = results.map((result) => {
		let score = result.importance || 0;

		// Boost score if country matches
		const resultCountry = (result.display_name || '').toLowerCase();
		if (expectedCountry.includes('lu') && resultCountry.includes('luxembourg'))
			score += 0.5;
		if (expectedCountry.includes('be') && resultCountry.includes('belgium'))
			score += 0.5;
		if (expectedCountry.includes('fr') && resultCountry.includes('france'))
			score += 0.5;
		if (expectedCountry.includes('de') && resultCountry.includes('germany'))
			score += 0.5;

		// Prefer more specific result types
		if (result.class === 'building' || result.class === 'place') score += 0.3;
		if (result.type === 'house' || result.type === 'residential') score += 0.2;

		return { ...result, score };
	});

	// Sort by score and return best
	scoredResults.sort((a, b) => b.score - a.score);
	return scoredResults[0];
}

// Export functions for use in other modules
module.exports = {
	generateEnhancedAddressVariations,
	geocodeAddressWithEnhancedStrategy,
	detectProblematicComponents,
	generateBelgianAddressVariations,
	generateLuxembourgAddressVariations,
	generateFrenchAddressVariations,
	generateGermanAddressVariations,
	detectCountryCode,
	makeGeocodingRequest,
	// Legacy exports for backward compatibility
	getCleanedAddressVariations,
};

// If running this file directly, run test cases
if (require.main === module) {
	console.log('🧪 Running Address Cleanup Strategy Tests\n');

	const testCases = [
		// Your specific failing case
		'274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Bastogne, Province-de-Luxembourg, Belgium',

		// Other problematic cases
		'NC, Merzig-Brotdorf, 66663, Merzig-Wadern, Saarland, Germany',
		'X, Avenue de la Liberté, Luxembourg-Ville, 1234, Luxembourg',
		'123 Rue de la Paix, Arlon, 6700, Province de Luxembourg, Belgium',
		'TBD, Brussels, 1000, Brussels-Capital Region, Belgium',
		'456 Main Street, Esch-sur-Alzette, 4000, Canton Esch-sur-Alzette, Luxembourg',
	];

	testCases.forEach((testAddress, index) => {
		console.log(`\n📋 Test Case ${index + 1}:`);
		console.log(`Input: ${testAddress}`);
		console.log('Variations:');
		const variations = generateEnhancedAddressVariations(testAddress);
		variations.forEach((variation, i) => {
			console.log(`  ${i + 1}. ${variation}`);
		});
		console.log('─'.repeat(80));
	});
}
