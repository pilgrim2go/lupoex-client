import {combineReducers} from 'redux';

import {myAccount} from './my-account';

import {exchange} from '../routes/exchange/reducers';

export const app = combineReducers({
    myAccount,
    exchange
});
