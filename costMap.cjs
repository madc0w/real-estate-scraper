const fs = require('fs');
const path = require('path');

const type = 'for-sale';
// const type = 'for-rent';
const outlierThreshold = 0.04;

const isUsingOnlyCachedGeocodes = true;

// Read and parse CSV data
function parseCSV(filePath) {
	// Read the file as binary first to handle encoding properly
	const buffer = fs.readFileSync(filePath);

	// Convert buffer to string, handling UTF-8 BOM if present
	let csvContent = buffer.toString('utf8');

	// Remove BOM if present
	if (csvContent.charCodeAt(0) === 0xfeff) {
		csvContent = csvContent.substr(1);
	}
	const lines = csvContent.split('\n');
	const headers = lines[0].split(',').map((h) => h.trim());

	const data = [];
	for (let i = 1; i < lines.length; i++) {
		// for (let i = 1; i < 100; i++) {
		if (lines[i].trim()) {
			const values = parseCSVLine(lines[i]);
			if (values.length >= headers.length - 2) {
				// Allow for missing lat/lng columns
				const row = {};
				headers.forEach((header, index) => {
					row[header] = values[index] || ''; // Default to empty string if missing
				});
				data.push(row);
			}
		}
	}
	return data;
}

// Save updated CSV data with geocoded coordinates
function saveCSVWithCoordinates(filePath, data, originalHeaders) {
	// Ensure Latitude, Longitude, geocode address, and eur/sq m headers exist
	const headers = [...originalHeaders];
	if (!headers.includes('Latitude')) {
		headers.push('Latitude');
	}
	if (!headers.includes('Longitude')) {
		headers.push('Longitude');
	}
	if (!headers.includes('Geocode address')) {
		headers.push('Geocode address');
	}
	if (!headers.includes('eur/sq m')) {
		headers.push('eur/sq m');
	}

	// Create CSV content
	const csvLines = [headers.join(',')];

	data.forEach((row) => {
		const values = headers.map((header) => {
			let value = row[header] || '';
			// Escape commas and quotes in values
			if (value.toString().includes(',') || value.toString().includes('"')) {
				value = `"${value.toString().replace(/"/g, '""')}"`;
			}
			return value;
		});
		csvLines.push(values.join(','));
	});

	fs.writeFileSync(filePath, csvLines.join('\n'), 'utf-8');
	console.log(`Updated CSV file saved: ${filePath}`);
}

// Parse CSV line handling quoted values
function parseCSVLine(line) {
	const result = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === ',' && !inQuotes) {
			result.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}
	result.push(current.trim());
	return result;
}

// Validate that an address has at least a meaningful street component
function validateAddress(address) {
	if (!address || typeof address !== 'string') {
		return false;
	}

	// Simple fix: remove comma after street number to combine number and street name
	address = address.replace(/^(\d[\dA-Z\-]*)\,/i, '$1');

	// Split by comma and get the first part (street)
	const parts = address.split(',').map((part) => part.trim());
	if (parts.length === 0) {
		return false;
	}

	const streetPart = parts[0].trim();

	// Check if street part exists and is meaningful
	if (!streetPart || streetPart.length === 0) {
		return false;
	}

	// Common problematic prefixes/codes that indicate no real street
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
		'?',
		'NO STREET',
		'MISSING',
		'UNDEFINED',
	];

	const streetUpper = streetPart.toUpperCase();

	// Reject if it's a problematic prefix
	if (problematicPrefixes.includes(streetUpper)) {
		// console.log(
		// 	`⚠️  Rejected address with invalid street: "${streetPart}". address: ${address}`
		// );
		return false;
	}

	// Reject if it's too short (less than 3 characters, likely a code)
	if (streetPart.length < 3) {
		// console.log(
		// 	`⚠️  Rejected address with too short street: "${streetPart}" . address: ${address}`
		// );
		return false;
	}

	// Reject if it's all caps and very short (likely a code like "ABC")
	if (/^[A-Z]{1,3}$/.test(streetPart)) {
		// console.log(
		// 	`⚠️  Rejected address with code-like street: "${streetPart}". address: ${address}`
		// );
		return false;
	}

	// Reject if it's just numbers (postal codes aren't streets)
	if (/^\d+$/.test(streetPart)) {
		// console.log(
		// 	`⚠️  Rejected address starting with just numbers: "${streetPart}". address: ${address}`
		// );
		return false;
	}

	// Reject if it's just a city name without street indicators
	// Check if the streetPart looks like just a city name (no street number or street type words)
	const hasStreetNumber = /\d/.test(streetPart);
	const hasStreetIndicators =
		/\b(rue|street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|place|pl|way|court|ct|circle|cir|square|sq|alley|ally|path|trail|terrace|ter|parkway|pkwy|highway|hwy|route|rt|crescent|cres|close|gardens|gdns|grove|gr|hill|heights|park|mews|passage|walk|row|strand|quay|embankment|promenade|esplanade|laangert|an|am|bei|zur|zum|strasse|str|gasse|platz|weg|allee|ring|damm|berg|tal|feld|hof|wiese|bach|brunnen|quelle|mühle|kirch|kapelle|schloss|burg|turm|tor|brücke|markt|zentrum|dorf|stadt|siedlung|anger|aue|heide|forst|wald|see|teich|fluss|ufer|hang|kuppe|spitze|kopf|horn|fels|stein|grund|matte|wiese|acker|garten|park|alle|allee|straße)\b/i.test(
			streetPart
		);

	// Common city names that shouldn't be considered streets
	const commonCityNames = [
		'namur',
		'brussels',
		'bruxelles',
		'antwerp',
		'anvers',
		'ghent',
		'gent',
		'charleroi',
		'liege',
		'luik',
		'bruges',
		'brugge',
		'luxembourg',
		'letzebuerg',
		'esch',
		'differdange',
		'dudelange',
		'petange',
		'sanem',
		'bettembourg',
		'schifflange',
		'kayl',
		'rumelange',
		'mondercange',
	];
	const isCityName = commonCityNames.includes(streetPart.toLowerCase());

	if (isCityName && !hasStreetNumber && !hasStreetIndicators) {
		// console.log(
		// 	`⚠️  Rejected address that appears to be just a city name: "${streetPart}". address: ${address}`
		// );
		return false;
	}

	// Must contain at least one letter (streets should have names)
	if (!/[a-zA-Z]/.test(streetPart)) {
		// console.log(
		// 	`⚠️  Rejected address with no letters in street: "${streetPart}". address: ${address}`
		// );
		return false;
	}

	return true;
}

