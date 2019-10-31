import { assert } from 'chai'
import dotenv from 'dotenv'
import EthCrypto, { Encrypted } from 'eth-crypto'
import IPFS from 'ipfs-http-client'
import 'mocha'
import path from 'path'
import {soliditySha3} from 'web3-utils'

import {
  BuyCryptoOrderPayedRequest,
  BuyCryptoOrderRequest,
  JobRequest,
  NewMakerRequest,
  Request,
  requestWrapper,
  SellCryptoOrderRequest,
  SendPayoutRequest,
} from './index'

dotenv.config({ path: path.resolve(process.cwd(), './test.env') })

const {
  CLIENT_ID,
  CLIENT_SECRET,
  PUBLIC_KEY: ADAPTER_PUBLIC_KEY,
} = process.env

const jobID = '278c97ffadb54a5bbb93cfec5f7b5503'
const payoutDestination = 'ataker@example.com'

const baseReq = {
  id: jobID,
  data: {} as Request,
} as JobRequest

const sendPayoutRequest = ({
  method: 'sendPayout',
  amount: '10',
  currency: 'AUD',
  receiver: payoutDestination,
} as SendPayoutRequest)

const newMakerRequest = (
  makerPublicAddress,
  credsIpfsHash,
): NewMakerRequest => {
  return {
    method: 'newMaker',
    public_account: makerPublicAddress,
    maker_id: soliditySha3(makerPublicAddress, 'AUD', 'ETH'),
    fiat: 'AUD',
    crypto: 'ETH',
    reserve_amount: '250',
    destination: 'maker@liquidity.com',
    api_creds_ipfs_hash: credsIpfsHash,
  }
}

/***********************************************************
 * Routine to setup api creds for a single maker on IPFS.
 * Store the IPFS hash in apiCredsIpfsHash for test usage.
 **********************************************************/

let apiCredsIpfsHash
let destinationIpfsHash

// Maker account
const makerIdentity = EthCrypto.createIdentity()

// setup IPFS for storing encrypred creds
const ipfs = IPFS('ipfs.infura.io', '5001', {protocol: 'https'})

const apiCreds = {
  id: CLIENT_ID,
  sec: CLIENT_SECRET,
}

const encryptAndStoreOnIpfs = async (dataStr) => {
  // encrypt the data with the adapters public key
  const encrypted: Encrypted = await EthCrypto.encryptWithPublicKey(
    ADAPTER_PUBLIC_KEY as string,
    dataStr,
  )

  // publish the encrypted creds to ipfs and save the hash
  const encryptedBuf = Buffer.from(JSON.stringify(encrypted), 'utf8')
  console.log(`adding encrypted file to ipfs`)

  return (await ipfs.add(encryptedBuf))[0].path
}

const setupApiCredsOnIpfs = async () => {
  apiCredsIpfsHash = await encryptAndStoreOnIpfs(JSON.stringify(apiCreds))
  console.log(`got creds ipfs hash: ${apiCredsIpfsHash}`)
}

const setupDestinationOnIpfs = async () => {
  destinationIpfsHash = await encryptAndStoreOnIpfs(payoutDestination)
  console.log(`got destination ipfs hash: ${destinationIpfsHash}`)
}

before(async function() {
  this.timeout(15000)
  await Promise.all([
    setupApiCredsOnIpfs(),
    setupDestinationOnIpfs(),
  ])
})

describe('#sendPayout', function() {
  // enough time for paypal calls
  this.timeout(10000)

  it('should send payment/payout', async () => {
    const req = {...baseReq, data: sendPayoutRequest}

    const rsp = await requestWrapper(req)

    assert.equal(rsp.statusCode, 201, 'status code')
    assert.equal(rsp.jobRunID, jobID, 'job id')
    assert.isNotEmpty(rsp.data, 'rsp data')
    assert.isNotEmpty(rsp.data.result, 'payout id')
  }).timeout(10000)

  it('should fail sendPayout with missing amount', async () => {
    const data = {
      method: 'sendPayout',
      receiver: 'your-buyer@example.com',
    } as SendPayoutRequest
    const req = {...baseReq, data}

    const rsp = await requestWrapper(req)

    assert.equal(rsp.statusCode, 400, 'status code')
    assert.equal(rsp.jobRunID, jobID, 'job id')
    assert.isUndefined(rsp.data, 'rsp data')
  })

  it('should fail sendPayout with missing receiver', async () => {
    const data = {
      method: 'sendPayout',
      amount: 10,
    } as Request
    const req = {...baseReq, data}

    const rsp = await requestWrapper(req)

    assert.equal(rsp.statusCode, 400, 'status code')
    assert.equal(rsp.jobRunID, jobID, 'job id')
    assert.isUndefined(rsp.data, 'rsp data')
  })
})

