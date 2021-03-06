/**
 * Created by istrauss on 5/8/2017.
 */

import {inject} from 'aurelia-framework';
import {Store} from 'au-redux';
import {ValidationManager} from 'global-resources';
import {AccountResource} from 'app-resources';

@inject(Store, ValidationManager, AccountResource)
export class OfferModal {

    loading = 0;
    alertConfig = {
        type: 'info',
        dismissible: false,
        message: 'Acquiring an asset on the stellar network implies a trust in the asset issuer because the issuer is responsible for backing the asset. In other words,' +
            ' if you buy a BTC asset on the network, the BTC asset is only valuable if the issuer can be counted on to redeem your asset with real BTC.<br>' +
            '<p>Because of this, stellar requires you to explicitly declare that you trust an asset/issuer. This declaration of trust is done by setting a trust limit.' +
            ' Your asset balance cannot be greater than your trust limit.</p>' +
            '<p>To learn more about stellar assets and trust see the <a href="https://www.stellar.org/developers/guides/concepts/assets.html" target="_blank">Stellar Asset Concept Documentation</a>.</p>'
    };

    constructor(store, validationManager, accountResource) {
        this.store = store;
        this.validationManager = validationManager;
        this.accountResource = accountResource;
    }

    async activate(params) {
        this.modalVM = params.modalVM;
        this.type = params.passedInfo.type;
        this.code = params.passedInfo.code;
        this.issuer = params.passedInfo.issuer;

        this.getTrustline();
    }

    async getTrustline() {
        this.loading++;
        const trustline = await this.accountResource.trustline(this.store.getState().myAccount.accountId, {
            type: this.type,
            code: this.code,
            issuer: this.issuer
        });
        this.newLimit = this.limit = trustline ? trustline.trustLimit : 0;
        this.loading--;
    }

    async modifyLimit() {
        if (!this.validationManager.validate()) {
            return;
        }

        this.modalVM.dismissible = false;
        this.loading++;

        this.modalVM.close(this.newLimit);
    }

    cancel() {
        this.modalVM.dismiss();
    }
}