// Calculate cost per square meter percentiles to filter out extreme values
function calculateCostPerSqMThresholds(data) {
	// First, get all valid cost per square meter values
	const validCosts = [];

	data.forEach((property) => {
		const priceFrom = parseFloat(property['Price From']);
		const priceTo = property['Price To'];
		const areaFrom = parseFloat(property['Area From']);
		const areaTo = property['Area To'];
		const location = property['Location'] || '';

		// Check if address has at least a street (first part before comma should be meaningful)
		const hasValidStreet = validateAddress(location);

		// Calculate cost per square meter
		const costPerSqM =
			!isNaN(priceFrom) && !isNaN(areaFrom) && areaFrom > 0
				? priceFrom / areaFrom
				: 0;

		// Only include properties that meet basic criteria
		if (
			!isNaN(priceFrom) &&
			priceFrom > 0 &&
			(!priceTo || priceTo.trim() === '') &&
			!isNaN(areaFrom) &&
			areaFrom > 20 &&
			(!areaTo || areaTo.trim() === '') &&
			hasValidStreet &&
			costPerSqM > 0
		) {
			validCosts.push(costPerSqM);
		}
	});

	if (validCosts.length === 0) {
		console.log('No valid cost data found for threshold calculation');
		return { minCostPerSqM: 0, maxCostPerSqM: Infinity };
	}

	// Sort costs and calculate 2nd and 98th percentiles to remove extreme outliers
	validCosts.sort((a, b) => a - b);
	const count = validCosts.length;

	const p2Index = Math.floor(count * outlierThreshold);
	const p98Index = Math.floor(count * (1 - outlierThreshold));

	const minCostPerSqM = validCosts[p2Index];
	const maxCostPerSqM = validCosts[p98Index];

	console.log(
		`Cost per sqM range (excluding top/bottom ${
			outlierThreshold * 100
		}%): €${minCostPerSqM.toFixed(0)} - €${maxCostPerSqM.toFixed(0)}`
	);
	console.log(`Total valid properties for range calculation: ${count}`);

	return { minCostPerSqM, maxCostPerSqM };
}

// Filter properties with price from and area from but no price to and area to, excluding extreme outliers
function filterProperties(data, minCostPerSqM, maxCostPerSqM) {
	return data.filter((property) => {
		const priceFrom = parseFloat(property['Price From']);
		const priceTo = property['Price To'];
		const areaFrom = parseFloat(property['Area From']);
		const areaTo = property['Area To'];
		const location = property['Location'] || '';

		// Check if address has at least a street (first part before comma should be meaningful)
		const hasValidStreet = validateAddress(location);

		// Calculate cost per square meter for filtering
		const costPerSqM =
			!isNaN(priceFrom) && !isNaN(areaFrom) && areaFrom > 0
				? priceFrom / areaFrom
				: 0;

		// Check if price from and area from are defined (not empty/null)
		// and price to and area to are empty
		// Remove only the top/bottom 2% extreme outliers, treat the rest normally
		return (
			!isNaN(priceFrom) &&
			priceFrom > 0 &&
			(!priceTo || priceTo.trim() === '') &&
			!isNaN(areaFrom) &&
			areaFrom > 20 &&
			(!areaTo || areaTo.trim() === '') &&
			hasValidStreet &&
			costPerSqM >= minCostPerSqM &&
			costPerSqM <= maxCostPerSqM
		);
	});
}

// Calculate cost per square meter
function calculateCostPerSqM(properties) {
	return properties.map((property) => {
		const priceFrom = parseFloat(property['Price From']);
		const areaFrom = parseFloat(property['Area From']);
		const costPerSqM = priceFrom / areaFrom;

		return {
			...property,
			costPerSqM: costPerSqM,
			priceFrom: priceFrom,
			areaFrom: areaFrom,
		};
	});
}

// Helper function to clean address
function cleanAddressText(address, preserveReplacementChars = false) {
	let result = address
		.normalize('NFD') // Decompose accented characters
		.replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
		// Handle specific characters that don't decompose properly
		.replace(/[àáâãäåæ]/g, 'a')
		.replace(/[èéêë]/g, 'e')
		.replace(/[ìíîï]/g, 'i')
		.replace(/[òóôõöø]/g, 'o')
		.replace(/[ùúûü]/g, 'u')
		.replace(/[ýÿ]/g, 'y')
		.replace(/[ñ]/g, 'n')
		.replace(/[ç]/g, 'c')
		.replace(/[ß]/g, 'ss')
		.replace(/[ÀÁÂÃÄÅÆ]/g, 'A')
		.replace(/[ÈÉÊË]/g, 'E')
		.replace(/[ÌÍÎÏ]/g, 'I')
		.replace(/[ÒÓÔÕÖØ]/g, 'O')
		.replace(/[ÙÚÛÜ]/g, 'U')
		.replace(/[ÝŸ]/g, 'Y')
		.replace(/[Ñ]/g, 'N')
		.replace(/[Ç]/g, 'C');

	if (preserveReplacementChars) {
		// Temporarily replace \uFFFD with a placeholder to preserve it
		result = result.replace(/\uFFFD/g, '__REPLACEMENT_CHAR__');
		// Remove other non-ASCII characters
		result = result.replace(/[^\x00-\x7F_]/g, '');
		// Restore replacement characters
		result = result.replace(/__REPLACEMENT_CHAR__/g, '\uFFFD');
	} else {
		// Remove all non-ASCII characters including replacement chars
		result = result.replace(/[^\x00-\x7F]/g, '');
	}

	return (
		result
			// Normalize whitespace
			.replace(/\s+/g, ' ')
			.trim()
	);
}

