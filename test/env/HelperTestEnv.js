/* MagicMirror²
 * Module: MMM-OnThisDay
 *
 * By Nikolai Keist (github.com/nkl-kst)
 * MIT Licensed.
 */

const proxyquire = require('proxyquire').noCallThru();
const sinon = require('sinon');

// Mock helper creation
const NodeHelperFake = {
    create: function (helperDefinition) {
        return helperDefinition;
    },
};

const wikimediaApiFetcherMock = {
    fetch: (language) => {
        return Promise.resolve({
            events: [{ text: `test events for ${language}` }],
            births: [],
            deaths: [],
            holidays: [],
            selected: [],
        });
    },
};

const loggerMock = {
    log: function () {},
};

// Load helper definition
const nodeHelperDefinition = proxyquire('../../node_helper', {
    node_helper: NodeHelperFake,
});

module.exports = function () {
    const nodeHelper = Object.assign({}, nodeHelperDefinition);

    nodeHelper.start(wikimediaApiFetcherMock, loggerMock);

    // Fake inherited methods
    nodeHelper.sendSocketNotification = sinon.fake();

    return nodeHelper;
};
