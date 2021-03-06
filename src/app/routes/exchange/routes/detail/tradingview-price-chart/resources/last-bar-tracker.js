/**
 * Created by istrauss on 8/4/2017.
 */

import BigNumber from 'bignumber.js';
import moment from 'moment';
import {inject} from 'aurelia-framework';
import {subscriptionService} from 'global-resources';
import {MarketResource} from 'app-resources';
import {MarketStream} from '../../resources';

@subscriptionService()
@inject(MarketResource, MarketStream)
export class LastBarTracker {
    _resolution;
    _lastPriorBar;
    _assetPair;
    _emptyBar = {
        volume: 0,
        boughtVolume: 0,
        soldVolume: 0,
        lastLedgerSequence: 0
    };

    constructor(marketResource, marketStream) {
        this.marketResource = marketResource;
        this.marketStream = marketStream;
    }

    /**
     * Configures the LedgerTradesPayloadsQueue.
     * The LedgerTradesPayloadsQueue will not handle new trades before being configured with a resolution.
     * @param [config] - If a config is not specified the LastBarTracker will be stopped.
     * @param [config.resolution] resolution in seconds
     */
    reconfigure(config = {}) {
        this._resolution = config.resolution;
        this._reset();
    }

    get() {
        if (!this._resolution) {
            return Promise.resolve();
        }

        if (!this._lastPriorBar || this._assetPair !== this.marketStream.assetPair) {
            this._assetPair = this.marketStream.assetPair;

            this._lastPriorBarPromise = this.marketResource.lastPriorBar(
                this._resolution,
                this._assetPair,
                moment.utc(new Date()).toISOString()
            )
                .then(lpb => {
                    if (!lpb) {
                        return null;
                    }

                    this._lastPriorBar = {
                        ...lpb,
                        time: moment(lpb.begin).valueOf(),
                        volume: lpb.soldVolume
                    };
                });
        }

        return this._lastPriorBarPromise
            .then(() => {
                return this._lastPriorBar;
            });
    }

    async getEmptyBar() {
        const lastPriorBar = await this.get();
        return {
            ...this._emptyBar,
            high: lastPriorBar.close,
            low: lastPriorBar.close,
            open: lastPriorBar.close,
            close: lastPriorBar.close
        };
    }

    timeToBarTime(dateTime) {
        const divided = moment(dateTime).unix() / this._resolution;
        const floored = parseInt(Math.floor(divided), 10) * this._resolution;
        return floored * 1000;
    }

    _reset() {
        this._lastPriorBar = undefined;

        if (!this._resolution && this.unsubscribeFromStream) {
            this.unsubscribeFromStream();
            this.unsubscribeFromStream = undefined;
        }
        else if (this._resolution && !this.unsubscribeFromStream) {
            this.unsubscribeFromStream = this.marketStream.subscribe(this._handleMarketStreamPayload.bind(this));
        }
    }

    async _handleMarketStreamPayload({type, payload}) {
        if (!this._resolution || type !== 'trades') {
            return;
        }

        const lastPriorBar = await this.get();

        await this._updateBarWithNewTrades(lastPriorBar, payload);

        this._notifySubscribers(lastPriorBar);
    }

    async _updateBarWithNewTrades(bar, ledgerTradesPayload) {
        if (this._tradesBelongToNextBar(bar, ledgerTradesPayload)) {
            Object.assign(bar, {
                lastLedgerSequence: bar.lastLedgerSequence,
                ...this._emptyBar,
                time: this.timeToBarTime(ledgerTradesPayload.ledger.closed_at)
            });
        }

        if (bar.lastLedgerSequence >= ledgerTradesPayload.ledger.sequence) {
            return;
        }

        bar.lastLedgerSequence = ledgerTradesPayload.ledger.sequence;

        ledgerTradesPayload.trades.reverse().forEach(this._addTradeToBar.bind(this, bar));
    }

    _addTradeToBar(bar, trade) {
        const price = new BigNumber(trade.details.bought_amount).dividedBy(trade.details.sold_amount).toString(10);
        Object.assign(bar, {
            ...{
                // Only respect the bar's previous open, low, high if it had volume. Otherwise, they aren't real.
                open: bar.volume ? bar.open : price,
                low: bar.volume && bar.low ? BigNumber.min(bar.low, price).toString(10) : price,
                high: bar.volume && bar.high ? BigNumber.max(bar.high, price).toString(10) : price,
                close: price,
                boughtVolume: parseFloat((new BigNumber(bar.boughtVolume)).add(trade.details.bought_amount).toString(10), 10),
                soldVolume: parseFloat((new BigNumber(bar.soldVolume)).add(trade.details.sold_amount).toString(10), 10),
                volume: parseFloat((new BigNumber(bar.volume)).add(trade.details.sold_amount).toString(10), 10)
            }
        });
    }

    _tradesBelongToNextBar(lastPriorBar, ledgerTradesPayload) {
        const endOfPriorBar = moment(lastPriorBar.time).add(this._resolution, 'seconds');
        return moment(ledgerTradesPayload.ledger.closed_at).isAfter(endOfPriorBar);
    }
}
