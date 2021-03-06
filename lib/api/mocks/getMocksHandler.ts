import * as http from "http";
import {Handler} from "../../handler";
import {Registry} from "../../registry";
import {httpHeaders} from "../../http";

/** Abstract Handler for Getting the mocks. */
export abstract class GetMocksHandler implements Handler {

    /**
     * Gets the selections.
     * @param registry The registry.
     * @param ngApimockId The ngApimock id.
     * @return selections The selections.
     */
    abstract getSelections(registry: Registry, ngApimockId?: string): {[key: string]: string};

    /**
     * Gets the selections.
     * @param registry The registry.
     * @param ngApimockId The ngApimock id.
     * @return selections The selections.
     */
    abstract getEchos(registry: Registry, ngApimockId?: string): {[key: string]: boolean};

    /**
     * Gets the selections.
     * @param registry The registry.
     * @param ngApimockId The ngApimock id.
     * @return selections The selections.
     */
    abstract getDelays(registry: Registry, ngApimockId?: string): {[key: string]: number};


    /**
     * @inheritDoc
     *
     * Handler that takes care of getting all the mocks.
     */
    handleRequest(request: http.IncomingMessage, response: http.ServerResponse, next: Function, registry: Registry, ngApimockId: string): void {
        const selections: {} = this.getSelections(registry, ngApimockId),
            echos: {} = this.getEchos(registry, ngApimockId),
            delays: {} = this.getDelays(registry, ngApimockId);

        response.writeHead(200, httpHeaders.CONTENT_TYPE_APPLICATION_JSON);
        response.end(JSON.stringify({
                mocks: registry.mocks,
                selections: selections,
                delays: delays,
                echos: echos,
                recordings: registry.recordings,
                record: registry.record
            }
        ));
    }

}