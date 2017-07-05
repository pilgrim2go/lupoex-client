/**
 * Created by istrauss on 6/4/2017.
 */

import {inject} from 'aurelia-framework';
import {AppStore} from 'global-resources';
import {OfferService} from 'app-resources';
import {AppActionCreators} from '../../../../../app-action-creators';

@inject(AppStore, OfferService, AppActionCreators)
export class MyOffersCustomElement {

    loading = 0;

    constructor(appStore, offerService, appActionCreators) {
        this.appStore = appStore;
        this.offerService = offerService;
        this.appActionCreators = appActionCreators;
    }

    bind() {
        this.unsubscribeFromStore = this.appStore.subscribe(this.updateFromStore.bind(this));
        this.updateFromStore();
    }

    unbind() {
        this.unsubscribeFromStore();
    }

    updateFromStore() {
        const state = this.appStore.getState();

        this.account = state.account;
        this.nativeAssetCode = window.lupoex.stellar.nativeAssetCode;

        if (this.allOffers !== state.offers || this.assetPair !== state.exchange.assetPair) {
            this.assetPair = state.exchange.assetPair;
            this.allOffers = state.offers;

            if (this.allOffers) {
                this.asks = this.allOffers.filter(o => {
                    return this.compareAssets(o.buying, this.assetPair.buying) && this.compareAssets(o.selling, this.assetPair.selling);
                });
                this.bids = this.allOffers.filter(o => {
                    return this.compareAssets(o.selling, this.assetPair.buying) && this.compareAssets(o.buying, this.assetPair.selling);
                });
            }
        }
    }

    compareAssets(asset1, asset2) {
        return (asset1.asset_type === 'native' && asset2.code === this.nativeAssetCode) ||
            (asset1.asset_code === asset2.code && asset1.asset_issuer === asset2.issuer);
    }

    async refresh() {
        this.loading++;

        await this.appStore.dispatch(this.appActionCreators.updateOffers());

        this.loading--;
    }

    async cancel(bid) {
        await this.offerService.cancelOffer(bid);
    }
}
