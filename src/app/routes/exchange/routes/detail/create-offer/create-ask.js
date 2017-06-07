/**
 * Created by istrauss on 6/2/2017.
 */

import _find from 'lodash.find';
import {bindable, inject, Container} from 'aurelia-framework';
import {OfferService} from 'app-resources';
import {CreateOffer} from './create-offer';
import {AppActionCreators} from '../../../../../app-action-creators';

@inject(Container, OfferService, AppActionCreators)
export class CreateAskCustomElement extends CreateOffer {
    
    constructor(container, offerService, appActionCreators) {
        super(container);

        this.offerService = offerService;
        this.appActionCreators = appActionCreators;
    }

    filterOffers(allOffers) {
        return allOffers.filter(o => {
            return this.compareAssets(o.buying, this.assetPair.buying) || this.compareAssets(o.selling, this.assetPair.buying);
        });
    }

    get needsTrustline() {
        return this.assetPair.buying.code !== window.lupoex.stellar.nativeAssetCode;
    }

    get buyingAssetBalance() {
        const asset = _find(this.account.balances, a => {
            return this.compareAssets(a, this.assetPair.buying);
        });

        return asset ? asset.balance : 0;
    }

    get sellingAssetBalance() {
        const asset = _find(this.account.balances, a => {
            return this.compareAssets(a, this.assetPair.selling);
        });

        return asset ? asset.balance : 0;
    }

    get sellingAsset() {
        return this.assetPair.selling;
    }

    get buyingAsset() {
        return this.assetPair.buying;
    }

    async submit() {
        if (!this.validate()) {
            return;
        }

        try {
            await this.offerService.createOffer({
                type: 'Ask',
                buyingCode: this.assetPair.buying.code,
                buyingIssuer: this.assetPair.buying.code === window.lupoex.stellar.nativeAssetCode ? undefined : this.assetPair.buying.issuer,
                sellingCode: this.assetPair.selling.code,
                sellingIssuer: this.assetPair.selling.code === window.lupoex.stellar.nativeAssetCode ? undefined : this.assetPair.selling.issuer,
                sellingAmount: this.sellingAmount,
                trustline: this.trustline,
                price: parseFloat(this.buyingAmount, 10) / parseFloat(this.sellingAmount, 10)
            });

            this.appStore.dispatch(this.appActionCreators.updateOffers());
        }
        catch(e) {}
    }
}
