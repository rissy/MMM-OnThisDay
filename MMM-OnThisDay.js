/* MagicMirror²
 * Module: MMM-OnThisDay
 *
 * By Nikolai Keist (github.com/nkl-kst)
 * MIT Licensed.
 */

const moduleDefinition = {
    defaults: {
        language: null,
        eventsType: 'events',
        eventTitle: null,

        // Intervals
        animationSpeed: 1, // 1 sec.

        // Appearance
        maxEvents: null,
        reverseOrder: false,

        // Carousel
        carousel: false,
        carouselInterval: 30, // 30 sec.
        carouselIntervalWordFactor: 1, // 1 sec. (slow reading)
        carouselProgress: false,

        // Style
        maxWidth: '400px',
        textSize: 'xsmall',
    },

    requiresVersion: '2.1.0', // Required version of MagicMirror

    usedLanguage: 'en',
    title: null,
    events: [],
    eventYears: [],
    hasYears: false,
    carouselIndex: -1,
    eventDisplayDuration: null,
    carouselTimer: null,
    currentDay: null,

    /**
     * Module scripts.
     *
     * @returns {[string]}
     */
    getScripts: function () {
        // prettier-ignore
        return [
            this.file('src/ProgressUpdater.js'),
        ];
    },

    /**
     * Modules styles.
     *
     * @returns {[string]}
     */
    getStyles: function () {
        // prettier-ignore
        return [
            this.file('style/MMM-OnThisDay.css'),
        ];
    },

    getTranslations: function () {
        return {
            en: 'translation/en.json',
            de: 'translation/de.json',
            fr: 'translation/fr.json',
            ar: 'translation/ar.json',
            ru: 'translation/ru.json',
        };
    },

    /**
     * Template.
     *
     * @returns {string} Template name
     */
    getTemplate: function () {
        return 'template/MMM-OnThisDay.njk';
    },

    /**
     * Template data.
     *
     * @returns {{}} Data to render
     */
    getTemplateData: function () {
        return {
            config: this.config,
            identifier: this.identifier,
            events: this.events,
            eventYears: this.eventYears,
            hasYears: this.hasYears,
            carouselIndex: this.carouselIndex,
            eventDisplayDuration: this.eventDisplayDuration,
        };
    },

    getHeader: function () {
        if (this.data.header) return this.data.header;
        if (this.config.eventTitle && this.title) return this.config.eventTitle + ' | ' + this.title;
        return this.title;
    },

    start: function () {
        Log.info('MMM-OnThisDay starting...');

        // Instance-local state — must be initialized here so each instance
        // in a multi-module config gets its own copies, not shared prototype refs.
        this.usedLanguage = this.config.language || config.language;
        this.title = null;
        this.events = [];
        this.eventYears = [];
        this.hasYears = false;
        this.carouselIndex = -1;
        this.eventDisplayDuration = null;
        this.carouselTimer = null;
        this.currentDay = null;

        Log.info(`Using language ${this.usedLanguage}.`);
    },

    notificationReceived: function (notification) {
        // DOM ready
        if (notification === 'MODULE_DOM_CREATED') {
            // Initial events load
            this.loadEvents();
        }
    },

    socketNotificationReceived: function (notification, payload) {
        Log.info(`Received socket notification ${notification}.`);

        // Each instance listens only for its own response, identified by
        // this.identifier (set by MagicMirror² per config entry).
        if (notification === 'EVENTS_LOADED_' + this.identifier) {
            this.handleEventsLoaded(payload);
        }
    },

    loadEvents: function () {
        Log.info('Load events ...');

        const today = new Date().getDate();
        if (!this.currentDay || this.currentDay !== today) {
            // Load events in node helper; include identifier so the helper
            // can route the response back to this specific instance only.
            this.sendSocketNotification('LOAD_EVENTS', {
                lang: this.usedLanguage,
                identifier: this.identifier,
            });
        } else {
            this.scheduleRefresh();
        }
    },

    handleEventsLoaded: function (payload) {
        // No data — fetch failed
        if (!payload) {
            Log.warn('No events available for language ' + this.usedLanguage);
            this.currentDay = null;
            this.scheduleRefresh(60); // Retry in a minute
            return;
        }

        // Extract the event type requested by this instance's config.
        // The 'all' endpoint returns { events, births, deaths, holidays, selected }.
        const rawEvents = payload[this.config.eventsType] || [];

        // No events for this type
        if (rawEvents.length <= 0) {
            Log.warn('No events available for language ' + this.usedLanguage);
            this.currentDay = null;
            this.scheduleRefresh(60); // Retry in a minute
            return;
        }

        // Set current day to prevent frequent reloads
        this.currentDay = new Date().getDate();

        // Set content
        this.title = new Date().toLocaleDateString(this.usedLanguage, {
            day: 'numeric',
            month: 'long',
        });

        // Reverse order for backward compatibility (was previously done in the fetcher)
        this.events = rawEvents.slice().reverse();

        // Apply reverse config option
        if (this.config.reverseOrder) {
            this.events = this.events.reverse();
        }

        // Apply limit
        if (this.config.maxEvents) {
            this.events = this.events.slice(0, this.config.maxEvents);
        }

        // Carousel mode
        if (this.config.carousel) {
            Log.info('Update DOM in carousel model ...');

            // Reset current carousel timer
            if (this.carouselTimer) {
                clearTimeout(this.carouselTimer);
            }

            // Prepare event years
            this.eventYears = this.events.map((event) => event.year || '*');
            this.hasYears = this.eventYears.some((year) => year !== '*');

            this.carouselIndex = -1; // Reset index to start from beginning
            this.updateCarousel();
            this.scheduleRefresh();
            return;
        }

        // Update module
        Log.info('Update DOM with new title and events ...');
        this.updateDom(this.config.animationSpeed * 1000);
        this.scheduleRefresh();
    },

    scheduleRefresh: function (seconds) {
        const delay = seconds !== undefined ? seconds * 1000 : this.getMsUntilMidnight();
        setTimeout(() => {
            this.loadEvents();
        }, delay);
    },

    getMsUntilMidnight: function () {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return midnight - now;
    },

    updateCarousel: function () {
        ++this.carouselIndex;

        // Reset if exceeded
        if (this.carouselIndex >= this.events.length) {
            this.carouselIndex = 0;
        }

        // Determine event duration
        const eventText = this.events[this.carouselIndex].text;
        this.eventDisplayDuration = this.getEventDisplayDuration(eventText);

        const eventEl = document.getElementById('mmm-otd-carousel-event-' + this.identifier);
        const fadeMs = this.config.animationSpeed * 500;

        if (eventEl) {
            // Smooth transition: fade out, swap content, fade in
            eventEl.style.transition = `opacity ${fadeMs}ms ease-in-out`;
            eventEl.style.opacity = '0';

            setTimeout(() => {
                eventEl.textContent = this.capitalizeFirst(eventText);
                this.updateYearList();
                eventEl.style.opacity = '1';
            }, fadeMs);
        } else {
            // First render — build the DOM via template
            this.updateDom(this.config.animationSpeed * 1000);
        }

        // Schedule next update
        this.carouselTimer = setTimeout(() => {
            this.updateCarousel();
        }, this.eventDisplayDuration * 1000);
    },

    capitalizeFirst: function (text) {
        return (text.charAt(0).toUpperCase() + text.slice(1)).trim();
    },

    updateYearList: function () {
        const yearsEl = document.getElementById('mmm-otd-carousel-years-' + this.identifier);
        if (!yearsEl) return;

        const total = this.eventYears.length;
        const current = this.carouselIndex;

        let start = current - 3;
        let end = current + 3;

        if (start < 0) {
            start = 0;
            end = 6;
        }
        if (end >= total) {
            end = total - 1;
            start = total - 7;
        }
        if (start < 0) start = 0;

        yearsEl.innerHTML = '';

        if (start > 0) {
            const dots = document.createElement('li');
            dots.className = 'event-year-dots light';
            dots.textContent = '...';
            yearsEl.appendChild(dots);
        }

        for (let i = start; i <= end; i++) {
            if (this.eventYears[i] === '*') continue;
            const li = document.createElement('li');
            li.className = `event-year ${i === current ? 'bold' : 'light'}`;
            li.textContent = this.eventYears[i];
            yearsEl.appendChild(li);
        }

        if (end < total - 1) {
            const dots = document.createElement('li');
            dots.className = 'event-year-dots light';
            dots.textContent = '...';
            yearsEl.appendChild(dots);
        }
    },

    getEventDisplayDuration(eventText) {
        // Use static value if set
        if (this.config.carouselInterval !== 'auto') {
            return this.config.carouselInterval;
        }

        const words = eventText.match(/\S+/g).length;
        return words * this.config.carouselIntervalWordFactor;
    },
};

// Register module definition
Module.register('MMM-OnThisDay', moduleDefinition);

// Export module definition for tests
/* istanbul ignore else */
if (typeof module !== 'undefined') {
    module.exports = moduleDefinition;
}
