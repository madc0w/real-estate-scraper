const puppeteer = require('puppeteer');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Helper function to clean and escape CSV data
function cleanCsvField(value) {
	if (!value) return '';

	// Convert to string and trim
	let cleaned = String(value).trim();

	// Remove extra unwanted text patterns
	cleaned = cleaned
		.replace(/Voir tout/g, '')
		.replace(/Demander plus d'infos/g, '')
		.replace(/Réf atHome \d+/g, '')
		.replace(/Réf Agence .*/g, '')
		.replace(/Description/g, '')
		.replace(/Voir$/g, '')
		.replace(/\s+/g, ' ')
		.trim();

	// Remove any trailing commas or periods that might interfere
	cleaned = cleaned.replace(/[,\.]+$/, '');

	return cleaned;
}

// Helper function to extract email addresses properly
function extractEmail(text) {
	if (!text) return '';

	// Clean the text first
	const cleaned = cleanCsvField(text);

	// Extract email using regex
	const emailMatch = cleaned.match(
		/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
	);
	return emailMatch ? emailMatch[1] : '';
}

// Helper function to extract phone numbers properly
function extractPhone(text) {
	if (!text) return '';

	const cleaned = cleanCsvField(text);

	// Extract phone number patterns
	const phoneMatch = cleaned.match(
		/(\+?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,3})/
	);
	return phoneMatch ? phoneMatch[1].replace(/\s+/g, ' ').trim() : '';
}

// Helper function to extract numeric values (prices, areas)
function extractNumeric(text) {
	if (!text) return '';

	const cleaned = cleanCsvField(text);
	const numericMatch = cleaned.match(/(\d+(?:\s*\d+)*)/);
	return numericMatch ? numericMatch[1].replace(/\s+/g, '') : '';
}

