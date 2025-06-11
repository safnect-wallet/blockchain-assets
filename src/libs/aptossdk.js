import { Aptos, AptosConfig, Network, Ed25519PrivateKey, AccountAddress } from '@aptos-labs/ts-sdk'
import { unSupportTestnet, oklinkFetchGet, isNullity } from '@src/util'

const octa = 100_000_000
const DEFAULT_MAX_GAS_AMOUNT = 200000
const DEFAULT_GAS_PRICE = 150
export const DEFAULT_APT_COIN_TYPE = '0x1::aptos_coin::AptosCoin'
export const TOKEN_STANDAR = {
	coin: 'v1',
	fungibleAsset: 'v2'
}

export async function getBalanceOkx(network, address, cache = 30) {
	unSupportTestnet(network)
	return oklinkFetchGet({
		path: 'address/address-summary',
    chainShortName: 'APT',
    address,
    cache
	}).then(res => {
		let balance = '0'
		if (res && res.length && res[0]) {
			balance = `${res[0].balance}`
		}
		return balance
	})
}

export async function getBalance(network, address) {
	const aptosConfig = new AptosConfig({ network: network || Network.MAINNET })
	const aptos = new Aptos(aptosConfig)
	const balanceOcta = await aptos.getAccountAPTAmount({ accountAddress: address })
	return `${balanceOcta / octa}`
}

export async function getTokenBalance(network, address) {
	const aptosConfig = new AptosConfig({ network: network || Network.MAINNET })
	const aptos = new Aptos(aptosConfig)
	const coinDataArr = await aptos.getAccountCoinsData({ accountAddress: address })
	const retArr = [];
	coinDataArr.forEach(da => {
		const meta = da.metadata
		if (da.asset_type != DEFAULT_APT_COIN_TYPE) {
			retArr.push({
				balance: Number(da.amount) / Math.pow(10, meta.decimals),
				symbol: meta.symbol,
				contractAddress: da.asset_type,
				tokenType: da.token_standard,
				decimals: meta.decimals,
				icon: meta.icon_uri,
				name: meta.name
			});
		}
	});
	return retArr
}

export async function simulateTransaction(aptosInstance, transaction) {
	let simulateRet
	const [userTransactionResponse] = await aptosInstance.transaction.simulate.simple({
		transaction,
		options: {
			estimateGasUnitPrice: true,
			estimateMaxGasAmount: true,
			estimatePrioritizedGasUnitPrice: true
		}
	})
	// console.info('simulate response:', userTransactionResponse)
	if (userTransactionResponse && userTransactionResponse.success) {
		simulateRet = {
			sender: userTransactionResponse.sender, // from
			sequenceNumber: userTransactionResponse.sequence_number,
			maxGasAmount: userTransactionResponse.max_gas_amount,
			gasUnitPrice: userTransactionResponse.gas_unit_price,
			gasUsed: userTransactionResponse.gas_used,
			payload: userTransactionResponse.payload,
			signature: userTransactionResponse.signature,
			expirationTimestampSecs: userTransactionResponse.expiration_timestamp_secs,
			gasFee: userTransactionResponse.gas_used * userTransactionResponse.gas_unit_price / octa
		}
	}
	return simulateRet;
}

export async function buildTx(network, from, to, amount) {
	amount = Number((amount * octa).toFixed(1));
	const aptosConfig = new AptosConfig({ network: network || Network.MAINNET })
	const aptos = new Aptos(aptosConfig)
	const simutransaction = await aptos.transferCoinTransaction({
		sender: from,
		recipient: to,
		amount,
		coinType: DEFAULT_APT_COIN_TYPE,
		options: {
			gasUnitPrice: DEFAULT_GAS_PRICE,
			maxGasAmount: DEFAULT_MAX_GAS_AMOUNT,
		}
	})
	const simulateRet = await simulateTransaction(aptos, simutransaction);
	const transaction = await aptos.transferCoinTransaction({
		sender: from,
		recipient: to,
		amount,
		coinType: DEFAULT_APT_COIN_TYPE,
		options: {
			gasUnitPrice: simulateRet.gasUnitPrice,
			maxGasAmount: simulateRet.maxGasAmount,
		}
	})

	return { transaction, transactionFee: simulateRet.gasFee };
}

export async function buildTokenTx(network, from, to, amount, faMetaAddress) {
	const aptosConfig = new AptosConfig({ network: network || Network.MAINNET })
	const aptos = new Aptos(aptosConfig)
	const simutransaction = await aptos.transferFungibleAsset({
		sender: { accountAddress: from },
		fungibleAssetMetadataAddress: faMetaAddress,
		recipient: to,
		amount
	})
	const simulateRet = await simulateTransaction(aptos, simutransaction);
	const transaction = await aptos.transferFungibleAsset({
		sender: { accountAddress: from },
		fungibleAssetMetadataAddress: faMetaAddress,
		recipient: to,
		amount,
		options: {
			gasUnitPrice: simulateRet.gasUnitPrice,
			maxGasAmount: simulateRet.maxGasAmount,
		}
	});
	return { transaction, transactionFee: simulateRet.gasFee };
}

export async function sendTx(network, transaction, wif) {
	const aptosConfig = new AptosConfig({ network: network || Network.MAINNET })
	const aptos = new Aptos(aptosConfig)
	const privateKey = new Ed25519PrivateKey(wif)
	const address = AccountAddress.from(transaction.sender)
	const sender = await aptos.deriveAccountFromPrivateKey({ privateKey, address })

	const transfer = await aptos.signAndSubmitTransaction({
    signer: sender,
    transaction,
  })

  const executedRet = await aptos.waitForTransaction({ transactionHash: transfer.hash })
	// console.info('wait result:', executedRet)

	if (executedRet.success) {
		return { success: true, txid: transfer.hash };
	} else {
		return { success: false, errorMsg: executedRet.vm_status };
	}
}

export default {
	DEFAULT_APT_COIN_TYPE,
	TOKEN_STANDAR,
	getBalance,
	getTokenBalance,
	buildTx,
	sendTx,
	buildTokenTx,
}