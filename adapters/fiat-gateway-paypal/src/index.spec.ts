import { assert } from 'chai'
import dotenv from 'dotenv'
import EthCrypto, { Encrypted } from 'eth-crypto'
import IPFS from 'ipfs-http-client'
import 'mocha'
import path from 'path'
import {soliditySha3} from 'web3-utils'

import {
  JobRequest,
  NewMakerRequest,
  Request,
  requestWrapper,
  SendPayoutRequest,
} from './index'

dotenv.config({ path: path.resolve(process.cwd(), './paypal.test.env') })

const jobID = '278c97ffadb54a5bbb93cfec5f7b5503'

const baseReq = {
  id: jobID,
  data: {} as Request,
} as JobRequest

const sendPayoutRequest = ({
  method: 'sendPayout',
  amount: '10',
  currency: 'USD',
  receiver: 'your-buyer@example.com',
} as SendPayoutRequest)

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
  }).timeout(5000)

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

describe.only('#newMaker', function() {
  // enough time for ipfs calls
  this.timeout(20000)

  // An identity for the maker - use the public account address
  const makerIdentity = EthCrypto.createIdentity()

  // In a deployed environment this public key is published.
  // Here we generate one for testing.
  const paypalAdapterPublicKey = EthCrypto.createIdentity().publicKey

  // setup IPFS for storing encrypred creds
  const ipfs = IPFS('ipfs.infura.io', '5001', {protocol: 'https'})
  const apiCreds = {
    id: process.env.CLIENT_ID,
    sec: process.env.CLIENT_SECRET,
  }

  const newMakerRequest: Partial<NewMakerRequest> = {
    method: 'newMaker',
    public_account: makerIdentity.address,
    maker_id: soliditySha3(makerIdentity.address, 'AUD', 'ETH'),
    fiat_currency: 'AUD',
    token: 'ETH',
    reserve_amount: 250,
    // api_creds_ipfs_hash - will be added below
  }

  let apiCredsIpfsHash

  before(async () => {
    // encrypt the credentials with the adapters public key
    const apiCredsEncrypted: Encrypted = await EthCrypto.encryptWithPublicKey(
      paypalAdapterPublicKey,
      JSON.stringify(apiCreds),
    )

    // publish the encrypted creds to ipfs and save the hash
    const apiCredsEncryptedBuf = Buffer.from(JSON.stringify(apiCredsEncrypted), 'utf8')
    console.log(`adding encrypted creds file to ipfs @ ${Date.now()}`)

    apiCredsIpfsHash = (await ipfs.add(apiCredsEncryptedBuf))[0].path
    console.log(`got creds ipfs hash: ${apiCredsIpfsHash} @ ${Date.now()}`)

    newMakerRequest.api_creds_ipfs_hash = apiCredsIpfsHash
  })

  it('should add new maker', async function() {
    const req = {...baseReq, data: newMakerRequest}

    const rsp = await requestWrapper(req)

    assert.equal(rsp.statusCode, 201, 'status code')
    assert.equal(rsp.jobRunID, jobID, 'job id')
    assert.isNotEmpty(rsp.data, 'rsp data')
    assert.isNotEmpty(rsp.data.result, 'payout id')
  })
})
