const puppeteer = require('puppeteer');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
// const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length === 0 || !['rent', 'sale'].includes(args[0])) {
	console.log('Usage: node main.cjs [rent|sale]');
	console.log('  rent - scrape rental properties');
	console.log('  sale - scrape sale properties');
	process.exit(1);
}

const type = args[0] === 'rent' ? 'for-rent' : 'for-sale';
console.log(`Starting scraper for ${type} properties...`);

const maxArea = 1200;
const areaStep = 20;
const outFileName = `athome-${type}.csv`;
const maxPages = 500;

const ids = new Set();

async function readExistingUrls() {
	console.log(`Reading existing URLs from ${outFileName}...`);

	try {
		if (fs.existsSync(outFileName)) {
			const csvContent = fs.readFileSync(outFileName, 'utf-8');
			const lines = csvContent.split('\n');

			// Skip header row and process data rows
			for (let i = 1; i < lines.length; i++) {
				const line = lines[i].trim();
				if (line) {
					// Parse CSV line properly handling quoted fields
					const columns = parseCSVLine(line);
					if (columns.length > 1) {
						const url = columns[1].trim();
						if (url && url !== 'URL') {
							const idMatch = url.match(/\/id-(\d+)\.html$/);
							if (idMatch) {
								ids.add(idMatch[1]);
							}
						}
					}
				}
			}
			console.log(`Found ${ids.size} existing URLs in ${outFileName}`);
		} else {
			console.log(`${outFileName} does not exist, will create new file`);
		}
	} catch (error) {
		console.error('Error reading existing CSV file:', error);
	}
}

function parseCSVLine(line) {
	const fields = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				// Escaped quote
				current += '"';
				i++; // Skip next quote
			} else {
				// Toggle quote state
				inQuotes = !inQuotes;
			}
		} else if (char === ',' && !inQuotes) {
			// Field separator
			fields.push(current);
			current = '';
		} else {
			current += char;
		}
	}

	// Add the last field
	fields.push(current);
	return fields;
}