// Helper function to test if an address can be geocoded
async function tryGeocode(address) {
	try {
		const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
			address
		)}&limit=1`;

		const response = await new Promise((resolve, reject) => {
			const request = https.get(url, (res) => {
				let data = '';
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => resolve({ statusCode: res.statusCode, data }));
			});
			request.on('error', reject);
			request.setTimeout(5000, () => {
				request.destroy();
				reject(new Error('Request timeout'));
			});
		});

		if (response.statusCode === 200) {
			const results = JSON.parse(response.data);
			return results.length > 0 ? results[0] : null;
		}
		return null;
	} catch (error) {
		return null;
	}
}

// Generate all possible combinations for replacement characters with smart ordering
function generateReplacementCombinations(address) {
	// Smart substitutions based on context and common patterns
	function getContextualSubstitutions(address, position) {
		const surrounding = address
			.substring(Math.max(0, position - 3), position + 4)
			.toLowerCase();

		// For French/Belgian place names, prioritize based on common patterns
		if (surrounding.includes('sur-s') || surrounding.includes('ux-s')) {
			// "Vaux-sur-S?re" pattern - prioritize 'u' for "Sûre"
			return ['u', 'e', 'a', 'o', 'i', 'ss'];
		}

		if (surrounding.includes('strass') || surrounding.includes('stra')) {
			// German street names - prioritize 'ss' for "Straße"
			return ['ss', 'e', 'a', 'u', 'o', 'i'];
		}

		if (surrounding.includes('sch') || surrounding.includes('utr')) {
			// German words - prioritize 'u' and 'o'
			return ['u', 'o', 'e', 'a', 'i', 'ss'];
		}

		// Default order for general cases
		return ['e', 'a', 'u', 'o', 'i', 'ss'];
	}

	const replacementPositions = [];

	// Find all positions of replacement characters
	for (let i = 0; i < address.length; i++) {
		if (address[i] === '\uFFFD') {
			replacementPositions.push(i);
		}
	}

	if (replacementPositions.length === 0) {
		return [address];
	}

	// Generate smart combinations based on context
	const combinations = [];

	// For single replacement character (most common case), try contextual substitutions
	if (replacementPositions.length === 1) {
		const position = replacementPositions[0];
		const substitutions = getContextualSubstitutions(address, position);

		for (const sub of substitutions) {
			const result =
				address.substring(0, position) + sub + address.substring(position + 1);
			combinations.push(result);
		}

		return combinations;
	}

	// For multiple replacement characters, use standard approach but limit combinations
	const substitutions = ['u', 'e', 'a', 'o', 'i', 'ss']; // Prioritize 'u' and 'e'
	const maxCombinations = 12; // Limit to prevent excessive API calls

	for (
		let i = 0;
		i <
		Math.min(
			Math.pow(substitutions.length, replacementPositions.length),
			maxCombinations
		);
		i++
	) {
		let result = address;
		let temp = i;

		// For each replacement position, choose a substitution
		for (let j = replacementPositions.length - 1; j >= 0; j--) {
			const subIndex = temp % substitutions.length;
			temp = Math.floor(temp / substitutions.length);

			// Replace character at this position
			result =
				result.substring(0, replacementPositions[j]) +
				substitutions[subIndex] +
				result.substring(replacementPositions[j] + 1);
		}

		combinations.push(result);
	}

	return combinations;
}

// Geocode address using Nominatim OpenStreetMap API with improved strategies
async function geocodeAddress(address) {
	try {
		console.log(`🌍 Starting geocoding for: ${address}`);

		// Step 1: First clean up the address structure (remove administrative levels)
		const initialVariations = [
			address,
			...getCleanedAddressVariations(address),
		];

		// Step 2: For each structural variation, also try character replacements if needed
		const allVariations = [];

		for (const variation of initialVariations) {
			// Add the structural variation as-is
			allVariations.push(variation);

			// If this variation has replacement characters, generate character alternatives
			if (variation.includes('\uFFFD')) {
				console.log(`🔄 Found replacement characters in: ${variation}`);
				const charVariations = generateReplacementCombinations(variation);
				console.log(
					`🔄 Generated ${charVariations.length} character combinations`
				);

				// Add character variations, prioritizing the smart ones
				charVariations.forEach((charVar) => {
					if (!allVariations.includes(charVar)) {
						allVariations.push(charVar);
					}
				});
			}
		}

		// Remove duplicates while preserving order
		const uniqueVariations = [];
		const seen = new Set();
		allVariations.forEach((addr) => {
			if (!seen.has(addr)) {
				seen.add(addr);
				uniqueVariations.push(addr);
			}
		});

		console.log(
			`🔄 Will try ${uniqueVariations.length} total variations (structure + character combinations)`
		);

		// Detect appropriate country codes for better API results
		let countryCode = 'lu,fr,de,be,nl'; // Default
		const addressLower = address.toLowerCase();
		if (addressLower.includes('belgium')) countryCode = 'be';
		else if (addressLower.includes('luxembourg')) countryCode = 'lu';
		else if (addressLower.includes('france')) countryCode = 'fr';
		else if (addressLower.includes('germany')) countryCode = 'de';

		for (let i = 0; i < uniqueVariations.length; i++) {
			const searchAddress = uniqueVariations[i];

			// Apply final text cleaning to remove any remaining encoding issues
			const cleanedSearchAddress = cleanAddressText(searchAddress);
			const encodedAddress = encodeURIComponent(cleanedSearchAddress);

			console.log(`trying ${encodedAddress}`);
			// Use Nominatim API with better country filtering
			const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=3&countrycodes=${countryCode}&q=${encodedAddress}`;

			const result = await makeGeocodingRequest(url, cleanedSearchAddress);
			if (result?.lat && result?.lng) {
				console.log(`✅ Success with variation: ${cleanedSearchAddress}`);
				// Return the result with the successful address variation
				return {
					...result,
					successful_address: cleanedSearchAddress,
				};
			}

			// Progressive delay between attempts
			if (i < uniqueVariations.length - 1) {
				const delay = Math.min(200 + i * 100, 1000);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		console.log(
			`❌ All ${uniqueVariations.length} strategies failed for: ${address}`
		);
		return null;
	} catch (error) {
		console.error(`Geocoding error for ${address}:`, error.message);
		return null;
	}
}

