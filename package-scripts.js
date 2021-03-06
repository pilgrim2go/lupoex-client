const {series, crossEnv, concurrent, rimraf} = require('nps-utils');
const {config: {port: E2E_PORT}} = require('./test/protractor.conf');

module.exports = {
    scripts: {
        default: 'nps webpack',
        deps: series(
            'npm install',
            'git submodule update --recursive --force'
        ),
        test: {
            default: 'nps test.jest',
            jest: {
                default: crossEnv('BABEL_TARGET=node jest'),
                watch: crossEnv('BABEL_TARGET=node jest --watch')
            },
            karma: {
                default: series(
                    rimraf('test/karma-coverage'),
                    'karma start test/karma.conf.js'
                ),
                watch: 'karma start test/karma.conf.js --single-run=false',
                debug: 'karma start test/karma.conf.js --single-run=false --debug'
            },
            all: concurrent({
                browser: series.nps('test.karma', 'e2e'),
                jest: 'nps test.jest'
            })
        },
        e2e: {
            default: concurrent({
                webpack: `webpack-dev-server --inline --port=${E2E_PORT}`,
                protractor: 'nps e2e.whenReady'
            }) + ' --kill-others --success first',
            protractor: {
                install: 'webdriver-manager update',
                default: series(
                    'nps e2e.protractor.install',
                    'protractor test/protractor.conf.js'
                ),
                debug: series(
                    'nps e2e.protractor.install',
                    'protractor test/protractor.conf.js --elementExplorer'
                )
            },
            whenReady: series(
                `wait-on --timeout 120000 http-get://localhost:${E2E_PORT}/index.html`,
                'nps e2e.protractor'
            )
        },
        build: 'nps webpack.build',
        webpack: {
            default: 'nps webpack.server',
            build: {
                before: rimraf('dist'),
                default: 'nps webpack.build.production',
                development: {
                    default: series(
                        'nps webpack.build.before',
                        'webpack --progress -d'
                    ),
                    extractCss: series(
                        'nps webpack.build.before',
                        'webpack --progress -d --env.extractCss'
                    ),
                    serve: series.nps(
                        'webpack.build.development',
                        'serve'
                    )
                },
                production: {
                    inlineCss: series(
                        'nps webpack.build.before',
                        crossEnv('NODE_ENV=production webpack --progress -p --env.production')
                    ),
                    default: series(
                        'nps webpack.build.before',
                        crossEnv('NODE_ENV=production webpack --progress -p --env.production --env.extractCss')
                    ),
                    serve: series.nps(
                        'webpack.build.production',
                        'serve'
                    )
                }
            },
            server: {
                default: `webpack-dev-server -d --devtool '#eval' --inline --env.server ${process.env.REMOTE_BACKEND ? '--env.remoteBackend' : ''} ${process.env.PUBLIC_NETWORK ? '--env.publicNetwork' : ''}`,
                extractCss: `webpack-dev-server -d --devtool '#eval' --inline --env.server --env.extractCss ${process.env.REMOTE_BACKEND ? '--env.remoteBackend' : ''} ${process.env.PUBLIC_NETWORK ? '--env.publicNetwork' : ''}`,
                hmr: `webpack-dev-server -d --devtool '#eval' --inline --hot --env.server ${process.env.REMOTE_BACKEND ? '--env.remoteBackend' : ''} ${process.env.PUBLIC_NETWORK ? '--env.publicNetwork' : ''}`
            }
        },
        serve: 'http-server dist --cors'
    }
};
