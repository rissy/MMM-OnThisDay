/* MagicMirror²
 * Module: MMM-OnThisDay
 *
 * By Nikolai Keist (github.com/nkl-kst)
 * MIT Licensed.
 */

const assert = require('assert');
const sinon = require('sinon');
const newNodeHelper = require('../env/HelperTestEnv');

describe('node_helper', () => {
    // Tested
    let helper;

    beforeEach(() => {
        // Create helper
        helper = newNodeHelper();
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('socketNotificationReceived', () => {
        it('should do nothing on unknown notification', async () => {
            // Act
            await helper.socketNotificationReceived('UNKNOWN_NOTIFICATION');

            // Assert
            assert.ok(helper.sendSocketNotification.notCalled);
        });

        it('should send socket notification with title and events on LOAD_EVENTS notification', async () => {
            // Act
            await helper.socketNotificationReceived('LOAD_EVENTS', {
                lang: 'en',
                identifier: 'MMM-OnThisDay_test',
            });

            // Assert
            assert.ok(helper.sendSocketNotification.calledOnce);
            assert.ok(
                helper.sendSocketNotification.calledWith('EVENTS_LOADED_MMM-OnThisDay_test', {
                    events: [{ text: 'test events for en' }],
                    births: [],
                    deaths: [],
                    holidays: [],
                    selected: [],
                }),
            );
        });
    });

    describe('loadEvents', () => {
        it('should return full all-events response object', async () => {
            // Act
            const data = await helper.loadEvents('en');

            // Assert
            assert.deepStrictEqual(data, {
                events: [{ text: 'test events for en' }],
                births: [],
                deaths: [],
                holidays: [],
                selected: [],
            });
        });

        it('should return cached data on second call without fetching again', async () => {
            // Arrange
            const fetchSpy = sinon.spy(helper.wikimediaApiFetcher, 'fetch');

            // Act
            await helper.loadEvents('en');
            await helper.loadEvents('en');

            // Assert — fetcher called only once despite two loadEvents calls
            assert.ok(fetchSpy.calledOnce);
        });

        it('should share a single in-flight fetch for concurrent requests', async () => {
            // Arrange
            const fetchSpy = sinon.spy(helper.wikimediaApiFetcher, 'fetch');

            // Act — fire two calls without awaiting in between
            const [a, b] = await Promise.all([helper.loadEvents('en'), helper.loadEvents('en')]);

            // Assert — one fetch, both callers get the same data
            assert.ok(fetchSpy.calledOnce);
            assert.deepStrictEqual(a, b);
        });
    });
});