async function scrapeAtHomeLu() {
	console.log(`Starting scraper for ${outFileName}...`);

	// Read existing URLs to avoid duplicates
	await readExistingUrls();

	const browser = await puppeteer.launch({
		headless: true,
		defaultViewport: { width: 1920, height: 1080 },
	});

	// Check if CSV file exists to determine if we need to write headers
	const csvExists = fs.existsSync(outFileName);

	const csvWriter = createCsvWriter({
		path: outFileName,
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
			{ id: 'fsbo', title: 'FSBO' },
			{ id: 'creationDate', title: 'Creation Date' },
			{ id: 'updateDate', title: 'Update Date' },
			{ id: 'latitude', title: 'Latitude' },
			{ id: 'longitude', title: 'Longitude' },
			{ id: 'sold', title: 'Sold?' },
			{ id: 'type', title: 'Type' },
			{ id: 'charges', title: 'Charges' },
			{ id: 'energyClass', title: 'Energy Class' },
		],
		append: csvExists, // Append to existing file if it exists
		encoding: 'utf8', // Ensure proper encoding
	});

	let totalRecordsWritten = 0;
	let totalPropertyCount = 0;

	try {
		const page = await browser.newPage();

		// Create a second page for property details to avoid navigation conflicts
		const propertyPage = await browser.newPage();

		// Set user agent to avoid being blocked
		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
		);
		await propertyPage.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
		);

		for (let area = 0; area <= maxArea; area += areaStep) {
			for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
				const toArea = area + areaStep - 1;
				const pageUrl = `https://www.athome.lu/${
					type == 'for-sale' ? 'vente' : 'location'
				}/?tr=${
					type == 'for-sale' ? 'buy' : 'rent'
				}&page=${pageNum}&srf_min=${area}&srf_max=${toArea}`;
				console.log(
					`${new Date().toISOString()} : Navigating to page ${pageNum} for area ${area} - ${toArea} m²: ${pageUrl}`
				);

				try {
					await page.goto(pageUrl, {
						waitUntil: 'networkidle2',
						timeout: 30000,
					});

					// Wait for the page to load completely
					await new Promise((resolve) => setTimeout(resolve, 800));

					// Extract all links starting with "/vente/"
					let propertyLinks = await page.evaluate(() => {
						const links = document.querySelectorAll('a');
						return Array.from(links).map((link) => link.href);
					});

					// console.log('unfiltered', propertyLinks);
					propertyLinks = Array.from(propertyLinks).filter((link) => {
						const urlPattern = /\/id-\d+\.html$/;
						return urlPattern.test(link);
					});
					// console.log('filtered', propertyLinks);

					console.log(`Found ${propertyLinks.length} links on page ${pageNum}`);
					// console.log(propertyLinks);
					if (propertyLinks.length === 0) {
						break;
					}

					// for testing:
					// const filteredLinks = [
					// 	// 	'https://www.athome.lu/buy/apartment/bertrange/id-8642548.html', // FSBO
					// 	'https://www.athome.lu/fr/vente/garage-parking/bertrange/id-8519405.html',
					// ];
					const filteredLinks = [];
					// Track unique IDs
					propertyLinks.forEach((link) => {
						const idMatch = link.match(/\/id-(\d+)\.html$/);
						if (idMatch) {
							const id = idMatch[1];
							if (!ids.has(id)) {
								ids.add(id);
								filteredLinks.push(link);
							}
						}
					});

					console.log(
						`Found ${filteredLinks.length} new URLs to scrape on this page`
					);

					// Process each property link immediately
					for (const propertyLink of filteredLinks) {
						totalPropertyCount++;
						console.log(
							`${new Date().toISOString()} : Processing listing ${totalPropertyCount}: ${propertyLink}`
						);

						try {
							await propertyPage.goto(propertyLink, {
								waitUntil: 'networkidle2',
								timeout: 30000,
							});

							// Wait for the page to load completely
							await new Promise((resolve) => setTimeout(resolve, 800));

							// for debugging:
							// page.on('console', (msg) => {
							// 	console.log(`[PAGE CONSOLE]: ${msg.text()}`);
							// });
							// propertyPage.on('console', (msg) => {
							// 	console.log(`[PROPERTY PAGE CONSOLE]: ${msg.text()}`);
							// });

							// Extract property data from structured JSON data
							const propertyInfo = await propertyPage.evaluate((url) => {
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
									fsbo: '',
									date: '',
									creationDate: '',
									updateDate: '',
									latitude: '',
									longitude: '',
									sold: '',
									type: '',
									charges: '',
									energyClass: '',
								};

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
									const appData =
										window.AT_HOME_APP?.preloadedState?.listing?.listing;
									const appDataOld =
										window.AT_HOME_APP?.preloadedState?.listing?.listingOld;

									if (!appData && !appDataOld) {
										console.log(
											'No structured data found, but may have extracted range data, falling back to DOM scraping'
										);
										throw new Error('No structured data available');
									}

									// Price information (only if we didn't already get range data)
									if (appData.price && !data.priceFrom) {
										data.priceFrom = appData.price.toString();
										// For ranges, we'd need to check if there are min/max values
										// but typically athome.lu shows single prices
									}

									// Image URL - get from DOM using the path from screenshot
									const imageElement = document.querySelector('div.square img');
									if (imageElement) {
										data.imageUrl = imageElement.src;
									}

									// Location - construct from address object
									if (appData.address) {
										const addr = appData.address;
										const locationParts = [];
										// Add all available address fields
										if (addr.street) locationParts.push(addr.street);
										if (addr.streetNumber)
											locationParts.push(addr.streetNumber);
										if (addr.city) locationParts.push(addr.city);
										if (addr.zip) locationParts.push(addr.zip);
										if (addr.district) locationParts.push(addr.district);
										if (addr.region) locationParts.push(addr.region);
										if (addr.country) locationParts.push(addr.country);
										if (addr.locality) locationParts.push(addr.locality);
										if (addr.neighborhood)
											locationParts.push(addr.neighborhood);
										if (addr.postalCode) locationParts.push(addr.postalCode);
										if (addr.state) locationParts.push(addr.state);
										if (addr.province) locationParts.push(addr.province);
										if (addr.commune) locationParts.push(addr.commune);
										data.location = locationParts.join(', ');
									}

									// Area/Surface information (only if we didn't already get range data)
									if (appData.characteristic?.surface && !data.areaFrom) {
										data.areaFrom = appData.characteristic.surface.toString();
									}

									// Description
									if (appData.description) {
										data.description = appData.description
											.replace(/\n/g, ' ')
											.trim();
									}

									// Agency information
									if (appData.contact) {
										data.agencyName = appData.contact.name || '';

										// Phone - prefer mobile, fallback to regular phone
										data.contactPhone =
											appData.contact.mobilePhone ||
											appData.contact.phone ||
											'';

										// Email
										data.contactEmail = appData.contact.email || '';

										// If we have agent info, prefer agent's contact details
										if (appData.contact.agent) {
											if (appData.contact.agent.email) {
												data.contactEmail = appData.contact.agent.email;
											}
											if (appData.contact.agent.mobilePhone) {
												data.contactPhone = appData.contact.agent.mobilePhone;
											}
										}
									}

									// FSBO detection - only mark as FSBO if it's actually a private seller
									// Look for private class indicators
									const privateElements = document.querySelectorAll(
										'[class*="private-"]'
									);
									if (privateElements.length > 0) {
										// Found elements with private-* classes, extract the class name
										for (let element of privateElements) {
											const classes = element.className.split(' ');
											for (let className of classes) {
												if (className.startsWith('private-')) {
													data.fsbo = element.innerText.trim();
													break;
												}
											}
											if (data.fsbo) break;
										}
									}

									// Creation and update dates
									if (appData.createdAt) {
										data.creationDate = appData.createdAt;
									}
									if (appData.updatedAt) {
										data.updateDate = appData.updatedAt;
									}

									// Latitude and longitude from search_data.geo.pin (in listingOld)
									if (
										appDataOld &&
										appDataOld.search_data?.geo?.pin?.lat &&
										appDataOld.search_data?.geo?.pin?.lon
									) {
										data.latitude = appDataOld.search_data.geo.pin.lat;
										data.longitude = appDataOld.search_data.geo.pin.lon;
									}

									// Sold status from has_sold (in listingOld.transaction)
									if (
										appDataOld &&
										typeof appDataOld.transaction?.has_sold !== 'undefined'
									) {
										data.sold = appDataOld.transaction.has_sold ? 'Yes' : 'No';
									}

									// Charges from chargesPrice (in listingOld)
									if (
										appDataOld &&
										(appDataOld.chargesPrice || appDataOld.chargesPrice === 0)
									) {
										data.charges = appDataOld.chargesPrice.toString();
									}

									// Energy class from energyClass (in listingOld)
									if (appDataOld && appDataOld.energyClass) {
										data.energyClass = appDataOld.energyClass;
									}

									// Type from useType - may be in GTM data layer or other global variables
									try {
										const gtmDataLayer = window.dataLayer;
										if (gtmDataLayer && Array.isArray(gtmDataLayer)) {
											for (let gtmData of gtmDataLayer) {
												if (gtmData.useType) {
													data.type = gtmData.useType;
													break;
												}
											}
										}
									} catch (e) {
										// Ignore errors accessing dataLayer
									}

									console.log(
										'Successfully extracted structured data. location:',
										data.location
									);
									return data;
								} catch (error) {
									console.log(
										'Structured data extraction failed, falling back to DOM scraping:',
										error.message
									);

									// Fallback to original DOM scraping method
									function getTextContent(selector) {
										return (
											document.querySelector(selector)?.textContent.trim() || ''
										);
									}

									function getAttribute(selector, attr) {
										return (
											document.querySelector(selector)?.getAttribute(attr) || ''
										);
									}

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

									// Price range - try multiple selectors and parse (only if we didn't get range data)
									if (!data.priceFrom) {
										const priceText =
											getTextContent('.property-price') ||
											getTextContent('.price') ||
											getTextContent('[class*="price"]') ||
											getTextContent('.property-details__price');

										if (priceText) {
											const cleanPriceText = priceText
												.replace(/\s+/g, ' ')
												.trim();
											const rangeMatch = cleanPriceText.match(
												/(\d+(?:\s+\d+)*)\s*€.*?(\d+(?:\s+\d+)*)\s*€/
											);
											if (rangeMatch) {
												data.priceFrom = rangeMatch[1].replace(/\s+/g, '');
												data.priceTo = rangeMatch[2].replace(/\s+/g, '');
											} else {
												const singlePriceMatch =
													cleanPriceText.match(/(\d+(?:\s+\d+)*)/);
												if (singlePriceMatch) {
													data.priceFrom = singlePriceMatch[1].replace(
														/\s+/g,
														''
													);
												}
											}
										}
									}

									// Image URL
									data.imageUrl =
										getAttribute('.square img', 'src') ||
										getAttribute('[class*="square"] img', 'src') ||
										getAttribute('.property-image img', 'src') ||
										getAttribute('.gallery img', 'src') ||
										getAttribute('[class*="image"] img', 'src') ||
										getAttribute('img[src*="property"]', 'src');

									// Ensure image URL is properly formatted
									if (data.imageUrl && !data.imageUrl.startsWith('http')) {
										data.imageUrl =
											'https://i1.static.al.athome.lu' + data.imageUrl;
									}

									// Location
									const locationText =
										getTextContent('.property-location') ||
										getTextContent('.location') ||
										getTextContent('[class*="location"]') ||
										getTextContent('.property-address');

									if (locationText) {
										data.location = locationText.replace(/^à\s*/i, '').trim();
									}

									// Square meters (only if we didn't get range data)
									if (!data.areaFrom) {
										const surfaceText =
											getTextContent('[class*="surface"]') ||
											getTextContent('[class*="area"]') ||
											getTextContent('.property-surface') ||
											document.body.textContent.match(
												/(\d+(?:\s+\d+)*)\s*m[²2]/
											)?.[0] ||
											'';

										if (surfaceText) {
											const cleanSurfaceText = surfaceText
												.replace(/\s+/g, ' ')
												.trim();
											const areaRangeMatch = cleanSurfaceText.match(
												/(\d+(?:\s+\d+)*)\s*m[²2].*?(\d+(?:\s+\d+)*)\s*m[²2]/
											);
											if (areaRangeMatch) {
												data.areaFrom = areaRangeMatch[1].replace(/\s+/g, '');
												data.areaTo = areaRangeMatch[2].replace(/\s+/g, '');
											} else {
												const singleAreaMatch = cleanSurfaceText.match(
													/(\d+(?:\s+\d+)*)\s*m[²2]/
												);
												if (singleAreaMatch) {
													data.areaFrom = singleAreaMatch[1].replace(
														/\s+/g,
														''
													);
												}
											}
										}
									}

									// Description
									data.description =
										getTextContent('.property-description') ||
										getTextContent('.description') ||
										getTextContent('[class*="description"]') ||
										getTextContent('.property-details__description');

									// Agency name
									data.agencyName = getTextContent('.agency-details__name');

									// Contact phone
									data.contactPhone =
										getTextContent('[class*="phone"]') ||
										getTextContent('[href^="tel:"]') ||
										getTextContent('.contact-phone') ||
										document.body.textContent.match(
											/(\+?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,3})/
										)?.[0] ||
										'';

									// Contact email - try specific selectors first
									data.contactEmail =
										getAttribute('a[href^="mailto:"]', 'href')?.replace(
											'mailto:',
											''
										) ||
										getTextContent('a[href^="mailto:"]') ||
										getTextContent('[class*="email"]') ||
										getTextContent('.contact-email') ||
										getTextContent('.agency-email') ||
										(() => {
											const emailMatches = document.body.textContent.match(
												/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
											);
											return emailMatches ? emailMatches[0] : '';
										})() ||
										'';

									// Clean up email
									if (data.contactEmail) {
										const emailMatch = data.contactEmail.match(
											/^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
										);
										if (emailMatch) {
											data.contactEmail = emailMatch[1];
										}
									}

									// FSBO detection for fallback method - only mark as FSBO if it's actually a private seller

									const privateElements = document.querySelectorAll(
										'[class*="private-"]'
									);
									if (privateElements.length > 0) {
										// Found elements with private-* classes, extract the class name
										for (let element of privateElements) {
											const classes = element.className.split(' ');
											for (let className of classes) {
												if (className.startsWith('private-')) {
													data.fsbo = element.innerText.trim();
													break;
												}
											}
											if (data.fsbo) break;
										}

										// // Only check for "Particulier" in specific seller context, not in descriptions
										// if (!data.fsbo) {
										// 	// Look for "Particulier" specifically in seller/contact sections
										// 	const sellerSections = document.querySelectorAll(
										// 		'[class*="seller"], [class*="contact"], [class*="agency"], [class*="author"], [id*="contact"], [id*="seller"]'
										// 	);

										// 	for (let section of sellerSections) {
										// 		const sectionText = section.textContent;
										// 		if (
										// 			sectionText.includes('Particulier') ||
										// 			sectionText.includes('particulier')
										// 		) {
										// 			// Make sure it's actually indicating private seller, not just containing the word
										// 			if (
										// 				sectionText
										// 					.toLowerCase()
										// 					.includes('vendu par particulier') ||
										// 				sectionText
										// 					.toLowerCase()
										// 					.includes('vendeur particulier') ||
										// 				sectionText
										// 					.toLowerCase()
										// 					.includes('annonce particulier') ||
										// 				(sectionText
										// 					.toLowerCase()
										// 					.includes('particulier') &&
										// 					sectionText.toLowerCase().includes('contact'))
										// 			) {
										// 				data.fsbo = 'particulier';
										// 				break;
										// 			}
										// 		}
										// 	}
										// }
									}

									// Extract coordinates, sold status, and type in fallback mode
									// These fields are primarily available in structured data, but let's try to extract them here too

									// Try to extract latitude and longitude from any data-* attributes or global variables
									try {
										// Look for coordinates in the global AT_HOME_APP if available
										const athomeApp = window.AT_HOME_APP;
										if (
											athomeApp?.preloadedState?.listing?.listingOld
												?.search_data?.geo?.pin
										) {
											const pin =
												athomeApp.preloadedState.listing.listingOld.search_data
													.geo.pin;
											if (pin.lat) data.latitude = pin.lat;
											if (pin.lon) data.longitude = pin.lon;
										}

										// Try to get sold status (in listingOld.transaction)
										if (
											athomeApp?.preloadedState?.listing?.listingOld
												?.transaction?.has_sold !== undefined
										) {
											data.sold = athomeApp.preloadedState.listing.listingOld
												.transaction.has_sold
												? 'Yes'
												: 'No';
										}

										// Try to get charges from chargesPrice (in listingOld)
										if (
											athomeApp?.preloadedState?.listing?.listingOld
												?.chargesPrice !== undefined
										) {
											data.charges =
												athomeApp.preloadedState.listing.listingOld.chargesPrice.toString();
										}

										// Try to get energy class from energyClass (in listingOld)
										if (
											athomeApp?.preloadedState?.listing?.listingOld
												?.energyClass
										) {
											data.energyClass =
												athomeApp.preloadedState.listing.listingOld.energyClass;
										}
									} catch (e) {
										// Ignore errors accessing global variables
									}

									// Try to extract type from GTM data layer
									try {
										const gtmDataLayer = window.dataLayer;
										if (gtmDataLayer && Array.isArray(gtmDataLayer)) {
											for (let gtmData of gtmDataLayer) {
												if (gtmData.useType) {
													data.type = gtmData.useType;
													break;
												}
											}
										}
									} catch (e) {
										// Ignore errors accessing dataLayer
									}

									// Clean up the data
									Object.keys(data).forEach((key) => {
										if (typeof data[key] === 'string') {
											data[key] = data[key].replace(/\s+/g, ' ').trim();
										}
									});

									return data;
								}
							}, propertyLink);

							// Add current timestamp and clean data before writing
							propertyInfo.date = new Date().toISOString();

							// Clean up the data to prevent CSV issues
							Object.keys(propertyInfo).forEach((key) => {
								if (typeof propertyInfo[key] === 'string') {
									// Remove line breaks, excessive whitespace, and clean up quotes
									propertyInfo[key] = propertyInfo[key]
										.replace(/\r?\n/g, ' ')
										.replace(/\s+/g, ' ')
										.replace(/"/g, '""') // Escape quotes properly for CSV
										.trim();
								}
							});

							// Write this property's data immediately to CSV
							await csvWriter.writeRecords([propertyInfo]);
							totalRecordsWritten++;

							// Small delay to be respectful to the server
							await new Promise((resolve) => setTimeout(resolve, 400));
						} catch (error) {
							console.error(
								`Error processing property ${propertyLink}:`,
								error
							);
							// Add empty record to maintain count
							const errorRecord = {
								date: new Date().toISOString(),
								url: propertyLink,
								priceFrom: 'ERROR',
								priceTo: '',
								imageUrl: '',
								location: '',
								areaFrom: '',
								areaTo: '',
								description: '',
								agencyName: '',
								contactPhone: '',
								contactEmail: '',
								fsbo: '',
								creationDate: '',
								updateDate: '',
								latitude: '',
								longitude: '',
								sold: '',
								type: '',
								charges: '',
								energyClass: '',
							};

							// Write error record immediately to CSV
							await csvWriter.writeRecords([errorRecord]);
							totalRecordsWritten++;

							console.log(
								`Error record written for property ${totalPropertyCount} (${totalRecordsWritten} total records written)`
							);
							continue; // Continue with next property if this one fails
						}
					}
				} catch (error) {
					console.error(`Error on page ${pageNum} for area ${area}m²:`, error);
					continue; // Continue with next page if this one fails
				}
			}
		}

		console.log(
			`Scraping completed! Processed ${totalPropertyCount} properties and wrote ${totalRecordsWritten} records to ${outFileName}`
		);
	} catch (error) {
		console.error('Error occurred:', error);
	} finally {
		await browser.close();
		// console.log('Browser closed.');
	}
}

// Run the scraper
scrapeAtHomeLu().catch(console.error);