// Generate cleaned address variations by removing problematic prefixes and parts
function getCleanedAddressVariations(address) {
	const variations = [];

	// Use the enhanced cleanAddressText that preserves replacement characters
	const fixedAddress = cleanAddressText(address, true); // true = preserve replacement chars

	const parts = fixedAddress.split(',').map((part) => part.trim());

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

	// ENHANCED: Belgian address cleanup (the key fix for your issue)
	if (fixedAddress.toLowerCase().includes('belgium') && parts.length >= 5) {
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

	// ENHANCED: Luxembourg address cleanup with duplicate city name handling
	if (fixedAddress.toLowerCase().includes('luxembourg') && parts.length >= 4) {
		const street = parts[0];
		const city = parts[1];
		const postalCode = parts.length >= 3 ? parts[2] : '';

		// Strategy 1: Handle duplicate city names and administrative regions
		// Pattern: "Street, City, PostalCode, City, Region, Luxembourg"
		// Example: "1 A Laangert, Bertrange, 8117, Bertrange, Centre, Luxembourg"
		const cityOccurrences = parts.filter(
			(part) => part.toLowerCase() === city.toLowerCase()
		).length;

		if (cityOccurrences > 1) {
			console.log(
				`🇱🇺 Detected duplicate city name "${city}" - applying deduplication strategy`
			);

			// Remove duplicate city and administrative region
			if (/^\d{4}$/.test(postalCode)) {
				// Primary fix: Street, City, PostalCode, Luxembourg
				variations.push(`${street}, ${city}, ${postalCode}, Luxembourg`);
				console.log(
					`🇱🇺 Primary fix: ${street}, ${city}, ${postalCode}, Luxembourg`
				);

				// European postal format: Street, PostalCode City, Luxembourg
				variations.push(`${street}, ${postalCode} ${city}, Luxembourg`);
				console.log(
					`🇱🇺 European format: ${street}, ${postalCode} ${city}, Luxembourg`
				);
			}
		}

		// Strategy 2: Remove administrative regions (Centre, Nord, Sud, etc.)
		const luxembourgRegions = [
			'centre',
			'nord',
			'sud',
			'est',
			'ouest',
			'canton',
			'diekirch',
			'echternach',
			'esch-sur-alzette',
			'grevenmacher',
			'luxembourg',
			'mersch',
			'redange',
			'remich',
			'vianden',
			'wiltz',
		];

		const hasRegion = parts.some((part) =>
			luxembourgRegions.includes(part.toLowerCase())
		);

		if (hasRegion) {
			console.log('🇱🇺 Detected administrative region - removing it');
			// Filter out administrative regions
			const filteredParts = parts.filter(
				(part) =>
					!luxembourgRegions.includes(part.toLowerCase()) &&
					part.toLowerCase() !== 'luxembourg'
			);

			if (filteredParts.length >= 3) {
				const cleanStreet = filteredParts[0];
				const cleanCity = filteredParts[1];
				const cleanPostal = filteredParts[2];

				if (/^\d{4}$/.test(cleanPostal)) {
					variations.push(
						`${cleanStreet}, ${cleanCity}, ${cleanPostal}, Luxembourg`
					);
					console.log(
						`🇱🇺 Clean format: ${cleanStreet}, ${cleanCity}, ${cleanPostal}, Luxembourg`
					);
				}
			}
		}

		// Strategy 3: Standard Luxembourg formats (fallback)
		if (/^\d{4}$/.test(postalCode)) {
			variations.push(`${street}, ${city}, ${postalCode}, Luxembourg`);
			variations.push(`${street}, ${postalCode} ${city}, Luxembourg`);
		} else {
			variations.push(`${street}, ${city}, Luxembourg`);
		}

		// Strategy 4: City-only fallback for very complex addresses
		if (parts.length > 5) {
			variations.push(`${city}, Luxembourg`);
			console.log('🇱🇺 City-only fallback for complex Luxembourg address');
		}
	}

	// ENHANCED: German address cleanup
	if (fixedAddress.toLowerCase().includes('germany') && parts.length >= 4) {
		const street = parts[0];
		const city = parts[1];

		variations.push(`${street}, ${city}, Germany`);
		console.log('🇩🇪 Removed German administrative levels');

		if (parts.length >= 3 && /^\d{5}$/.test(parts[2])) {
			const postalCode = parts[2];
			variations.push(`${street}, ${postalCode} ${city}, Germany`);
		}
	}

	// ENHANCED: French address cleanup
	if (fixedAddress.toLowerCase().includes('france') && parts.length >= 4) {
		const street = parts[0];
		const city = parts[1];

		variations.push(`${street}, ${city}, France`);
		console.log('🇫🇷 Removed French administrative levels');

		if (parts.length >= 3 && /^\d{5}$/.test(parts[2])) {
			const postalCode = parts[2];
			variations.push(`${street}, ${postalCode} ${city}, France`);
		}
	}

	return variations;
}

// Parse Luxembourg address format and create alternative search terms
function parseAndReconstructLuxembourgAddress(address) {
	const parts = address.split(',').map((part) => part.trim());
	const alternatives = [];

	if (parts.length >= 2) {
		// Strategy: Street + City, Luxembourg
		const street = parts[0];
		const city = parts[1];
		alternatives.push(`${street}, ${city}, Luxembourg`);

		// Strategy: Just city + Luxembourg
		alternatives.push(`${city}, Luxembourg`);

		// Strategy: If there's a postal code, use it
		if (parts.length >= 3 && /^\d{4}$/.test(parts[2])) {
			const postalCode = parts[2];
			alternatives.push(`${street}, ${postalCode} ${city}, Luxembourg`);
			alternatives.push(`${postalCode} ${city}, Luxembourg`);
		}

		// Strategy: If we have more specific location info
		if (parts.length >= 4) {
			const municipality = parts[3];
			alternatives.push(`${street}, ${city}, ${municipality}, Luxembourg`);
			alternatives.push(`${city}, ${municipality}, Luxembourg`);
		}
	}

	return alternatives;
}

// Make geocoding request with proper error handling
function makeGeocodingRequest(url, searchAddress) {
	const https = require('https');

	return new Promise((resolve, reject) => {
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
						if (results && results.length > 0) {
							// Find the best result - prefer Luxembourg results
							const luxembourgResult = results.find(
								(r) =>
									r.display_name &&
									r.display_name.toLowerCase().includes('luxembourg') &&
									r.lat &&
									r.lon
							);

							const bestResult = luxembourgResult || results[0];

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
						console.log(
							`Geocoding JSON parse error for ${searchAddress}:`,
							e.message
						);
						resolve(null);
					}
				});
			}
		);

		req.on('error', (e) => {
			console.log(`Geocoding request failed for ${searchAddress}:`, e.message);
			resolve(null);
		});

		req.setTimeout(10000, () => {
			req.destroy();
			console.log(`Geocoding timeout for: ${searchAddress}`);
			resolve(null);
		});
	});
}

