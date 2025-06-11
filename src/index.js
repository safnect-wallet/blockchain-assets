import { initBridgeMessageHandler } from './bridge';
initBridgeMessageHandler();

import sfkey from '@libs/sfkey/init';
import btc from '@libs/btc/init';
import fb from '@libs/fb/init';
import eth from '@libs/eth/init';
import tron from '@libs/tron/init';
import misc from '@libs/misc/init';
import common from '@libs/common';

const chain = [
  sfkey.name,
  btc.name,
  fb.name,
  eth.name,
  tron.name,
  misc.name,
  common.name,
  
]
export const info = '[SDK Info]: ' + chain.join(' | ')