describe('#getPayout', function() {
  // enough time for paypal calls
  this.timeout(10000)

  let payoutId

  before(async () => {
    // send a payment to get a payout id
    const sendReq = {...baseReq, data: sendPayoutRequest}
    const sendRsp = await requestWrapper(sendReq)
    payoutId = sendRsp.data.batch_header.payout_batch_id
  })

  it('should get payout details', async () => {
    const req = {...baseReq, data: {
      method: 'getPayout',
      payout_id: payoutId,
    }}

    const rsp = await requestWrapper(req)

    assert.equal(rsp.statusCode, 200, 'status code')
    assert.equal(rsp.jobRunID, jobID, 'job id')
    assert.isNotEmpty(rsp.data, 'rsp data')
    assert.isNotEmpty(rsp.data.result, 'payout id')
  })

  it('should fail getPayout with missing payout id', async () => {
      const req = {...baseReq, data: {
          method: 'getPayout',
        },
      }

      const rsp = await requestWrapper(req)

      assert.equal(rsp.statusCode, 400, 'status code')
      assert.equal(rsp.jobRunID, jobID, 'job id')
      assert.isUndefined(rsp.data, 'rsp data')
    })
  })

describe('create request', () => {
  context('requests data', () => {
    it('should fail on invalid method', async () => {
      // Notice method not set.
      const rsp = await requestWrapper(baseReq)
      assert.equal(rsp.statusCode, 400, 'status code')
      assert.equal(rsp.jobRunID, jobID, 'job id')
      assert.isUndefined(rsp.data, 'rsp data')
    })
  })
})

describe('#newMaker', function() {
  // enough time for ipfs get
  this.timeout(15000)

  it('should add new maker', async function() {
    const req = {
      ...baseReq,
      data: newMakerRequest(makerIdentity.address, apiCredsIpfsHash),
    }

    const rsp = await requestWrapper(req)

    assert.equal(rsp.statusCode, 201, 'status code')
    assert.equal(rsp.jobRunID, jobID, 'job id')
    assert.equal(rsp.data.maker_id, req.data.maker_id, 'maker id')
  })
})

describe.skip('#buy', function() {
  // enough time for ipfs get
  this.timeout(15000)

  it('handles full cycle for a buy crypto order', async function() {
    // Create a new maker
    const maker = EthCrypto.createIdentity()
    const makerReq = {
      ...baseReq,
      data: newMakerRequest(maker.address, apiCredsIpfsHash),
    }
    const newMakerRsp = await requestWrapper(makerReq)
    assert.equal(newMakerRsp.statusCode, 201, 'status code')

    // Create a buy order from a buyer
    const buyer = EthCrypto.createIdentity()
    const buyCryptoOrderReq = {
      ...baseReq,
      data: {
        method: 'buyCryptoOrder',
        buyer_address: buyer.address,
        order_id: '0x12345',
        order_amount: '50',
        fiat: 'AUD',
        crypto: 'ETH',
      } as BuyCryptoOrderRequest,
    }

    const orderRsp = await requestWrapper(buyCryptoOrderReq)

    assert.equal(orderRsp.statusCode, 201, 'status code')
    assert.equal(
      orderRsp.data.maker_id,
      makerReq.data.maker_id,
      'maker id',
    )
    assert.equal(
      orderRsp.data.destination,
      makerReq.data.destination,
      'maker destination address',
    )
    assert.equal(orderRsp.data.price, '123.45', 'price for buy')

    // Tell the adapter that the order has been payed
    // The adapter will check the payment then fill the order
    const buyCryptoOrderPayedReq = {
      ...baseReq,
      data: {
        method: 'buyCryptoOrderPayed',
        order_id: buyCryptoOrderReq.data.order_id,
        maker_id: orderRsp.data.destination,
        payout_id: 'buyer@wantcrypto.com',
        price: orderRsp.data.price,
      } as BuyCryptoOrderPayedRequest,
    }

    const payedRsp = await requestWrapper(buyCryptoOrderPayedReq)

    assert.equal(orderRsp.statusCode, 200, 'status code')
    assert.equal(orderRsp.data.maker_id, 200, '')
  })
})

describe.only('#sellCryptoOrder', function() {
  // enough time for ipfs get plus paypal calls
  this.timeout(25000)

  it('handles full cycle for a sell crypto order', async function() {
    // Create a new maker
    const maker = EthCrypto.createIdentity()
    const makerReq = {
      ...baseReq,
      data: newMakerRequest(maker.address, apiCredsIpfsHash),
    }
    const newMakerRsp = await requestWrapper(makerReq)
    assert.equal(newMakerRsp.statusCode, 201, 'status code')

    // Create a sell order from a seller
    const seller = EthCrypto.createIdentity()
    const sellCryptoOrderReq = {
      ...baseReq,
      data: {
        method: 'sellCryptoOrder',
        seller_address: seller.address,
        order_amount: '50',
        crypto: 'ETH',
        fiat: 'AUD',
        destination_ipfs_hash: destinationIpfsHash,
      } as SellCryptoOrderRequest,
    }

    const orderRsp = await requestWrapper(sellCryptoOrderReq)

    assert.equal(orderRsp.statusCode, 201, 'status code')
    assert.equal(
      orderRsp.data.maker_id,
      makerReq.data.maker_id,
      'maker id',
    )
  })
})
