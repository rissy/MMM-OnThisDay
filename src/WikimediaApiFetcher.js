module.exports = class {
    async fetch(language) {
        // Wikimedia API requires a 2-letter language code in most cases,
        // and MagicMirror's config.language can be 'en-US'
        const lang = language ? language.split('-')[0] : 'en';

        // Build URI — always fetch 'all' so callers can pick any event type
        // from the single response without extra requests
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const uri = `https://api.wikimedia.org/feed/v1/wikipedia/${lang}/onthisday/all/${month}/${day}`;

        try {
            // Fetch data with User-Agent header (required by Wikimedia API)
            const response = await fetch(uri, {
                headers: {
                    'User-Agent': 'MMM-OnThisDay MagicMirror Module (https://github.com/nkl-kst/MMM-OnThisDay)',
                },
            });

            // Check response
            if (!response.ok) {
                console.error(`MMM-OnThisDay: API request failed with status ${response.status} ${response.statusText}`);
                return null;
            }

            return await response.json();
        } catch (error) {
            console.error('MMM-OnThisDay: Error fetching events:', error);
            return null;
        }
    }
};
