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
            // Load data
            const events = await this.loadEvents(payload.lang, payload.eventsType);

            // Route the response back to the requesting instance only.
            this.sendSocketNotification('EVENTS_LOADED_' + payload.identifier, events);
        }
    },

    loadEvents: async function (language, eventsType) {
        this.logger.log('Load events ...');

        return this.wikimediaApiFetcher.fetch(language, eventsType);
    },
});
