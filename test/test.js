const puppeteer = require('puppeteer');
(async () => {
	const browser = await puppeteer.launch({ headless: false });
	const page = await browser.newPage();
	await page.goto(
		'https://www.athome.lu/vente/appartement/luxembourg-kirchberg/residence-place-de-l-europe/id-6606073',
		{ waitUntil: 'networkidle2' }
	);

	const html = await page.evaluate(() => {
		// Get price section
		const priceSection =
			document.querySelector('.property-price') ||
			document.querySelector('.price') ||
			document.querySelector('[class*="price"]');
		console.log(
			'Price section HTML:',
			priceSection ? priceSection.outerHTML : 'Not found'
		);

		// Get image section
		const squareDiv = document.querySelector('.square');
		console.log(
			'Square div HTML:',
			squareDiv ? squareDiv.outerHTML : 'Not found'
		);

		// Get all images
		const images = document.querySelectorAll('img');
		console.log('All images count:', images.length);
		images.forEach((img, i) => {
			console.log('Image ' + i + ':', img.src, img.className);
		});

		return 'Done';
	});

	await new Promise((resolve) => setTimeout(resolve, 5000));
	await browser.close();
})();
