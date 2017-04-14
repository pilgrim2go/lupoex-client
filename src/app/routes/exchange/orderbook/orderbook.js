/**
 * Created by istrauss on 3/27/2017.
 */

import {inject} from 'aurelia-framework';
import {StellarServer, AppStore} from 'resources';

@inject(StellarServer, AppStore)
export class OrderbookCustomElement {

    loading = 0;

    constructor(stellarServer, appStore) {
        this.stellarServer = stellarServer;
        this.appStore = appStore;
    }

    bind() {
        this.unsubscribeFromStore = this.appStore.subscribe(this.updateFromStore.bind(this));
        this.updateFromStore();
    }

    unbind() {
        this.unsubscribeFromStore();
    }

    updateFromStore() {
        const newState = this.appStore.getState();
        const exchange = newState.exchange;

        if (this.assetPair !== exchange.assetPair) {
            this.assetPair = exchange.assetPair;
            this.refresh();
        }
    }

    async refresh() {
        if (!this.assetPair) {
            return;
        }

        this.loading++;

        const orderbook = await this.stellarServer.orderbook(
            this.assetPair.selling.code === 'XLM' ? this.stellarServer.sdk.Asset.native() : new this.stellarServer.sdk.Asset(this.assetPair.selling.code, this.assetPair.selling.issuer),
            this.assetPair.buying.code === 'XLM' ? this.stellarServer.sdk.Asset.native() : new this.stellarServer.sdk.Asset(this.assetPair.buying.code, this.assetPair.buying.issuer)
        )
            .call();

        this.loading--;

        this.bids = orderbook.bids;
        this.asks = orderbook.asks;
    }
}