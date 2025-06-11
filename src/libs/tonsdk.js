import { tonWallet, tonSdk, okxcry } from '@src/wallets'
import { wrapFetch } from '@src/util'
import { TonClient4, WalletContractV4, toNano, internal, Address, beginCell, external, storeMessage } from '@ton/ton'

const mainEndpoint = 'https://toncenter.com'
const mainEndpointV2 = `${mainEndpoint}/api/v2`
const mainEndpointV3 = `${mainEndpoint}/api/v3`
const API_ENDPOINT = 'https://mainnet-v4.tonhubapi.com';

export async function getBalance(network, address) {
	return wrapFetch(`${mainEndpointV2}/getAddressBalance?address=${address}`).then(res => {
		if (res.ok && res.result) {
			return tonSdk.fromNano(res.result)
		} else {
			throw res.error || 'getTonAddressBalance Fail'
		}
	})
}

export async function getTokenBalance(network, ownerAddress) {
	return wrapFetch(`${mainEndpointV3}/jetton/wallets?owner_address=${ownerAddress}&limit=10&offset=0`).then(ret => {
		const {
			jetton_wallets: jettonWallets,
			address_book: addressBook,
			metadata
		} = ret
		const jettonList = jettonWallets.map(jw => {
			const masterAddressRaw = jw.jetton
			const masterAddrObj = addressBook[masterAddressRaw] || {}
			const contractMetaData = metadata[masterAddressRaw] || {}
			const tokenInfo = (contractMetaData.token_info || [])[0] || {}
			const tokenExtra = tokenInfo.extra || {}
			return {
	  		balance: Number(jw.balance) / Math.pow(10, tokenExtra.decimals),
	  		symbol: tokenInfo.symbol,
	  		contractAddress: (addressBook[jw.address] || {}).user_friendly,
	  		tokenType: tokenInfo.type,
	  		decimals: tokenExtra.decimals,
	  		icon: tokenExtra._image_small || tokenExtra._image_medium || tokenExtra._image_big || tokenInfo.image,
	  		name: tokenInfo.name
	  	};
		})
		return jettonList
	})
}

export async function estimateFee(address, txCellEncode) {
	return wrapFetch(`${mainEndpointV2}/estimateFee`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		body: JSON.stringify({
			address,
			body: txCellEncode
		})
	}).then(ret => {
		if (ret.ok) {
			const sourceFeeObj = (ret.result || {}).source_fees || {}
			let totalNano = BigInt((sourceFeeObj.in_fwd_fee || 0) + (sourceFeeObj.storage_fee || 0) + (sourceFeeObj.gas_fee || 0) + (sourceFeeObj.fwd_fee || 0))
			return tonSdk.fromNano(totalNano)
		} else {
			throw `${ret.code}|${ret.error}` || 'estimate fee Fail'
		}
	})
}

export async function buildTx(network, senderAddr, receiverAddr, amount) {
	const transaction = {
		network, senderAddr, receiverAddr, amount
	};
	return { transaction, transactionFee: 0.00289 };
}

export async function buildTokenTx(network, senderAddr, receiverAddr, amount, senderJettonAddr) {
	const transaction = {
		network, senderAddr, receiverAddr, amount, senderJettonAddr
	};
	return { transaction, transactionFee: 0.003494 };
}

export async function sendTx(network, transaction, privateKey) {
	if (transaction.senderJettonAddr) {
		try {
			const keyPair = okxcry.signUtil.ed25519.fromSeed(okxcry.base.fromHex(privateKey))
			const client = new TonClient4({ endpoint: API_ENDPOINT })
			const wallet = WalletContractV4.create({
				workchain: 0,
				publicKey: Buffer.from(keyPair.publicKey)
			})
			
		  const jettonWalletAddress = Address.parse(transaction.senderJettonAddr);
		  const destinationAddress = Address.parse(transaction.receiverAddr)
		
			const walletContract = client.open(wallet)
			const seqno = await walletContract.getSeqno()
			// console.info('seqno:', seqno)
		
			const init = walletContract.init
		  const contractDeployed = await client.isContractDeployed(seqno, wallet.address)
		  let neededInit = null
		  if (init && !contractDeployed) {
		    neededInit = init
		  }
		
			let transferPayload
		  const messageBody = beginCell()
		      	.storeUint(0x0f8a7ea5, 32) // opcode for jetton transfer
		        .storeUint(0, 64) // queryId，set 0
		        .storeCoins(transaction.amount) // jetton amount
		        .storeAddress(destinationAddress)
		        .storeAddress(wallet.address) // response destination
						.storeBit(0) // no custom payload
						.storeCoins(0)
			
			transferPayload = messageBody.storeBit(0).endCell()
		
		  const internalMessage = internal({
				to: jettonWalletAddress,
		    value: toNano(0.01), // message fee
		    bounce: true,
				body: transferPayload
		  })
		
			const transfer = walletContract.createTransfer({
				seqno,
				secretKey: keyPair.secretKey,
				messages: [internalMessage],
				sendMode: tonSdk.SendMode.IGNORE_ERRORS
			})
		
			const externalMessage = external({
		    to: transaction.senderAddr,
		    init: neededInit,
		    body: transfer
		  })
		  const externalMessageCell = beginCell().store(storeMessage(externalMessage)).endCell()
		  const signedTransaction = externalMessageCell.toBoc()
		  const hash = externalMessageCell.hash().toString('hex')
		  // console.info('hash:', hash)
		
			const ret = await client.sendMessage(signedTransaction)
			return { success: true, txid: hash };
		} catch (error) {
			console.error(error);
			return { success: false, errorMsg: error.message };
		}
	} else { // native coin transfer
		const keyPair = okxcry.signUtil.ed25519.fromSeed(okxcry.base.fromHex(privateKey));
		const client = new TonClient4({ endpoint: API_ENDPOINT });
		const wallet = WalletContractV4.create({
			workchain: 0,
			publicKey: okxcry.base.fromHex(okxcry.base.toHex(keyPair.publicKey))
		})
		const walletContract = client.open(wallet)
		const seqno = await walletContract.getSeqno();
		try {
			const transfer = walletContract.createTransfer({
				seqno,
				secretKey: keyPair.secretKey,
				messages: [internal({
					to: transaction.receiverAddr,
					value: toNano(transaction.amount),
					body: '',
				})],
				sendMode: tonSdk.SendMode.IGNORE_ERRORS
			});
			await walletContract.send(transfer) // { status: 1 }
			const hash = transfer.hash().toString('hex')
			return { success: true, txid: hash };
		} catch (error) {
			console.error(error);
			return { success: false, errorMsg: error.message };
		}
	}
}

export default {
	getBalance,
	getTokenBalance,
	buildTx,
	buildTokenTx,
	sendTx
}
