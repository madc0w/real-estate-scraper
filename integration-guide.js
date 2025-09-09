/**
 * Integration Guide: How to Update costMap.cjs with Enhanced Address Cleanup Strategy
 *
 * This file shows the specific changes needed to integrate the enhanced address cleanup
 * strategy into your existing costMap.cjs file.
 */

// 1. Add this import at the top of costMap.cjs (after the existing requires)
const {
	geocodeAddressWithEnhancedStrategy,
} = require('./address-cleanup-strategy.js');

// 2. Replace the existing geocodeAddress function with this enhanced version:
async function geocodeAddress(address) {
	// Use the enhanced strategy instead of the original logic
	const result = await geocodeAddressWithEnhancedStrategy(address);

	if (result) {
		console.log(
			`✓ Enhanced geocoding success: ${result.lat.toFixed(
				4
			)}, ${result.lng.toFixed(4)}`
		);
		console.log(`  Strategy: ${result.strategy_used}`);
		if (result.successful_address !== result.original_address) {
			console.log(`  Used variation: ${result.successful_address}`);
		}

		return {
			lat: result.lat,
			lng: result.lng,
			display_name: result.display_name,
		};
	}

	return null;
}

// 3. Optional: Update the geocodeAllProperties function to show more detailed progress
async function geocodeAllProperties(properties, allProperties) {
	console.log(
		`Starting enhanced geocoding for ${properties.length} properties...`
	);
	const geocodedProperties = [];
	let successCount = 0;
	let cachedCount = 0;
	let enhancedSuccessCount = 0; // Track successes from enhanced strategy

	for (let i = 0; i < properties.length; i++) {
		const property = properties[i];
		console.log(
			`Geocoding ${i + 1}/${properties.length}: ${property.Location}`
		);

		let coords;

		// Check if coordinates are already cached in the CSV
		if (
			property.latitude &&
			property.longitude &&
			!isNaN(parseFloat(property.latitude)) &&
			!isNaN(parseFloat(property.longitude))
		) {
			coords = {
				lat: parseFloat(property.latitude),
				lng: parseFloat(property.longitude),
				display_name: property.geocoded_address || property.Location,
			};
			cachedCount++;
			console.log(
				`✓ Using cached coordinates: ${coords.lat.toFixed(
					4
				)}, ${coords.lng.toFixed(4)}`
			);
		} else {
			// Use enhanced geocoding strategy
			const result = await geocodeAddressWithEnhancedStrategy(
				property.Location
			);
			if (result) {
				coords = {
					lat: result.lat,
					lng: result.lng,
					display_name: result.display_name || property.Location,
				};

				// Track if enhanced strategy was used (not original address)
				if (result.successful_address !== result.original_address) {
					enhancedSuccessCount++;
					console.log(`🎯 Enhanced strategy success: ${result.strategy_used}`);
				}

				// Update the property with new coordinates for caching
				property.latitude = coords.lat.toString();
				property.longitude = coords.lng.toString();
				property.geocoded_address = coords.display_name;
				property.geocoding_strategy = result.strategy_used || 'original';

				// Find and update the original property in allProperties array
				const originalProperty = allProperties.find(
					(p) =>
						p.Location === property.Location &&
						p['Price From'] === property['Price From'] &&
						p['Area From'] === property['Area From']
				);
				if (originalProperty) {
					originalProperty.latitude = coords.lat.toString();
					originalProperty.longitude = coords.lng.toString();
					originalProperty.geocoded_address = coords.display_name;
					originalProperty.geocoding_strategy =
						result.strategy_used || 'original';
				}

				successCount++;
				console.log(
					`✓ Successfully geocoded: ${coords.lat.toFixed(
						4
					)}, ${coords.lng.toFixed(4)}`
				);
			} else {
				console.error(`❌ Enhanced geocoding failed for: ${property.Location}`);
			}
		}

		if (coords) {
			geocodedProperties.push({
				...property,
				lat: coords.lat,
				lng: coords.lng,
				geocoded_address: coords.display_name || property.Location,
			});

			// Progressive delay - no delay for cached results
			if (!property.latitude && i < properties.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, 800));
			}
		}
	}

	console.log(`Geocoding completed!`);
	console.log(`Success: ${successCount}, Cached: ${cachedCount}`);
	console.log(`Enhanced strategy helped: ${enhancedSuccessCount} addresses`);

	return geocodedProperties;
}

/* 
SUMMARY OF CHANGES NEEDED:

1. Add the import line at the top of costMap.cjs
2. Replace the geocodeAddress function with the enhanced version above  
3. Optionally replace geocodeAllProperties for better tracking
4. The existing code will automatically use the enhanced strategy

BENEFITS:
- Automatically handles Belgian addresses with too many administrative levels
- Progressive fallback strategy tries multiple variations
- Better success rate for European addresses
- Detailed logging shows which strategy worked
- Backward compatible with existing code

YOUR SPECIFIC CASE:
The address "274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Bastogne, Province-de-Luxembourg, Belgium"
will now automatically be cleaned to "274 Chaussee de Saint Hubert, Vaux-sur-Sure, 6640, Belgium"
which should geocode successfully.
*/

console.log(
	'Integration guide loaded. Apply these changes to costMap.cjs for enhanced geocoding.'
);

module.exports = {
	// Enhanced version ready to replace the original
	geocodeAddress,
	geocodeAllProperties,
};