// Batch geocode all properties with improved error handling, rate limiting, and caching
async function geocodeAllProperties(properties, allProperties) {
	console.log(`Starting geocoding for ${properties.length} properties...`);

	if (isUsingOnlyCachedGeocodes) {
		console.log(
			'🔒 CACHED-ONLY MODE: Will only use existing cached coordinates, no API calls will be made'
		);
	} else {
		console.log(
			'🌍 FULL MODE: Will geocode missing coordinates using API calls'
		);
	}

	const geocodedProperties = [];
	let successCount = 0;
	let cachedCount = 0;

	for (let i = 0; i < properties.length; i++) {
		const property = properties[i];
		if (!isUsingOnlyCachedGeocodes) {
			console.log(
				`Geocoding ${i + 1}/${properties.length}: ${property.Location}`
			);
		}

		let coords;

		// Check if coordinates are already cached in the CSV
		if (
			property.Latitude &&
			property.Longitude &&
			!isNaN(parseFloat(property.Latitude)) &&
			!isNaN(parseFloat(property.Longitude))
		) {
			coords = {
				lat: parseFloat(property.Latitude),
				lng: parseFloat(property.Longitude),
				display_name: property.geocoded_address || property.Location,
				successful_address: property['Geocode address'] || property.Location,
			};
			cachedCount++;
			// console.log(
			// 	`✓ Using cached coordinates: ${coords.lat.toFixed(
			// 		4
			// 	)}, ${coords.lng.toFixed(4)}`
			// );
		} else if (!isUsingOnlyCachedGeocodes) {
			// Geocode the address only if not using cached-only mode
			coords = await geocodeAddress(property.Location);
			if (coords) {
				// Update the property with new coordinates and successful address for caching
				property.Latitude = coords.lat.toString();
				property.Longitude = coords.lng.toString();
				property['Geocode address'] = coords.successful_address;

				// Find and update the original property in allProperties array
				const originalProperty = allProperties.find(
					(p) =>
						p.Location === property.Location &&
						p['Price From'] === property['Price From'] &&
						p['Area From'] === property['Area From']
				);
				if (originalProperty) {
					originalProperty.Latitude = coords.lat.toString();
					originalProperty.Longitude = coords.lng.toString();
					originalProperty['Geocode address'] = coords.successful_address;
				}

				// Check if we got real coordinates vs Luxembourg center fallback
				if (coords) {
					successCount++;
					console.log(
						`✓ Successfully geocoded: ${coords.lat.toFixed(
							4
						)}, ${coords.lng.toFixed(4)} using address: ${
							coords.successful_address
						}`
					);
				} else {
					console.error(
						`Geocoding failed coordinates for: ${property.Location}`
					);
				}
			}
		} else {
			// Skip geocoding when using cached-only mode
			// console.log(
			// 	`⏭️ Skipping geocoding (cached-only mode): ${property.Location}`
			// );
			coords = null;
		}

		if (coords) {
			geocodedProperties.push({
				...property,
				lat: coords.lat,
				lng: coords.lng,
				geocoded_address: coords.display_name || property.Location,
				successfulGeocodeAddress: coords.successful_address,
			});

			// Progressive delay based on success rate to be respectful to the service
			// No delay needed for cached results
			if (!property.Latitude && i < properties.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 800));
			}
		} else {
			// Even without coordinates, include the property for cost analysis
			// This allows us to perform analysis even when geocoding is disabled or fails
			geocodedProperties.push({
				...property,
				lat: null,
				lng: null,
				geocoded_address: property.Location,
				successfulGeocodeAddress: null,
			});
		}
	}

	const skippedCount = properties.length - successCount - cachedCount;
	console.log(
		`Geocoding completed! Success: ${successCount}, Cached: ${cachedCount}, Skipped: ${skippedCount}`
	);
	return geocodedProperties;
}

// Generate HTML heat map with real geocoded coordinates
function generateHeatMap(properties) {
	// Calculate statistics for better visualization
	const costs = properties.map((p) => p.costPerSqM);
	const sortedCosts = [...costs].sort((a, b) => a - b);
	const minCost = Math.min(...costs);
	const maxCost = Math.max(...costs);
	const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;

	console.log(`Cost range: €${minCost.toFixed(0)} - €${maxCost.toFixed(0)}`);

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Luxembourg Real Estate Cost per m² Heat Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://unpkg.com/leaflet.heat@0.2.0/dist/leaflet-heat.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8f9fa;
        }
        
        #map { 
            height: 100vh; 
            width: 100%; 
        }
        
        .info-panel {
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            z-index: 1000;
            max-width: 350px;
            border: 1px solid rgba(255,255,255,0.2);
        }
        
        .info-panel h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 18px;
            font-weight: 600;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin: 15px 0;
        }
        
        .stat-item {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        
        .stat-value {
            font-size: 16px;
            font-weight: 600;
            color: #2c3e50;
            display: block;
        }
        
        .stat-label {
            font-size: 12px;
            color: #6c757d;
            margin-top: 4px;
        }
        
        .legend {
            position: absolute;
            bottom: 30px;
            right: 30px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            z-index: 1000;
            border: 1px solid rgba(255,255,255,0.2);
            min-width: 200px;
        }
        
        .legend h4 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 16px;
            font-weight: 600;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            margin: 8px 0;
            font-size: 14px;
        }
        
        .legend-color {
            width: 24px;
            height: 16px;
            margin-right: 12px;
            border-radius: 3px;
            border: 1px solid rgba(0,0,0,0.1);
        }
        
        .controls {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 15px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            z-index: 1000;
            border: 1px solid rgba(255,255,255,0.2);
        }
        
        .control-item {
            margin: 8px 0;
            display: flex;
            align-items: center;
            font-size: 14px;
        }
        
        .control-item input {
            margin-right: 8px;
        }
        
        .leaflet-popup-content {
            font-family: inherit;
            line-height: 1.5;
        }
        
        .popup-content {
            min-width: 250px;
        }
        
        .popup-price {
            font-size: 18px;
            font-weight: 600;
            color: #e74c3c;
            margin-bottom: 8px;
        }
        
        .popup-location {
            font-size: 14px;
            color: #2c3e50;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .popup-details {
            font-size: 12px;
            color: #6c757d;
            border-top: 1px solid #e9ecef;
            padding-top: 8px;
        }
        
        .popup-details a {
            color: #3498db;
            text-decoration: none;
            font-weight: 500;
        }
        
        .popup-details a:hover {
            color: #2980b9;
            text-decoration: underline;
        }
        
        .popup-address {
            font-size: 11px;
            color: #8e9aaf;
            margin-top: 8px;
            font-style: italic;
        }
        
        .toggle-button {
            background: #3498db;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            margin-top: 10px;
        }
        
        .toggle-button:hover {
            background: #2980b9;
        }
        
        .property-list {
            max-height: 250px;
            overflow-y: auto;
            margin-top: 15px;
            display: none;
        }
        
        .property-item {
            margin: 8px 0;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #3498db;
            font-size: 12px;
        }
        
        .property-item strong {
            color: #e74c3c;
            display: block;
            margin-bottom: 4px;
        }
        
        .property-link {
            color: #3498db;
            text-decoration: none;
            cursor: pointer;
            font-size: 12px;
            margin-top: 8px;
            display: inline-block;
            padding: 4px 8px;
            background: #ecf0f1;
            border-radius: 4px;
            transition: background 0.2s;
        }
        
        .property-link:hover {
            background: #3498db;
            color: white;
        }
        
        @keyframes blink {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.3; transform: scale(1.2); }
            100% { opacity: 1; transform: scale(1); }
        }
        
        .marker-highlight {
            animation: blink 0.8s ease-in-out 4;
        }
    </style>
