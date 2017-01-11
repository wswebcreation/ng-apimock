import {Mock} from "../tasks/mock";
import * as http from "http";
import {Registry} from "./registry";
import {httpMethods} from "./http";
import {ProtractorUpdateMockHandler} from "./api/mocks/ProtractorUpdateMockHandler";
import {RuntimeUpdateMockHandler} from "./api/mocks/RuntimeUpdateMockHandler";
import {ProtractorGetMocksHandler} from "./api/mocks/ProtractorGetMocksHandler";
import {RuntimeGetMocksHandler} from "./api/mocks/RuntimeGetMocksHandler";
import {RuntimeResetMocksToDefaultsHandler} from "./api/mocks/runtimeResetMocksToDefaultsHandler";
import {ProtractorResetMocksToDefaultsHandler} from "./api/mocks/protractorResetMocksToDefaultsHandler";
import {ProtractorSetMocksToPassThroughsHandler} from "./api/mocks/protractorSetMocksToPassThroughsHandler";
import {RuntimeSetMocksToPassThroughsHandler} from "./api/mocks/runtimeSetMocksToPassThroughsHandler";
import {RuntimeRecordResponseHandler} from "./api/mocks/runtimeRecordResponseHandler";
import {ProtractorRecordResponseHandler} from "./api/mocks/protractorRecordResponseHandler";
import {ProtractorAddOrUpdateVariableHandler} from "./api/variables/protractorAddOrUpdateVariableHandler";
import {RuntimeAddOrUpdateVariableHandler} from "./api/variables/runtimeAddOrUpdateVariableHandler";
import {RuntimeGetVariablesHandler} from "./api/variables/runtimeGetVariablesHandler";
import {ProtractorGetVariablesHandler} from "./api/variables/protractorGetVariablesHandler";
import {RuntimeDeleteVariableHandler} from "./api/variables/runtimeDeleteVariableHandler";
import {ProtractorDeleteVariableHandler} from "./api/variables/protractorDeleteVariableHandler";
import {RuntimeNgApimockHandler} from "./runtimeNgApimockHandler";
import {ProtractorNgApimockHandler} from "./protractorNgApimockHandler";

