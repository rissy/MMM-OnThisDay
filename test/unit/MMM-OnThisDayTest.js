/* MagicMirror²
 * Module: MMM-OnThisDay
 *
 * By Nikolai Keist (github.com/nkl-kst)
 * MIT Licensed.
 */

const assert = require('assert');
const sinon = require('sinon');
const newModule = require('../env/ModuleTestEnv');

describe('MMM-OnThisDay', () => {
    // Tested
    let module;

    // Fake clock (don't run setTimeout calls)
    let clock;

    beforeEach(() => {
        // Create module
        module = newModule();

        // Fake clock
        clock = sinon.useFakeTimers(0);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('getScripts', () => {
        it('should return an array', () => {
            // Act
            const scripts = module.getScripts();

            // Assert
            assert.ok(Array.isArray(scripts));
        });
    });

    describe('getStyles', () => {
        it('should return an array', () => {
            // Act
            const styles = module.getStyles();

            // Assert
            assert.ok(Array.isArray(styles));
        });
    });

    describe('getTranslations', () => {
        it('should return an object', () => {
            // Act
            const translations = module.getTranslations();

            // Assert
            assert.deepStrictEqual(translations, Object(translations));
        });
    });

    describe('getTemplate', () => {
        it('should return a string', () => {
            // Act
            const template = module.getTemplate();

            // Assert
            assert.strictEqual(typeof template, 'string');
        });
    });

    describe('getTemplateData', () => {
        it('should return an object', () => {
            // Act
            const templateData = module.getTemplateData();

            // Assert
            assert.deepStrictEqual(templateData, Object(templateData));
        });
    });

    describe('getHeader', () => {
        it('should return user header if set', () => {
            // Arrange
            module.data.header = 'User header';

            // Act
            const header = module.getHeader();

            // Assert
            assert.strictEqual(header, 'User header');
        });

        it('should return module title if user header is unset', () => {
            // Arrange
            module.title = 'Module title';

            // Act
            const header = module.getHeader();

            // Assert
            assert.strictEqual(header, 'Module title');
        });

        it('should prepend eventTitle to module title', () => {
            // Arrange
            module.config.eventTitle = 'My Mirror';
            module.title = 'January 1';

            // Act
            const header = module.getHeader();

            // Assert
            assert.strictEqual(header, 'My Mirror | January 1');
        });

        it('should not prepend eventTitle when user header is set', () => {
            // Arrange
            module.config.eventTitle = 'My Mirror';
            module.data.header = 'User header';

            // Act
            const header = module.getHeader();

            // Assert
            assert.strictEqual(header, 'User header');
        });
    });

    describe('start', () => {
        it('should set user language', () => {
            // Arrange
            config.language = 'de';

            // Act
            module.start();

            // Assert
            assert.strictEqual(module.usedLanguage, 'de');
        });
    });

    describe('notificationReceived', () => {
        it('should do nothing on unknown notification', () => {
            // Arrange
            module.loadEvents = sinon.spy();

            // Act
            module.notificationReceived('UNKNOWN_NOTIFICATION');

            // Assert
            assert.ok(module.loadEvents.notCalled);
        });

        it('should load events on dom creation', () => {
            // Arrange
            module.loadEvents = sinon.spy();

            // Act
            module.notificationReceived('MODULE_DOM_CREATED');

            // Assert
            assert.ok(module.loadEvents.calledOnce);
        });
    });

    describe('socketNotificationReceived', () => {
        it('should do nothing on unknown notifications', () => {
            // Arrange
            const payload = [
                {
                    text: 'Should not appear',
                },
            ];

            // Act
            module.socketNotificationReceived('UNKNOWN_NOTIFICATION', payload);

            // Assert
            assert.strictEqual(module.title, null);
            assert.strictEqual(module.events.length, 0);
        });

        it('should do nothing if fetch failed', () => {
            // Act
            module.socketNotificationReceived('EVENTS_LOADED_' + module.identifier, null);

            // Assert
            assert.strictEqual(module.events.length, 0);
        });

        it('should do nothing if no events for the configured type', () => {
            // Arrange
            const payload = { events: [], births: [], deaths: [], holidays: [], selected: [] };

            // Act
            module.socketNotificationReceived('EVENTS_LOADED_' + module.identifier, payload);

            // Assert
            assert.strictEqual(module.events.length, 0);
        });

        it('should set title and events', () => {
            // Arrange
            const payload = { events: [{ text: 'Test event' }], births: [], deaths: [], holidays: [], selected: [] };

            // Act
            module.socketNotificationReceived('EVENTS_LOADED_' + module.identifier, payload);

            // Assert
            assert.strictEqual(module.title, 'January 1');
            assert.strictEqual(module.events.length, 1);
            assert.strictEqual(module.events[0].text, 'Test event');
        });
    });

    describe('loadEvents', () => {
        it('should send socket notification', () => {
            // Act
            module.loadEvents();

            // Assert
            module.sendSocketNotification.calledWith('LOAD_EVENTS', 'en');
        });

        it('should schedule refresh when day has not changed', () => {
            // Arrange
            module.currentDay = new Date().getDate();
            module.scheduleRefresh = sinon.spy();

            // Act
            module.loadEvents();

            // Assert
            assert.ok(module.scheduleRefresh.calledOnce);
        });
    });

    describe('scheduleRefresh', () => {
        it('should not load events before midnight', () => {
            // Arrange
            module.getMsUntilMidnight = () => 1000;
            module.loadEvents = sinon.spy();

            // Act
            module.scheduleRefresh();
            clock.tick(999);

            // Assert
            assert.ok(module.loadEvents.notCalled);
        });

        it('should load events at midnight', () => {
            // Arrange
            module.getMsUntilMidnight = () => 1000;
            module.loadEvents = sinon.spy();

            // Act
            module.scheduleRefresh();
            clock.tick(1000);

            // Assert
            assert.ok(module.loadEvents.calledOnce);
        });

        it('should load events after given seconds', () => {
            // Arrange
            module.loadEvents = sinon.spy();

            // Act
            module.scheduleRefresh(1);
            clock.tick(999);
            assert.ok(module.loadEvents.notCalled);
            clock.tick(1);

            // Assert
            assert.ok(module.loadEvents.calledOnce);
        });
    });
});