</head>
<body>
    <div class="info-panel">
        <h3>🏠 ${type == 'for-rent' ? 'For Rent' : 'For Sale'} Analysis</h3>

        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-value">${properties.length.toLocaleString()}</span>
                <div class="stat-label">Properties</div>
            </div>
            <div class="stat-item">
                <span class="stat-value">€${Math.round(
									avgCost
								).toLocaleString()}</span>
                <div class="stat-label">Avg per m²</div>
            </div>
            <div class="stat-item">
                <span class="stat-value">€${Math.round(
									minCost
								).toLocaleString()}</span>
                <div class="stat-label">Min per m²</div>
            </div>
            <div class="stat-item">
                <span class="stat-value">€${Math.round(
									maxCost
								).toLocaleString()}</span>
                <div class="stat-label">Max per m²</div>
            </div>
        </div>
        
        <button class="toggle-button" onclick="togglePropertyList()">
            Show Sample Properties
        </button>
        
        <div class="property-list" id="propertyList">
            <h4 style="margin: 10px 0; color: #2c3e50;">Most Expensive Properties:</h4>
            ${properties
							.slice(0, 8)
							.map(
								(property, index) => `
                <div class="property-item">
                    <strong>€${property.costPerSqM.toFixed(0)}/m²</strong>
                    ${property.Location.split(',')[0]}<br>
                    <span style="color: #6c757d;">€${property.priceFrom.toLocaleString()} / ${
									property.areaFrom
								}m²</span>
                    ${
											property.lat && property.lng
												? `<br><a href="javascript:void(0)" class="property-link" onclick="centerOnProperty(${property.lat}, ${property.lng}, ${index})">📍 Show on Map</a>`
												: ''
										}
                    ${
											property.URL
												? `<br><a href="${property.URL}" target="_blank" rel="noopener" class="property-link">🔗 Original Listing</a>`
												: ''
										}
                </div>
            `
							)
							.join('')}
        </div>
    </div>

    <div class="controls">
        <div class="control-item">
            <input type="checkbox" id="showHeat" checked onchange="toggleHeatLayer()">
            <label for="showHeat">Heat Layer</label>
        </div>
        <div class="control-item">
            <input type="checkbox" id="showMarkers" checked onchange="toggleMarkers()">
            <label for="showMarkers">Property Markers</label>
        </div>
        <div class="control-item">
            <input type="range" id="heatRadius" min="10" max="50" value="25" onchange="updateHeatRadius(this.value)">
            <label for="heatRadius">Heat Radius</label>
        </div>
    </div>

    <div class="legend">
        <h4>💰 Cost per m²</h4>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #ffffcc, #ffeda0);"></div>
            <span>€${Math.round(minCost).toLocaleString()} - €${Math.round(
		minCost + (maxCost - minCost) * 0.2
	).toLocaleString()}</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #ffeda0, #fed976);"></div>
            <span>€${Math.round(
							minCost + (maxCost - minCost) * 0.2
						).toLocaleString()} - €${Math.round(
		minCost + (maxCost - minCost) * 0.4
	).toLocaleString()}</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #fed976, #feb24c);"></div>
            <span>€${Math.round(
							minCost + (maxCost - minCost) * 0.4
						).toLocaleString()} - €${Math.round(
		minCost + (maxCost - minCost) * 0.6
	).toLocaleString()}</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #feb24c, #fd8d3c);"></div>
            <span>€${Math.round(
							minCost + (maxCost - minCost) * 0.6
						).toLocaleString()} - €${Math.round(
		minCost + (maxCost - minCost) * 0.8
	).toLocaleString()}</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #fd8d3c, #fc4e2a);"></div>
            <span>€${Math.round(
							minCost + (maxCost - minCost) * 0.8
						).toLocaleString()} - €${Math.round(
		maxCost
	).toLocaleString()}</span>
        </div>
    </div>

    <div id="map"></div>

    <script>
        // Initialize map with better view of Luxembourg and surrounding regions
        const map = L.map('map').setView([49.6116, 6.1319], 10);
        
        // Add multiple tile layer options
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        });
        
        const cartoLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            attribution: '© OpenStreetMap © CARTO',
            maxZoom: 19
        });
        
        // Add default layer
        cartoLayer.addTo(map);
        
        // Property data with real geocoded coordinates
        const properties = ${JSON.stringify(properties)};
        
        // Calculate range for simple linear scaling
        const costs = properties.map(p => p.costPerSqM);
        const minCost = Math.min(...costs);
        const maxCost = Math.max(...costs);
        
        console.log('Loaded', properties.length, 'properties with real coordinates');
        console.log('Cost range:', 'Min =', minCost.toFixed(0), 'Max =', maxCost.toFixed(0));
        
        // Create heat map data with simple linear intensity scaling
        // Filter out properties without coordinates for mapping
        const mappableProperties = properties.filter(p => p.lat != null && p.lng != null);
        console.log('Mappable properties with coordinates:', mappableProperties.length, 'out of', properties.length);
        
        const heatData = mappableProperties.map(property => {
            // Simple linear scaling from 0.1 to 1.0 based on cost range
            const intensity = Math.max(0.1, (property.costPerSqM - minCost) / (maxCost - minCost));
            return [property.lat, property.lng, intensity];
        });

        // Create heat layer with simple gradient
        let heatLayer = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
                0.0: 'rgba(255,255,204,0.6)',   // Light yellow (low cost)
                0.2: 'rgba(255,237,160,0.7)',    // Yellow
                0.4: 'rgba(254,217,118,0.7)',    // Orange-yellow  
                0.6: 'rgba(254,178,76,0.8)',     // Orange
                0.8: 'rgba(253,141,60,0.8)',     // Red-orange
                1.0: 'rgba(227,26,28,1.0)'       // Deep red (high cost)
            }
        }).addTo(map);

        // Create marker clusters for better performance
        let markerGroup = L.layerGroup();
        let propertyMarkers = []; // Store markers for individual access
        
        // Add markers for properties with different colors based on cost ranges
        function getMarkerColor(costPerSqM) {
            // Simple linear scaling based on cost range
            const position = (costPerSqM - minCost) / (maxCost - minCost);
            
            if (position < 0.2) return '#ffffcc'; // Light yellow
            if (position < 0.4) return '#ffeda0'; // Yellow
            if (position < 0.6) return '#fed976'; // Orange-yellow
            if (position < 0.8) return '#feb24c'; // Orange
            return '#fd8d3c'; // Red-orange
        }
        
        mappableProperties.forEach((property, index) => {
            const color = getMarkerColor(property.costPerSqM);
            const marker = L.circleMarker([property.lat, property.lng], {
                radius: 8,
                fillColor: color,
                color,
                weight: 1,
                opacity: 0.9,
                fillOpacity: 0.7
            });
            
            const popupContent = \`
                <div class="popup-content">
                    <div class="popup-price">€\${property.costPerSqM.toFixed(0)} per m²</div>
                    <div class="popup-location">\${property.Location.split(',')[0]}</div>
                    <div class="popup-details">
                        <strong>Price:</strong> €\${property.priceFrom.toLocaleString()}<br>
                        <strong>Area:</strong> \${property.areaFrom} m²<br>
                        <strong>Location:</strong> \${property.Location}
                        \${property.URL ? '<br><strong>Listing:</strong> <a href="' + property.URL + '" target="_blank" rel="noopener">View Original</a>' : ''}
                    </div>
                    \${property.geocoded_address ? '<div class="popup-address">Geocoded: ' + property.geocoded_address + '</div>' : ''}
                </div>
            \`;
            
            marker.bindPopup(popupContent);
            markerGroup.addLayer(marker);
            
            // Store marker for individual access (only for top 8 properties shown in list)
            if (index < 8) {
                propertyMarkers[index] = marker;
            }
        });
        
        markerGroup.addTo(map);
        
        // Auto-fit map bounds to show all mappable properties
        if (mappableProperties.length > 0) {
            const bounds = L.latLngBounds(mappableProperties.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [20, 20] });
        }
        
        // Function to center map on property and highlight marker
        function centerOnProperty(lat, lng, markerIndex) {
            // Center map on the property
            map.setView([lat, lng], 15);
            
            // Get the marker element and add highlight animation
            if (propertyMarkers[markerIndex]) {
                const marker = propertyMarkers[markerIndex];
                
                // Remove any existing highlight class
                if (marker._path) {
                    marker._path.classList.remove('marker-highlight');
                }
                
                // Add highlight animation
                setTimeout(() => {
                    if (marker._path) {
                        marker._path.classList.add('marker-highlight');
                    }
                }, 100);
                
                // Remove highlight after animation completes
                setTimeout(() => {
                    if (marker._path) {
                        marker._path.classList.remove('marker-highlight');
                    }
                }, 3100); // 3 seconds animation + 0.1 second delay
                
                // Open popup
                marker.openPopup();
            }
        }
        
        // Control functions
        function toggleHeatLayer() {
            const checkbox = document.getElementById('showHeat');
            if (checkbox.checked) {
                map.addLayer(heatLayer);
            } else {
                map.removeLayer(heatLayer);
            }
        }
        
        function toggleMarkers() {
            const checkbox = document.getElementById('showMarkers');
            if (checkbox.checked) {
                map.addLayer(markerGroup);
            } else {
                map.removeLayer(markerGroup);
            }
        }
        
        function updateHeatRadius(radius) {
            map.removeLayer(heatLayer);
            heatLayer = L.heatLayer(heatData, {
                radius: parseInt(radius),
                blur: 15,
                maxZoom: 17,
                max: 1.0,
                gradient: {
                    0.0: 'rgba(255,255,204,0.6)',   // Light yellow (low cost)
                    0.2: 'rgba(255,237,160,0.7)',    // Yellow
                    0.4: 'rgba(254,217,118,0.7)',    // Orange-yellow  
                    0.6: 'rgba(254,178,76,0.8)',     // Orange
                    0.8: 'rgba(253,141,60,0.8)',     // Red-orange
                    1.0: 'rgba(227,26,28,1.0)'       // Deep red (high cost)
                }
            });
            if (document.getElementById('showHeat').checked) {
                map.addLayer(heatLayer);
            }
        }
        
        function togglePropertyList() {
            const list = document.getElementById('propertyList');
            const button = event.target;
            if (list.style.display === 'none' || !list.style.display) {
                list.style.display = 'block';
                button.textContent = 'Hide Sample Properties';
            } else {
                list.style.display = 'none';
                button.textContent = 'Show Sample Properties';
            }
        }
        
        // Add layer control
        const baseLayers = {
            "Light Theme": cartoLayer,
            "OpenStreetMap": osmLayer
        };
        
        L.control.layers(baseLayers).addTo(map);
        
        // Add scale control
        L.control.scale().addTo(map);
        
        console.log('Enhanced heat map loaded successfully with real coordinates!');
        console.log('Statistics:', {
            totalProperties: ${properties.length},
            averageCost: ${Math.round(avgCost)},
            minCost: ${Math.round(minCost)},
            maxCost: ${Math.round(maxCost)}
        });
    </script>
</body>
</html>`;

	return html;
}

// Main execution
async function main() {
	console.log('Analyzing real estate data...');

	try {
		// Read CSV data
		const csvPath = path.join(__dirname, `athome-${type}.csv`);
		const allProperties = parseCSV(csvPath);
		console.log(`Total properties in dataset: ${allProperties.length}`);

		// Store original headers for CSV saving
		const csvContent = fs.readFileSync(csvPath, 'utf-8');
		const originalHeaders = csvContent
			.split('\n')[0]
			.split(',')
			.map((h) => h.trim());

		// Calculate dynamic cost per square meter thresholds (exclude top/bottom 2%)
		const { minCostPerSqM, maxCostPerSqM } =
			calculateCostPerSqMThresholds(allProperties);

		// Filter properties with single price and area values using dynamic thresholds
		const filteredProperties = filterProperties(
			allProperties,
			minCostPerSqM,
			maxCostPerSqM
		);
		console.log(
			`Properties with defined single price and area (€${Math.round(
				minCostPerSqM
			)}-${Math.round(maxCostPerSqM)}/m²): ${filteredProperties.length}`
		);

		if (filteredProperties.length === 0) {
			console.log('No properties found matching criteria');
			return;
		}

		// Calculate cost per square meter
		const propertiesWithCost = calculateCostPerSqM(filteredProperties);

		// Update all properties with eur/sq m values for CSV saving
		allProperties.forEach((property) => {
			const priceFrom = parseFloat(property['Price From']);
			const areaFrom = parseFloat(property['Area From']);

			if (!isNaN(priceFrom) && !isNaN(areaFrom) && areaFrom > 0) {
				const costPerSqM = priceFrom / areaFrom;
				property['eur/sq m'] = costPerSqM.toFixed(2);
			} else {
				property['eur/sq m'] = '';
			}
		});

		// Geocode all properties to get real coordinates (with caching)
		const geocodedProperties = await geocodeAllProperties(
			propertiesWithCost,
			allProperties
		);

		// Save the updated CSV with geocoded coordinates
		if (!isUsingOnlyCachedGeocodes) {
			console.log('\nSaving geocoded coordinates to CSV...');
			saveCSVWithCoordinates(csvPath, allProperties, originalHeaders);
		}

		// Check if we have geocoded properties with valid cost data
		console.log(`Geocoded properties count: ${geocodedProperties.length}`);
		if (geocodedProperties.length === 0) {
			console.log(
				'No geocoded properties found. Cannot generate analysis or heat map.'
			);
			return;
		}

		// Verify that properties have costPerSqM
		const propertiesWithValidCost = geocodedProperties.filter(
			(p) => p.costPerSqM && !isNaN(p.costPerSqM)
		);
		console.log(
			`Properties with valid cost data: ${propertiesWithValidCost.length}`
		);

		if (propertiesWithValidCost.length === 0) {
			console.log('No properties with valid cost per square meter data found.');
			return;
		}

		// Use the filtered properties for analysis
		const validProperties = propertiesWithValidCost;

		// Sort by cost per square meter
		validProperties.sort((a, b) => b.costPerSqM - a.costPerSqM);

		// Display analysis results
		console.log('\nCost per Square Meter Analysis:');
		console.log('================================');
		console.log(
			`Average cost: €${(
				validProperties.reduce((sum, p) => sum + p.costPerSqM, 0) /
				validProperties.length
			).toFixed(2)} per m²`
		);
		console.log(
			`Median cost: €${validProperties[
				Math.floor(validProperties.length / 2)
			].costPerSqM.toFixed(2)} per m²`
		);
		console.log(
			`Highest cost: €${validProperties[0].costPerSqM.toFixed(2)} per m²`
		);
		console.log(
			`Lowest cost: €${validProperties[
				validProperties.length - 1
			].costPerSqM.toFixed(2)} per m²`
		);

		console.log('\nTop 10 Most Expensive Properties per m²:');
		console.log('==========================================');
		validProperties.slice(0, 10).forEach((property, index) => {
			const coordsDisplay =
				property.lat != null && property.lng != null
					? `Coords: ${property.lat.toFixed(4)}, ${property.lng.toFixed(4)}`
					: 'Coords: N/A (not geocoded)';
			console.log(
				`${index + 1}. €${property.costPerSqM.toFixed(2)}/m² - ${
					property.Location
				}`
			);
			console.log(
				`   Price: €${property.priceFrom.toLocaleString()}, Area: ${
					property.areaFrom
				}m² - ${coordsDisplay}`
			);
			console.log('');
		});

		console.log('\nTop 10 Most Affordable Properties per m²:');
		console.log('==========================================');
		validProperties
			.slice(-10)
			.reverse()
			.forEach((property, index) => {
				const coordsDisplay =
					property.lat != null && property.lng != null
						? `Coords: ${property.lat.toFixed(4)}, ${property.lng.toFixed(4)}`
						: 'Coords: N/A (not geocoded)';
				console.log(
					`${index + 1}. €${property.costPerSqM.toFixed(2)}/m² - ${
						property.Location
					}`
				);
				console.log(
					`   Price: €${property.priceFrom.toLocaleString()}, Area: ${
						property.areaFrom
					}m² - ${coordsDisplay}`
				);
				console.log('');
			});

		// Generate HTML heat map with real coordinates
		const htmlContent = generateHeatMap(validProperties);
		const outputPath = path.join(__dirname, `${type}-heatmap.html`);
		fs.writeFileSync(outputPath, htmlContent);

		const mappableCount = validProperties.filter(
			(p) => p.lat != null && p.lng != null
		).length;
		console.log(`\nHeat map generated: ${outputPath}`);
		if (mappableCount > 0) {
			console.log(
				`Heat map contains ${mappableCount} properties with coordinates out of ${validProperties.length} total properties.`
			);
			console.log(
				'Open this file in a web browser to view the interactive heat map.'
			);
		} else {
			console.log(
				'⚠️  Heat map was generated but contains no mappable properties (no coordinates available).'
			);
			console.log(
				'The file will still show the analysis statistics. To see properties on the map,'
			);
			console.log(
				'run with geocoding enabled (set isUsingOnlyCachedGeocodes = false) or provide geocoded data.'
			);
		}

		// Save processed data as JSON
		const jsonPath = path.join(__dirname, 'processed_real_estate_data.json');
		fs.writeFileSync(jsonPath, JSON.stringify(validProperties, null, 2));
		console.log(`Processed data saved: ${jsonPath}`);
	} catch (error) {
		console.error('Error processing data:', error);
	}
}

// Test function to verify address cleanup strategies
async function testAddressCleanup() {
	console.log('\n🧪 Testing Address Cleanup Strategies\n');

	const testCases = [
		// Your specific failing case
		'1 A Laangert, Bertrange, 8117, Bertrange, Centre, Luxembourg',
		// Additional test cases
		'23 Rue de la Paix, Esch-sur-Alzette, 4000, Esch-sur-Alzette, Sud, Luxembourg',
		'45 Avenue Victor Hugo, Luxembourg-Ville, 1234, Luxembourg-Ville, Centre, Luxembourg',
	];

	for (const testAddress of testCases) {
		console.log(`\n📍 Testing: ${testAddress}`);
		console.log('Generated variations:');

		const variations = getCleanedAddressVariations(testAddress);
		variations.forEach((variation, i) => {
			console.log(`  ${i + 1}. ${variation}`);
		});

		// Test actual geocoding (uncomment to test with real API calls)
		// console.log('\n🌍 Testing geocoding...');
		// const result = await geocodeAddress(testAddress);
		// if (result) {
		//     console.log(`✅ Success: ${result.lat.toFixed(4)}, ${result.lng.toFixed(4)}`);
		//     console.log(`   Display: ${result.display_name}`);
		// } else {
		//     console.log('❌ Failed to geocode');
		// }

		console.log('─'.repeat(80));
	}
}

// Uncomment the line below to run the test
// testAddressCleanup();

main();
