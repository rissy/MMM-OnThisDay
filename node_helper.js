/* MagicMirror²
 * Module: MMM-OnThisDay
 *
 * By Nikolai Keist (github.com/nkl-kst)
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');

const WikimediaApiFetcher = require('./src/WikimediaApiFetcher');

module.exports = NodeHelper.create({
    wikimediaApiFetcher: null,

    // Cache per language: Map<lang, { date: string, data: object }>
    cache: null,

    // In-flight fetches per language to deduplicate concurrent requests
    pendingFetches: null,

    start: function (wikimediaApiFetcher, logger) {
        this.wikimediaApiFetcher =
            wikimediaApiFetcher || new WikimediaApiFetcher();
        this.logger = logger || require('logger');
        this.cache = new Map();
        this.pendingFetches = new Map();
    },

    socketNotificationReceived: async function (notification, payload) {
        this.logger.log(`Received socket notification ${notification}.`);

        if (notification === 'LOAD_EVENTS') {
            // Load data — eventsType filtering is done on the frontend
            const data = await this.loadEvents(payload.lang);

            // Route the response back to the requesting instance only.
            this.sendSocketNotification('EVENTS_LOADED_' + payload.identifier, data);
        }
    },

    loadEvents: async function (language) {
        this.logger.log('Load events ...');

        const today = new Date().toDateString();
        const cached = this.cache.get(language);

        if (cached && cached.date === today) {
            this.logger.log('Returning cached events for ' + language);
            return cached.data;
        }

        // If a fetch for this language is already in flight, share it
        if (this.pendingFetches.has(language)) {
            this.logger.log('Waiting for pending fetch for ' + language);
            return this.pendingFetches.get(language);
        }

        const promise = this.wikimediaApiFetcher.fetch(language).then((data) => {
            this.pendingFetches.delete(language);
            if (data) {
                this.cache.set(language, { date: today, data });
            }
            return data;
        });

        this.pendingFetches.set(language, promise);
        return promise;
    },
});
