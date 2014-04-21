(function () {
    /*globals describe:false, it:false*/
    'use strict';

    var expect = require('chai').expect;
    // var npmlog = require('npmlog');

    // var expect = require('chai').expect;

    var Config = require('../../lib/config/config');
    var ConfigError = require('../../lib/config/error');

    describe('Config', function () {
        describe('Configuration loading', function () {
            it('From string', function () {
                var c = new Config('{"server": {}}');
                expect(c).to.be.instanceof(Config);
            });
            it('From buffer', function () {
                var c = new Config(new Buffer('{"server": {}}'));
                expect(c).to.be.instanceof(Config);
            });
            it('From object', function () {
                var c = new Config({"server": {}});
                expect(c).to.be.instanceof(Config);
            });
        });

        describe('Broken...', function () {
            it('... broken json', function () {
                try {
                    var c = new Config('{"server": {}');
                    expect(c).to.not.be.instanceof(Config);
                } catch(e) {
                    expect(e).to.be.instanceof(ConfigError);
                    expect(e.category).to.eql(ConfigError.INVALID_JSON);
                }
            });

            it('... https missing key file', function () {
                try {
                    var c = new Config({
                        https: {
                            key: "whateverbogus",
                            cert: __filename,
                            bind: ["::1"]
                        }
                    });
                    expect(c).to.not.be.instanceof(Config);
                } catch(e) {
                    expect(e).to.be.instanceof(ConfigError);
                    expect(e.category).to.eql(ConfigError.CANT_READ_FILE);
                }
            });

            it('... https missing cert file', function () {
                try {
                    var c = new Config({
                        https: {
                            cert: "whateverbogus",
                            key: __filename,
                            bind: ["::1"]
                        }
                    });
                    expect(c).to.not.be.instanceof(Config);
                } catch(e) {
                    expect(e).to.be.instanceof(ConfigError);
                    expect(e.category).to.eql(ConfigError.CANT_READ_FILE);
                }
            });

            it('... https missing ca file', function () {
                try {
                    var c = new Config({
                        https: {
                            key: __filename,
                            cert: __filename,
                            ca: "whateverbogus",
                            bind: ["::1"]
                        }
                    });
                    expect(c).to.not.be.instanceof(Config);
                } catch(e) {
                    expect(e).to.be.instanceof(ConfigError);
                    expect(e.category).to.eql(ConfigError.CANT_READ_FILE);
                }
            });

            it('... https missing key', function () {
                try {
                    var c = new Config({
                        https: {
                            cert: __filename,
                            bind: ["::1"]
                        }
                    });
                    expect(c).to.not.be.instanceof(Config);
                } catch(e) {
                    expect(e).to.be.instanceof(ConfigError);
                    expect(e.category).to.eql(ConfigError.MISSING_KEY);
                }
            });

            it('... https missing cert', function () {
                try {
                    var c = new Config({
                        https: {
                            key: __filename,
                            bind: ["::1"]
                        }
                    });
                    expect(c).to.not.be.instanceof(Config);
                } catch(e) {
                    expect(e).to.be.instanceof(ConfigError);
                    expect(e.category).to.eql(ConfigError.MISSING_KEY);
                }
            });
        });

        describe('Running as root', function () {
            if (process.getuid() !== 0) {
                it('Not running root test as we are not root...', function () {});
                return;
            }
            it('... forgot to have a user', function () {
                try {
                    var c = new Config({});
                    expect(c).to.not.be.instanceof(Config);
                } catch(e) {
                    expect(e).to.be.instanceof(ConfigError);
                    expect(e.category).to.eql(ConfigError.ROOT_NEEDS_ROOT);
                }
            });
        });
    });

})();
