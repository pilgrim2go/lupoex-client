/**
 * Created by istrauss on 5/8/2017.
 */

import {bindable, inject} from 'aurelia-framework';
import {ValidationManager} from 'global-resources';

@inject(ValidationManager)
export class AuthenticateModal {

    @bindable parentElement;

    rememberExplanation = 'By default, we will not store your secret key at all ' +
        '(after it is used to sign a transaction, it will immediately be forgotten). ' +
        'Checking "Remember Secret" will allow us to store your secret in the browser\'s memory ' +
        'so you can create additional transactions without authenticating again. Even when you select this option, ' +
        'we do not store it anywhere but in the memory of the browser. As soon as you refresh this tab, the secret will be forgotten.';

    alertConfig = {
        type: 'info',
        message: 'In order to perform any operation (i.e. send a payment, create an offer etc.) on the stellar network, ' +
        'you need to sign with your account\'s secret key. Please provide your secret key below. ' +
        'Have no fear, your secret key will not leave the browser (we just store it in memory for the signing). As soon as you close this tab, ' +
        'refresh this tab or logout, your secret key will be forgotten from the browser\'s memory.',
        dismissible: false
    };

    constructor(validationManager) {
        this.validationManager = validationManager;
    }

    activate(params) {
        this.modalVM = params.modalVM;
    }

    authenticate() {
        if (!this.validationManager.validate()) {
            return;
        }

        this.modalVM.close({
            secret: this.secret,
            remember: this.remember
        });
    }
}
