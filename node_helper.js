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

    start: function (wikimediaApiFetcher, logger) {
        this.wikimediaApiFetcher =
            wikimediaApiFetcher || new WikimediaApiFetcher();
        this.logger = logger || require('logger');
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

        return this.wikimediaApiFetcher.fetch(language);
    },
});
