'use strict';

const { expect } = require('chai');
const { describe, it } = require('mocha');
const PaperlessCommunication = require('./paperlessCommunication');

function createCommunication(config) {
    return new PaperlessCommunication({
        config,
    });
}

describe('Paperless URL handling', () => {
    it('keeps legacy configurations on HTTP', () => {
        const communication = createCommunication({ ipUrl: '192.168.1.20', port: 8000 });

        expect(communication.address).to.equal('http://192.168.1.20:8000');
    });

    it('supports HTTPS selected for a legacy host and port configuration', () => {
        const communication = createCommunication({ ipUrl: 'paperless.local', protocol: 'https', port: 443 });

        expect(communication.address).to.equal('https://paperless.local');
    });

    it('uses a complete URL instead of the separate protocol and port settings', () => {
        const communication = createCommunication({
            ipUrl: 'https://paperless.example.com:8443/paperless/',
            protocol: 'http',
            port: 8000,
        });

        expect(communication.address).to.equal('https://paperless.example.com:8443/paperless');
    });

    it('keeps pagination on the configured HTTPS reverse proxy', () => {
        const communication = createCommunication({
            ipUrl: 'https://paperless.example.com/paperless',
            port: 8000,
        });

        expect(communication.resolvePaginationUrl('http://paperless:8000/api/tags/?page=2')).to.equal(
            'https://paperless.example.com/paperless/api/tags/?page=2',
        );
    });
});