(function () {
    "use strict";

    (module).exports = {
        ngApimockRequest: ngApimockRequest,
        registerMocks: registerMocks
    };

    const registry: Registry = new Registry(),
        handlers = {
            protractor: {
                updateMockHandler: new ProtractorUpdateMockHandler(),
                getMocksHandler: new ProtractorGetMocksHandler(),
                resetMocksToDefaultsHandler: new ProtractorResetMocksToDefaultsHandler(),
                setMocksToPassThroughsHandler: new ProtractorSetMocksToPassThroughsHandler(),
                recordResponseHandler: new ProtractorRecordResponseHandler(),
                addOrUpdateVariableHandler: new ProtractorAddOrUpdateVariableHandler(),
                getVariablesHandler: new ProtractorGetVariablesHandler(),
                deleteVariableHandler: new ProtractorDeleteVariableHandler(),
                ngApimockHandler: new ProtractorNgApimockHandler()
            },
            runtime: {
                updateMockHandler: new RuntimeUpdateMockHandler(),
                getMocksHandler: new RuntimeGetMocksHandler(),
                resetMocksToDefaultsHandler: new RuntimeResetMocksToDefaultsHandler(),
                setMocksToPassThroughsHandler: new RuntimeSetMocksToPassThroughsHandler(),
                recordResponseHandler: new RuntimeRecordResponseHandler(),
                addOrUpdateVariableHandler: new RuntimeAddOrUpdateVariableHandler(),
                getVariablesHandler: new RuntimeGetVariablesHandler(),
                deleteVariableHandler: new RuntimeDeleteVariableHandler(),
                ngApimockHandler: new RuntimeNgApimockHandler()
            }
        };

    /**
     * The connect middleware for handeling the mocking
     * @param request The http request.
     * @param response The http response.
     * @param next The next middleware.
     */
    function ngApimockRequest(request: http.IncomingMessage, response: http.ServerResponse, next: Function): void {
        const ngapimockId = _ngApimockId(request.headers),
            type = ngapimockId !== undefined ? 'protractor' : 'runtime';

        console.log(request.url + ' - ' + type + ' - ' + ngapimockId);

        if (request.url === '/ngapimock/mocks/record' && request.method === httpMethods.PUT) {
            handlers[type].recordResponseHandler.handleRequest(request, response, next, registry, ngapimockId);
        } else if (request.url === '/ngapimock/mocks' && request.method === httpMethods.GET) {
            handlers[type].getMocksHandler.handleRequest(request, response, next, registry, ngapimockId);
        } else if (request.url === '/ngapimock/mocks' && request.method === httpMethods.PUT) {
            handlers[type].updateMockHandler.handleRequest(request, response, next, registry, ngapimockId);
        } else if (request.url === '/ngapimock/mocks/defaults' && request.method === httpMethods.PUT) {
            handlers[type].resetMocksToDefaultsHandler.handleRequest(request, response, next, registry, ngapimockId);
        } else if (request.url === '/ngapimock/mocks/passthroughs' && request.method === httpMethods.PUT) {
            handlers[type].setMocksToPassThroughsHandler.handleRequest(request, response, next, registry, ngapimockId);
        } else if (request.url === '/ngapimock/variables' && request.method === httpMethods.GET) {
            handlers[type].getVariablesHandler.handleRequest(request, response, next, registry, ngapimockId);
        } else if (request.url === '/ngapimock/variables' && request.method === httpMethods.PUT) {
            handlers[type].addOrUpdateVariableHandler.handleRequest(request, response, next, registry, ngapimockId);
        } else if (new RegExp('/ngapimock/variables/.*').exec(request.url) !== null && request.method === httpMethods.DELETE) {
            handlers[type].deleteVariableHandler.handleRequest(request, response, next, registry, ngapimockId);
        } else {
            handlers[type].ngApimockHandler.handleRequest(request, response, next, registry, ngapimockId);
        }
    }

    function registerMocks(mocks: Mock[]) {
        mocks.forEach(mock => {
            mock.identifier = (mock.name ? mock.name : mock.expression.toString() + '$$' + mock.method);

            // #1
            const match = registry.mocks.filter(_mock => mock.identifier === _mock.identifier)[0],
                index = registry.mocks.indexOf(match);

            if (index > -1) { // exists so update
                registry.mocks[index] = mock;
            } else { // add
                registry.mocks.push(mock);
            }

            const _default = Object.keys(mock.responses).find(key => !!mock.responses[key]['default']);
            if (_default !== undefined) {
                registry.defaults[mock.identifier] = _default;
                registry.selections[mock.identifier] = _default;
            }
        });
    }

    /**
     * Get the ngApimockId.
     * @param headers The request headers.
     * @returns {*}
     */
    function _ngApimockId(headers: any) {
        let ngApimockId;
        const header = headers.ngapimockid,
            cookie = _getNgApimockIdCookie(headers.cookie);

        if (header !== undefined) {
            ngApimockId = header;
        } else if (cookie !== undefined) {
            ngApimockId = cookie;
        }
        return ngApimockId;
    }

    /**
     * Get the ngApimockId from the given cookies.
     * @param cookies The cookies.
     * @returns {*}
     */
    function _getNgApimockIdCookie(cookies: string) {
        return cookies && cookies
                .split(';')
                .map(cookie => {
                    let parts = cookie.split('=');
                    return {
                        key: parts.shift().trim(),
                        value: decodeURI(parts.join('='))
                    };
                })
                .filter(cookie => cookie.key === 'ngapimockid')
                .map(cookie => cookie.value)[0];
    }
})();