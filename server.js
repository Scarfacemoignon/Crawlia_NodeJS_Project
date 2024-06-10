const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const pdfkit = require('pdfkit'); // Pour générer des PDF
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());

app.post('/performance-test', async (req, res) => {
    const { url } = req.body;

    try {
        const start = Date.now();
        const response = await axios.get(url);
        const ttfb = Date.now() - start;

        const $ = cheerio.load(response.data);

        // Vérification des balises de réseaux sociaux
        const socialMediaTags = $('meta[property^="og:"], meta[name^="twitter:"]').length > 0 ? 'Present' : 'Missing';

        // Vérification des balises alt manquantes
        const images = $('img');
        const missingAlts = [];
        images.each((i, img) => {
            if (!$(img).attr('alt')) {
                missingAlts.push($(img).attr('src'));
            }
        });

        // Vérification des liens morts
        const links = $('a');
        const deadLinks = [];
        const linkPromises = [];
        links.each((i, link) => {
            const href = $(link).attr('href');
            if (href && href.startsWith('http')) {
                linkPromises.push(axios.get(href).catch(() => deadLinks.push(href)));
            }
        });

        await Promise.all(linkPromises);

        res.json({
            ttfb,
            seoIssues: [
                $('meta[name="description"]').length === 0 ? 'Missing meta description' : '',
                $('h1').length === 0 ? 'Missing h1' : '',
                $('h2').length === 0 ? 'Missing h2' : ''
            ].filter(Boolean),
            deadLinks,
            socialMediaTags,
            missingAlts
        });
    } catch (error) {
        res.json({ error: error.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
