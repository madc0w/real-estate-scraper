const fs = require('fs');
const path = require('path');

// Read and parse CSV data
function parseCSV(filePath) {
	const csvContent = fs.readFileSync(filePath, 'utf-8');
	const lines = csvContent.split('\n');
	const headers = lines[0].split(',');

	const data = [];
	for (let i = 1; i < 20; i++) {
		if (lines[i].trim()) {
			const values = parseCSVLine(lines[i]);
			if (values.length === headers.length) {
				const row = {};
				headers.forEach((header, index) => {
					row[header.trim()] = values[index];
				});
				data.push(row);
			}
		}
	}
	return data;
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

// Filter properties with price from and area from but no price to and area to
function filterProperties(data) {
	return data.filter((property) => {
		const priceFrom = parseFloat(property['Price From']);
		const priceTo = property['Price To'];
		const areaFrom = parseFloat(property['Area From']);
		const areaTo = property['Area To'];

		// Check if price from and area from are defined (not empty/null)
		// and price to and area to are empty
		return (
			!isNaN(priceFrom) &&
			priceFrom > 0 &&
			(!priceTo || priceTo.trim() === '') &&
			!isNaN(areaFrom) &&
			areaFrom > 0 &&
			(!areaTo || areaTo.trim() === '')
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

// Geocode address using Nominatim OpenStreetMap API
async function geocodeAddress(address) {
	try {
		// Clean up the address for better geocoding
		const cleanAddress = address.replace(/\s+/g, ' ').trim();
		const encodedAddress = encodeURIComponent(cleanAddress);
		
		// Use Nominatim API for geocoding
		const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodedAddress}`;
		
		// For Node.js, we'll use a simple fetch-like approach
		const https = require('https');
		
		return new Promise((resolve, reject) => {
			const req = https.get(url, {
				headers: {
					'User-Agent': 'Real Estate Heat Map Generator'
				}
			}, (res) => {
				let data = '';
				res.on('data', chunk => data += chunk);
				res.on('end', () => {
					try {
						const results = JSON.parse(data);
						if (results && results.length > 0) {
							const result = results[0];
							resolve({
								lat: parseFloat(result.lat),
								lng: parseFloat(result.lon),
								display_name: result.display_name
							});
						} else {
							// Fallback to Luxembourg center
							console.log(`Geocoding failed for: ${address}, using Luxembourg center`);
							resolve({ lat: 49.6116, lng: 6.1319 });
						}
					} catch (e) {
						console.log(`Geocoding error for ${address}:`, e.message);
						resolve({ lat: 49.6116, lng: 6.1319 });
					}
				});
			});
			
			req.on('error', (e) => {
				console.log(`Geocoding request failed for ${address}:`, e.message);
				resolve({ lat: 49.6116, lng: 6.1319 });
			});
			
			req.setTimeout(5000, () => {
				req.destroy();
				console.log(`Geocoding timeout for: ${address}, using Luxembourg center`);
				resolve({ lat: 49.6116, lng: 6.1319 });
			});
		});
	} catch (error) {
		console.log(`Geocoding error for ${address}:`, error.message);
		return { lat: 49.6116, lng: 6.1319 };
	}
}

// Batch geocode all properties
async function geocodeAllProperties(properties) {
	console.log(`Starting geocoding for ${properties.length} properties...`);
	const geocodedProperties = [];
	
	for (let i = 0; i < properties.length; i++) {
		const property = properties[i];
		console.log(`Geocoding ${i + 1}/${properties.length}: ${property.Location}`);
		
		const coords = await geocodeAddress(property.Location);
		geocodedProperties.push({
			...property,
			lat: coords.lat,
			lng: coords.lng,
			geocoded_address: coords.display_name || property.Location
		});
		
		// Add a small delay to be respectful to the geocoding service
		if (i < properties.length - 1) {
			await new Promise(resolve => setTimeout(resolve, 1000));
		}
	}
	
	console.log('Geocoding completed!');
	return geocodedProperties;
}

// Generate enhanced HTML heat map with real geocoded coordinates
function generateHeatMap(properties) {
	// Calculate statistics for better visualization
	const costs = properties.map((p) => p.costPerSqM);
	const minCost = Math.min(...costs);
	const maxCost = Math.max(...costs);
	const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length;

	const html = `
<!DOCTYPE html>
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
    </style>
</head>
<body>
    <div class="info-panel">
        <h3>🏠 Luxembourg Real Estate Analysis</h3>
        
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
								(property) => `
                <div class="property-item">
                    <strong>€${property.costPerSqM.toFixed(0)}/m²</strong>
                    ${property.Location.split(',')[0]}<br>
                    <span style="color: #6c757d;">€${property.priceFrom.toLocaleString()} / ${
									property.areaFrom
								}m²</span>
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
            <span>€0 - €2K</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #ffeda0, #fed976);"></div>
            <span>€2K - €4K</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #fed976, #feb24c);"></div>
            <span>€4K - €6K</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #feb24c, #fd8d3c);"></div>
            <span>€6K - €10K</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #fd8d3c, #fc4e2a);"></div>
            <span>€10K - €20K</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #fc4e2a, #e31a1c);"></div>
            <span>€20K - €50K</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #e31a1c, #b10026);"></div>
            <span>€50K+</span>
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
        
        console.log('Loaded', properties.length, 'properties with real coordinates');
        
        // Create optimized heat map data with proper intensity scaling
        const maxCostForHeat = Math.min(${maxCost}, 50000); // Cap for better visualization
        const heatData = properties.map(property => {
            const intensity = Math.min(property.costPerSqM / maxCostForHeat, 1);
            return [property.lat, property.lng, intensity];
        });

        // Create heat layer with better configuration
        let heatLayer = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
                0.0: 'rgba(255,255,204,0.8)',
                0.1: 'rgba(255,237,160,0.8)',
                0.2: 'rgba(254,217,118,0.8)',
                0.3: 'rgba(254,178,76,0.8)',
                0.4: 'rgba(253,141,60,0.8)',
                0.5: 'rgba(252,78,42,0.8)',
                0.6: 'rgba(227,26,28,0.8)',
                0.8: 'rgba(177,0,38,0.9)',
                1.0: 'rgba(128,0,38,1.0)'
            }
        }).addTo(map);

        // Create marker clusters for better performance
        let markerGroup = L.layerGroup();
        
        // Add markers for properties with different colors based on cost
        function getMarkerColor(costPerSqM) {
            if (costPerSqM > 20000) return '#b10026';
            if (costPerSqM > 10000) return '#e31a1c';
            if (costPerSqM > 6000) return '#fc4e2a';
            if (costPerSqM > 4000) return '#fd8d3c';
            if (costPerSqM > 2000) return '#feb24c';
            if (costPerSqM > 1000) return '#fed976';
            return '#ffeda0';
        }
        
        properties.forEach(property => {
            const color = getMarkerColor(property.costPerSqM);
            const marker = L.circleMarker([property.lat, property.lng], {
                radius: Math.min(6 + Math.log(property.costPerSqM / 1000), 12),
                fillColor: color,
                color: '#ffffff',
                weight: 2,
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
                    </div>
                    \${property.geocoded_address ? '<div class="popup-address">Geocoded: ' + property.geocoded_address + '</div>' : ''}
                </div>
            \`;
            
            marker.bindPopup(popupContent);
            markerGroup.addLayer(marker);
        });
        
        markerGroup.addTo(map);
        
        // Auto-fit map bounds to show all properties
        if (properties.length > 0) {
            const bounds = L.latLngBounds(properties.map(p => [p.lat, p.lng]));
            map.fitBounds(bounds, { padding: [20, 20] });
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
                    0.0: 'rgba(255,255,204,0.8)',
                    0.1: 'rgba(255,237,160,0.8)',
                    0.2: 'rgba(254,217,118,0.8)',
                    0.3: 'rgba(254,178,76,0.8)',
                    0.4: 'rgba(253,141,60,0.8)',
                    0.5: 'rgba(252,78,42,0.8)',
                    0.6: 'rgba(227,26,28,0.8)',
                    0.8: 'rgba(177,0,38,0.9)',
                    1.0: 'rgba(128,0,38,1.0)'
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
<!DOCTYPE html>
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
            min-width: 200px;
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
    </style>
</head>
<body>
    <div class="info-panel">
        <h3>🏠 Luxembourg Real Estate Analysis</h3>
        
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
								(property) => `
                <div class="property-item">
                    <strong>€${property.costPerSqM.toFixed(0)}/m²</strong>
                    ${property.Location.split(',')[0]}<br>
                    <span style="color: #6c757d;">€${property.priceFrom.toLocaleString()} / ${
									property.areaFrom
								}m²</span>
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
            <span>€0 - €2K</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #ffeda0, #fed976);"></div>
            <span>€2K - €4K</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #fed976, #feb24c);"></div>
            <span>€4K - €6K</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #feb24c, #fd8d3c);"></div>
            <span>€6K - €10K</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #fd8d3c, #fc4e2a);"></div>
            <span>€10K - €20K</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #fc4e2a, #e31a1c);"></div>
            <span>€20K - €50K</span>
        </div>
        <div class="legend-item">
            <div class="legend-color" style="background: linear-gradient(90deg, #e31a1c, #b10026);"></div>
            <span>€50K+</span>
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
        
        // Property data with real coordinates
        const properties = ${JSON.stringify(mappedProperties)};
        
        console.log('Loaded', properties.length, 'properties with coordinates');
        
        // Create optimized heat map data with proper intensity scaling
        const maxCostForHeat = Math.min(${maxCost}, 50000); // Cap for better visualization
        const heatData = properties.map(property => {
            const intensity = Math.min(property.costPerSqM / maxCostForHeat, 1);
            return [property.lat, property.lng, intensity];
        });

        // Create heat layer with better configuration
        let heatLayer = L.heatLayer(heatData, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
                0.0: 'rgba(255,255,204,0.8)',
                0.1: 'rgba(255,237,160,0.8)',
                0.2: 'rgba(254,217,118,0.8)',
                0.3: 'rgba(254,178,76,0.8)',
                0.4: 'rgba(253,141,60,0.8)',
                0.5: 'rgba(252,78,42,0.8)',
                0.6: 'rgba(227,26,28,0.8)',
                0.8: 'rgba(177,0,38,0.9)',
                1.0: 'rgba(128,0,38,1.0)'
            }
        }).addTo(map);

        // Create marker clusters for better performance
        let markerGroup = L.layerGroup();
        
        // Add markers for properties with different colors based on cost
        function getMarkerColor(costPerSqM) {
            if (costPerSqM > 20000) return '#b10026';
            if (costPerSqM > 10000) return '#e31a1c';
            if (costPerSqM > 6000) return '#fc4e2a';
            if (costPerSqM > 4000) return '#fd8d3c';
            if (costPerSqM > 2000) return '#feb24c';
            if (costPerSqM > 1000) return '#fed976';
            return '#ffeda0';
        }
        
        properties.forEach(property => {
            if (property.costPerSqM > 1000) { // Only show markers for properties > €1000/m²
                const color = getMarkerColor(property.costPerSqM);
                const marker = L.circleMarker([property.lat, property.lng], {
                    radius: Math.min(8 + Math.log(property.costPerSqM / 1000), 15),
                    fillColor: color,
                    color: '#ffffff',
                    weight: 2,
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
                        </div>
                    </div>
                \`;
                
                marker.bindPopup(popupContent);
                markerGroup.addLayer(marker);
            }
        });
        
        markerGroup.addTo(map);
        
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
                    0.0: 'rgba(255,255,204,0.8)',
                    0.1: 'rgba(255,237,160,0.8)',
                    0.2: 'rgba(254,217,118,0.8)',
                    0.3: 'rgba(254,178,76,0.8)',
                    0.4: 'rgba(253,141,60,0.8)',
                    0.5: 'rgba(252,78,42,0.8)',
                    0.6: 'rgba(227,26,28,0.8)',
                    0.8: 'rgba(177,0,38,0.9)',
                    1.0: 'rgba(128,0,38,1.0)'
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
        
        console.log('Enhanced heat map loaded successfully!');
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
		const csvPath = path.join(__dirname, 'athome.csv');
		const allProperties = parseCSV(csvPath);
		console.log(`Total properties in dataset: ${allProperties.length}`);

		// Filter properties with single price and area values
		const filteredProperties = filterProperties(allProperties);
		console.log(
			`Properties with defined single price and area: ${filteredProperties.length}`
		);

		if (filteredProperties.length === 0) {
			console.log('No properties found matching criteria');
			return;
		}

		// Calculate cost per square meter
		const propertiesWithCost = calculateCostPerSqM(filteredProperties);

		// Geocode all properties to get real coordinates
		const geocodedProperties = await geocodeAllProperties(propertiesWithCost);

		// Sort by cost per square meter
		geocodedProperties.sort((a, b) => b.costPerSqM - a.costPerSqM);

		// Display analysis results
		console.log('\nCost per Square Meter Analysis:');
		console.log('================================');
		console.log(
			`Average cost: €${(
				geocodedProperties.reduce((sum, p) => sum + p.costPerSqM, 0) /
				geocodedProperties.length
			).toFixed(2)} per m²`
		);
		console.log(
			`Median cost: €${geocodedProperties[
				Math.floor(geocodedProperties.length / 2)
			].costPerSqM.toFixed(2)} per m²`
		);
		console.log(
			`Highest cost: €${geocodedProperties[0].costPerSqM.toFixed(2)} per m²`
		);
		console.log(
			`Lowest cost: €${geocodedProperties[
				geocodedProperties.length - 1
			].costPerSqM.toFixed(2)} per m²`
		);

		console.log('\nTop 10 Most Expensive Properties per m²:');
		console.log('==========================================');
		geocodedProperties.slice(0, 10).forEach((property, index) => {
			console.log(
				`${index + 1}. €${property.costPerSqM.toFixed(2)}/m² - ${
					property.Location
				}`
			);
			console.log(
				`   Price: €${property.priceFrom.toLocaleString()}, Area: ${
					property.areaFrom
				}m²`
			);
			console.log('');
		});

		console.log('\nTop 10 Most Affordable Properties per m²:');
		console.log('==========================================');
		geocodedProperties
			.slice(-10)
			.reverse()
			.forEach((property, index) => {
				console.log(
					`${index + 1}. €${property.costPerSqM.toFixed(2)}/m² - ${
						property.Location
					}`
				);
				console.log(
					`   Price: €${property.priceFrom.toLocaleString()}, Area: ${
						property.areaFrom
					}m²`
				);
				console.log('');
			});

		// Generate HTML heat map with real coordinates
		const htmlContent = generateHeatMap(geocodedProperties);
		const outputPath = path.join(
			__dirname,
			'luxembourg_real_estate_heatmap.html'
		);
		fs.writeFileSync(outputPath, htmlContent);

		console.log(`\nHeat map generated: ${outputPath}`);
		console.log(
			'Open this file in a web browser to view the interactive heat map.'
		);

		// Save processed data as JSON
		const jsonPath = path.join(__dirname, 'processed_real_estate_data.json');
		fs.writeFileSync(jsonPath, JSON.stringify(geocodedProperties, null, 2));
		console.log(`Processed data saved: ${jsonPath}`);
	} catch (error) {
		console.error('Error processing data:', error.message);
	}
}

// Run the analysis
main();
