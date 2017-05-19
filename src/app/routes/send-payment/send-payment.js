/**
 * Created by istrauss on 5/19/2017.
 */

import {PLATFORM} from 'aurelia-pal';
import {inject} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import {HttpClient} from 'aurelia-fetch-client';
import {ModalService, AppStore, ValidationManager, StellarServer} from 'global-resources';
import {TransactionService} from 'app-resources';
import {AppActionCreators} from '../../app-action-creators';

@inject(Router, HttpClient, ModalService, AppStore, ValidationManager, StellarServer, TransactionService, AppActionCreators)
export class SendPayment {

    loading = 0;
    step = 'input';
    confirmInfoAlertConfig = {
        type: 'info',
        message: 'Once made, payments are <strong>irreversible</strong>. Please be sure to verify every detail of your payment before confirming. Confirm the details of your payment below. ',
        dismissible: false
    };

    constructor(router, httpClient, modalService, appStore, validationManager, stellarServer, transactionService, appActionCreators) {
        this.router = router;
        this.httpClient = httpClient;
        this.modalService = modalService;
        this.appStore = appStore;
        this.validationManager = validationManager;
        this.transactionService = transactionService;
        this.stellarServer = stellarServer;
        this.appActionCreators = appActionCreators;
    }

    activate(params) {
        this.nativeAssetCode = window.lupoex.stellar.nativeAssetCode;
        this.code = params.code;
        this.issuer = params.issuer;
        this.memos = [];
    }

    addMemo() {
        this.memos.push({});
    }

    removeMemo(index) {
        this.memos.splice(index, 1);
    }

    submitInput() {
        if (!this.validationManager.validate()) {
            return;
        }

        this.step = 'confirm';
    }

    finish() {
        this.router.navigate('/account/asset-balances');
    }

    tryAgain() {
        this.alertConfig = undefined;
        this.step = 'input';
    }

    refresh() {
        this.destination = undefined;
        this.amount = undefined;
        this.memos = [];
        this.validationManager.clear();
        this.step = 'input';
        this.alertConfig = undefined;
    }

    async generateSuccessMessage(response) {
        const transactionResponse = await this.httpClient.fetch(response._links.transaction.href);
        const transaction = await transactionResponse.json();
        const effectsResponse = await this.stellarServer.effects().forTransaction(transaction.id).call();

        return effectsResponse.records.reduce((html, e) => {
                let msg = '';
                switch(e.type) {
                    case 'account_credited':
                        msg = 'Sent ' + e.amount + ' ' + (e.asset_type === 'native' ? this.nativeAssetCode : e.asset_code) + ' to account <span style="word-break: break-all;">' + e.account + '</span>.';
                        break;
                    case 'account_created':
                        msg = 'Account <span style="word-break: break-all;">' + e.account + '</span> created with 20 ' + this.nativeAssetCode + '.';
                        break;
                }

                return html + '<li>' + msg + '</li>';
            }, '<ul>') + '</ul>';
    }

    async submitConfirmation() {
        this.loading++;

        try {
            //We need to update the account prior to creating the transaction in order to ensure that the account.sequence is updated.
            await this.appStore.dispatch(this.appActionCreators.updateAccount());

            const account = this.appStore.getState().account;

            const transactionBuilder = new this.stellarServer.sdk.TransactionBuilder(
                new this.stellarServer.sdk.Account(account.id, account.sequence)
            );

            //Let's check if the destinationAccount exists.
            let destinationAccount;

            try {
                destinationAccount = await this.stellarServer.loadAccount(this.destination);
            }
                //Rejection means that account does not exist
            catch(e) {}

            //Destination account doest exist? Let's try to create it (if the user is sending native asset).
            if (!destinationAccount) {
                if (this.code === this.nativeAssetCode) {
                    transactionBuilder
                        .addOperation(this.stellarServer.sdk.Operation.createAccount({
                            destination: this.destination,
                            startingBalance: "20"
                        }));

                    this.amount = parseInt(this.amount, 10) - 20;
                }
                else {
                    this.alertConfig = {
                        type: 'error',
                        message: 'That destination account does not exist on the stellar network. Please ensure that you are sending this payment to an existing account.'
                    };
                    return;
                }
            }

            //Add the payment operation
            transactionBuilder
                .addOperation(
                    this.stellarServer.sdk.Operation.payment({
                        destination: this.destination,
                        amount: this.amount.toString(),
                        asset: this.code === this.nativeAssetCode ?
                            this.stellarServer.sdk.Asset.native() :
                            new this.stellarServer.sdk.Asset(this.code, this.issuer)
                    })
                );

            //Attach the memos
            this.memos.forEach(m => {
                transactionBuilder.addMemo(this.stellarServer.sdk.Memo[this.memoMethodFromType(m.type)](m.value))
            });

            const transaction = transactionBuilder.build();

            try {
                await this.transactionService.submit(transaction, {
                    tryAgain: {
                        text: 'Try Again',
                        callback: this.tryAgain.bind(this)
                    },
                    submitAnother: {
                        text: 'Send Another Payment',
                        callback: this.refresh.bind(this)
                    },
                    onSuccess: this.generateSuccessMessage.bind(this)
                });
            }
            catch(e) {
                this.finish();
            }
        }
        catch(e) {
            this.alertConfig = {
                type: 'error',
                message: e.message || 'Something is wrong, can\'t submit the payment to the network'
            };
        }

        this.loading--;
    }

    memoMethodFromType(memoType) {
        switch (memoType) {
            case 'Id':
                return 'id';
            case 'Text':
                return 'text';
            case 'Hash':
                return 'hash';
            case 'Return':
                return 'returnHash';
            default:
                throw new Error('Unrecognized Memo Type.');
        }
    }
}