async function testSpecificUrl() {
	console.log('Testing specific URL extraction...');
	const testUrl =
		'https://www.athome.lu/fr/vente/projet-neuf/residence/brooklyn-luxembourg/id-8258648.html';

	const browser = await puppeteer.launch({
		headless: true,
		defaultViewport: { width: 1920, height: 1080 },
	});

	const csvWriter = createCsvWriter({
		path: 'test-output.csv',
		header: [
			{ id: 'date', title: 'Date Added' },
			{ id: 'url', title: 'URL' },
			{ id: 'priceFrom', title: 'Price From' },
			{ id: 'priceTo', title: 'Price To' },
			{ id: 'imageUrl', title: 'Image URL' },
			{ id: 'location', title: 'Location' },
			{ id: 'areaFrom', title: 'Area From' },
			{ id: 'areaTo', title: 'Area To' },
			{ id: 'description', title: 'Description' },
			{ id: 'agencyName', title: 'Agency Name' },
			{ id: 'contactPhone', title: 'Contact Phone' },
			{ id: 'contactEmail', title: 'Contact Email' },
			{ id: 'creationDate', title: 'Creation Date' },
			{ id: 'updateDate', title: 'Update Date' },
		],
	});

	try {
		const page = await browser.newPage();

		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
		);

		console.log(`Testing URL: ${testUrl}`);
		await page.goto(testUrl, {
			waitUntil: 'networkidle2',
			timeout: 30000,
		});

		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Extract property data using the same logic as the main scraper
		const propertyInfo = await page.evaluate((url) => {
			// Initialize data structure
			const data = {
				url,
				priceFrom: '',
				priceTo: '',
				imageUrl: '',
				location: '',
				areaFrom: '',
				areaTo: '',
				description: '',
				agencyName: '',
				contactPhone: '',
				contactEmail: '',
				date: '',
				creationDate: '',
				updateDate: '',
			};

			// Helper function to clean text
			function cleanText(text) {
				if (!text) return '';
				return String(text)
					.replace(/\n/g, ' ')
					.replace(/\r/g, ' ')
					.replace(/\t/g, ' ')
					.replace(/\s+/g, ' ')
					.trim();
			}

			try {
				// First, try to extract range data from page text (for project/residence listings)
				const bodyText = document.body.textContent;

				// Look for "De X € à Y €" pattern for price ranges
				const priceRangeMatch = bodyText.match(
					/De\s+(\d+(?:\s*\d+)*)\s*€\s+à\s+(\d+(?:\s*\d+)*)\s*€/i
				);
				if (priceRangeMatch) {
					data.priceFrom = priceRangeMatch[1].replace(/\s+/g, '');
					data.priceTo = priceRangeMatch[2].replace(/\s+/g, '');
				}

				// Look for "De X à Y m²" pattern for area ranges
				const areaRangeMatch = bodyText.match(
					/De\s+(\d+(?:\s*\d+)*)\s+à\s+(\d+(?:\s*\d+)*)\s*m[²2]/i
				);
				if (areaRangeMatch) {
					data.areaFrom = areaRangeMatch[1].replace(/\s+/g, '');
					data.areaTo = areaRangeMatch[2].replace(/\s+/g, '');
				}

				// Extract structured data from window.AT_HOME_APP
				const appData = window.AT_HOME_APP?.preloadedState?.listing?.listing;

				if (!appData) {
					console.log(
						'No structured data found, but may have extracted range data, falling back to DOM scraping'
					);
					throw new Error('No structured data available');
				}

				// Price information (only if we didn't already get range data)
				if (appData.price && !data.priceFrom) {
					data.priceFrom = String(appData.price);
				}

				// Image URL - get first photo
				if (appData.media?.photos && appData.media.photos.length > 0) {
					data.imageUrl = 'https://static.athome.lu' + appData.media.photos[0];
				}

				// Location - construct from address object
				if (appData.address) {
					const addr = appData.address;
					const locationParts = [];

					// Build address in a logical order
					if (addr.streetNumber) locationParts.push(addr.streetNumber);
					if (addr.street) locationParts.push(addr.street);
					if (addr.city) locationParts.push(addr.city);
					if (addr.zip) locationParts.push(addr.zip);
					if (addr.district) locationParts.push(addr.district);
					if (addr.region) locationParts.push(addr.region);
					if (addr.country) locationParts.push(addr.country);

					data.location = cleanText(locationParts.join(', '));
				}

				// Area/Surface information (only if we didn't already get range data)
				if (appData.characteristic?.surface && !data.areaFrom) {
					data.areaFrom = String(appData.characteristic.surface);
				}

				// Description
				if (appData.description) {
					data.description = cleanText(appData.description);
				}

				// Agency information
				if (appData.contact) {
					data.agencyName = cleanText(appData.contact.name || '');

					// Phone - prefer mobile, fallback to regular phone
					const phone =
						appData.contact.mobilePhone || appData.contact.phone || '';
					data.contactPhone = cleanText(phone);

					// Email
					data.contactEmail = cleanText(appData.contact.email || '');

					// If we have agent info, prefer agent's contact details
					if (appData.contact.agent) {
						if (appData.contact.agent.email) {
							data.contactEmail = cleanText(appData.contact.agent.email);
						}
						if (appData.contact.agent.mobilePhone) {
							data.contactPhone = cleanText(appData.contact.agent.mobilePhone);
						}
					}
				}

				// Creation and update dates
				if (appData.createdAt) {
					data.creationDate = appData.createdAt;
				}
				if (appData.updatedAt) {
					data.updateDate = appData.updatedAt;
				}

				console.log('Successfully extracted structured data');
				return data;
			} catch (error) {
				console.log(
					'Structured data extraction failed, falling back to DOM scraping:',
					error.message
				);
				// DOM scraping fallback would go here...
				return data;
			}
		}, testUrl);

		// Clean all the extracted data
		const cleanedInfo = {
			date: new Date().toISOString(),
			url: propertyInfo.url,
			priceFrom: extractNumeric(propertyInfo.priceFrom),
			priceTo: extractNumeric(propertyInfo.priceTo),
			imageUrl: cleanCsvField(propertyInfo.imageUrl),
			location: cleanCsvField(propertyInfo.location),
			areaFrom: extractNumeric(propertyInfo.areaFrom),
			areaTo: extractNumeric(propertyInfo.areaTo),
			description: cleanCsvField(propertyInfo.description),
			agencyName: cleanCsvField(propertyInfo.agencyName),
			contactPhone: extractPhone(propertyInfo.contactPhone),
			contactEmail: extractEmail(propertyInfo.contactEmail),
			creationDate: cleanCsvField(propertyInfo.creationDate),
			updateDate: cleanCsvField(propertyInfo.updateDate),
		};

		console.log('\nExtracted data:');
		console.log('Price From:', cleanedInfo.priceFrom);
		console.log('Price To:', cleanedInfo.priceTo);
		console.log('Area From:', cleanedInfo.areaFrom);
		console.log('Area To:', cleanedInfo.areaTo);
		console.log('Location:', cleanedInfo.location);
		console.log('Agency:', cleanedInfo.agencyName);

		// Write to CSV
		await csvWriter.writeRecords([cleanedInfo]);
		console.log('\nData written to test-output.csv');
	} catch (error) {
		console.error('Error:', error);
	} finally {
		await browser.close();
	}
}

testSpecificUrl().catch(console.error);
