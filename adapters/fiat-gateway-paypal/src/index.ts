import BigNumber from 'bignumber.js'
import EthCrypto, { Encrypted } from 'eth-crypto'
import IPFS from 'ipfs-http-client'
import * as paypal from 'paypal-rest-sdk'

/**************************************************
 * Request and Response Types
 *************************************************/

class Response {
  jobRunID: string
  statusCode: number
  status?: string
  data?: any
  error?: any
}

export class JobRequest {
  id: string
  data: Request
}

export class Request {
  method?: string
}

export class GetPayoutRequest extends Request {
  payout_id: string
  type?: string
}

export class SendPayoutRequest extends Request {
  amount: string
  receiver: string
  currency?: string
  recipient_type?: string
  note?: string
  sender_item_id?: string
  email_subject?: string
  email_message?: string
}

export class NewMakerRequest extends Request {
  public_account: string
  maker_id: string
  crypto: string
  fiat: string
  reserve_amount: string
  destination: string
  api_creds_ipfs_hash: string
}

export class PaypalApiCredentials {
  id: string
  sec: string
}

export class Maker extends NewMakerRequest {
  api_creds: PaypalApiCredentials
}

export class BuyCryptoOrderRequest extends Request {
  buyer_address: string
  order_id: string
  order_amount: string
  crypto: string
  fiat: string
}

export class BuyCryptoOrderPayedRequest extends Request {
  order_id: string
  maker_id: string
  price: string
  buyer_address: string
  payout_id: string // TODO: should be sent encrypted
}

export class SellCryptoOrderRequest extends Request {
  seller_address: string
  order_amount: string // crypto amount in wei
  crypto: string
  fiat: string
  destination_ipfs_hash: string
}

/**************************************************
 * Environment
 *************************************************/

const {CLIENT_ID, CLIENT_SECRET, STAGE} = process.env

const isLive = STAGE === 'live'
const isTest = STAGE === 'test'

/**************************************************
 * Logging helpers
 *************************************************/

const loggingOn = !isTest

const log = (msg) => {
  if (loggingOn === true) { console.log(msg) }
}
const logError = (msg) => {
  if (loggingOn === true) { console.error(msg) }
}

/**************************************************
 * Decryption helpers
 *************************************************/

const privateKey = process.env.PRIVATE_KEY as string

/**
 * Given a Buffer of an Encrypted record, decrypt the content with the adapters
 * private key and return the contents as a string.
 *
 * @param buf Buffer to an EthCrypto Encrypted record
 * @return Buffer decrypted and converted to a string
 */
const decryptBuffer = (buf: Buffer): Promise<string> => {
  const encryptedRec: Encrypted = JSON.parse(buf.toString())
  return EthCrypto.decryptWithPrivateKey(
    privateKey,
    encryptedRec,
  )
}

/**************************************************
 * IPFS helpers
 *************************************************/

const ipfs = IPFS('ipfs.infura.io', '5001', {protocol: 'https'})

/**
 * Retrieve Buffer of content for a given IPFS hash
 *
 * @param hash IPFS content hash
 */
const ipfsGet = (hash): Buffer => ipfs.get(hash).then(
  (ipfsRsp) => ipfsRsp[0].content,
)

/**
 * Given an ipfs hash for an EthCrypto Encrypted record, fetch it and decrypt
 * it using the adapters key. Then return the contents as a string.
 * @param hash ipfs hash to Encrypted record
 * @return string of decrypted content
 */
const ipfsGetAndDecrypt = async (hash): Promise<string> => {
  const buf: Buffer = await ipfsGet(hash)
  return decryptBuffer(buf)
}

/**************************************************
 * Globals and State
 *************************************************/

const ONE_ETH_IN_WEI = new BigNumber('10e18')

// Store makers in memory for now - map of makerId to Maker
// TODO: persist it
const makers = {}

paypal.configure({
  mode: isLive === true ? 'live' : 'sandbox',
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
})

/**
 * Send a Paypal Payout to a given receiver.
 *
 * @param data {SendPayoutRequest} Details of receiver, amount, etc.
 */
const sendPayout = async (data: SendPayoutRequest) => {
  return new Promise((resolve, reject) => {
    if (!('amount' in data) || !('receiver' in data)) {
      return reject({ statusCode: 400, data: 'missing required parameters' })
    }

    const sender_batch_id = Math.random()
      .toString(36)
      .substring(9)

    const payoutItem = {
      sender_batch_header: {
        sender_batch_id,
        email_subject: data.email_subject || '',
        email_message: data.email_message || '',
      },
      items: [
        {
          recipient_type: data.recipient_type || 'EMAIL',
          amount: {
            value: data.amount,
            currency: data.currency || 'AUD',
          },
          receiver: data.receiver,
          note: data.note || '',
          sender_item_id: data.sender_item_id || '',
        },
      ],
    }

    paypal.payout.create(payoutItem, true, (error: any, payout: any) => {
      if (error) {
        return reject({ statusCode: error.httpStatusCode, data: error })
      }
      return resolve({ statusCode: payout.httpStatusCode, data: payout })
    })
  })
}

/**
 * Get details of a Paypal given a payout id.
 *
 * @param data {GetPayoutRequest} Record containing the payout id
 */
const getPayout = async (data: GetPayoutRequest) => {
  return new Promise((resolve, reject) => {
    if (!('payout_id' in data)) {
      return reject({ statusCode: 400, data: 'missing required parameters' })
    }

    const type = data.type || 'batch'
    let request
    switch (type.toLowerCase()) {
      case 'item':
        request = paypal.payoutItem
        break
      case 'batch':
        request = paypal.payout
        break
      default:
        return reject({ statusCode: 400, data: 'invalid method' })
    }

    request.get(data.payout_id, (error: any, payout: any) => {
      if (error) {
        return reject({ statusCode: error.httpStatusCode, data: error })
      }
      return resolve({ statusCode: payout.httpStatusCode, data: payout })
    })
  })
}

/**
 * Register a new maker / liquidity provider.
 *
 * @param data {NewMakerRequest} Record containing the makers details.
 */
const newMaker = async (data: NewMakerRequest) =>
  new Promise(async (resolve, reject) => {
    const apiCredsStr = await ipfsGetAndDecrypt(data.api_creds_ipfs_hash)
    const apiCreds = JSON.parse(apiCredsStr)

    const maker: Maker = {...data, api_creds: apiCreds}
    log(`Adding maker: ${JSON.stringify(maker, null, 2)}`)
    makers[maker.maker_id] = maker

    return resolve({ statusCode: 201, data: {maker_id: data.maker_id} })
  })

/**
 * Buy orders require 2 steps from the taker. This is the first step.
 * A taker registers to make a buy order with this call and a maker is selected.
 * After this call the taker will pay the maker over the paypal network and
 * then call the second function buyCryptoOrderPayed to finalise the order.
 *
 * @param data {BuyCryptoOrderRequest} Record containing details of the buy
 *             order
 */
const buyCryptoOrder = async (data: BuyCryptoOrderRequest) =>
  new Promise((resolve, reject) => {
    // pick the first Maker off the list
    // TODO: implement a queue and choose in rotation
    const makerId = Object.keys(makers)[0]
    const maker: Maker = makers[makerId]

    // TODO: check liquidity of selected maker to cover the order

    // TODO: grab the price from an aggregated feed
    // (poss this should be requested from the contract ...?)
    const price = '123.45'

    return resolve({
      statusCode: 201,
      data: {
        maker_id: maker.maker_id,
        destination: maker.destination,
        price,
      },
    })
  })

/**
 * Buy orders require 2 steps from the taker. This is the second step.
 * After a taker has payed a selected maker the fiat over the Paypal network,
 * this function will be called to check the payment and return if the payment
 * is seen. The smart contract will release the crypto if it is.
 *
 * @param data {BuyCryptoOrderPayedRequest} Record containing the payout_id of
 *             the fiat payment.
 */
const buyCryptoOrderPayed = async (data: BuyCryptoOrderPayedRequest) => {
  return new Promise(async (resolve, reject) => {
    // the maker pre selected to fill the order
    const maker: Maker = makers[data.maker_id]

    // TODO: verify the payout_id and payment amount
    // data.payout_id

    // TODO: set only if payment verified
    const result = true

    return resolve({
      statusCode: 200,
      data: {
        result,
        order_id: data.order_id,
      },
    })
  })
}

/**
 * Executes the fiat part of a Sell crypto order. A seller transfers their
 * crypto to the FiatGateway smart contract. Then ChainLink calls this function
 * to select a Maker and transfer the fiat to the sellers Paypal account. The
 * result is returned to the smart contract. If success the crypto is sent to
 * the Maker.
 *
 * @param data {SellCryptoOrderRequest} Record containing the sell details
 */
const sellCryptoOrder = (data: SellCryptoOrderRequest) =>
  new Promise(async (resolve, reject) => {
    // pick the first Maker off the list
    // TODO: implement a queue and choose in rotation
    const makerId = Object.keys(makers)[0]
    const maker: Maker = makers[makerId]

    // decrypt the takers paypal destination
    const destination = await ipfsGetAndDecrypt(data.destination_ipfs_hash)
    log(`taker destination decrypted: ${destination}`)

    // TODO: grab the price from an aggregated feed and have it passed in
    // so it's transparent on chain
    const price = new BigNumber('267.19')

    // Calculate the fiat amount
    const cryptoAmount: BigNumber =
      new BigNumber(data.order_amount).div(ONE_ETH_IN_WEI)
    const fiatAmount: BigNumber = cryptoAmount.times(price)

    // Payout to the seller
    const sendPayoutRequest = ({
      method: 'sendPayout',
      amount: fiatAmount.toString(),
      currency: data.fiat,
      receiver: data.destination_ipfs_hash,
    } as SendPayoutRequest)

    const rsp: any = await sendPayout(sendPayoutRequest)

    if (rsp.statusCode === 201) {
      log(`sellCryptoOrder: payout succeeded with id: ${rsp.data.result}`)
      return resolve({
        statusCode: 201,
        data: {
          maker_id: makerId,
        },
      })
    } else {
      logError(
        `sellCryptoOrder: payout failed with error: ` +
        `${JSON.stringify(rsp.data)} and status code: ${rsp.statusCode}`,
      )
      return reject({
        statusCode: rsp.statusCode,
        data: {
          // how does the node convert this ..?
          maker_id: undefined,
        },
      })
    }
  })

const createRequest = async (input: JobRequest) => {
  log(`input: ${JSON.stringify(input, null, 2)}`)

  return new Promise((resolve, reject) => {
    const data = input.data
    const method = data.method || ''

    const handlePayoutResponse = (response: any) => {
      log(
      `${method} response: ${JSON.stringify(response, null, 2)}`,
        )
      response.data.result =
        response.data.batch_header.payout_batch_id || ''
      return resolve(response)
    }

    const handleResponse = (response: any) => {
      log(
      `${method} response: ${JSON.stringify(response, null, 2)}`,
        )
      return resolve(response)
    }

    switch (method.toLowerCase()) {
      case 'sendpayout':
        sendPayout(data as SendPayoutRequest)
          .then(handlePayoutResponse)
          .catch(reject)
        break

      case 'getpayout':
        getPayout(data as GetPayoutRequest)
          .then(handlePayoutResponse)
          .catch(reject)
        break

      case 'newmaker':
        newMaker(data as NewMakerRequest)
          .then(handleResponse)
          .catch(reject)
        break

      case 'buycryptoorder':
        buyCryptoOrder(data as BuyCryptoOrderRequest)
          .then(handleResponse)
          .catch(reject)
        break

      case 'sellcryptoorder':
        sellCryptoOrder(data as SellCryptoOrderRequest)
          .then(handleResponse)
          .catch(reject)
        break

      default:
        return reject({ statusCode: 400, data: 'Invalid method' })
    }
  })
}

const requestWrapper = async (req: JobRequest): Promise<Response> => {
  return new Promise<Response>((resolve) => {
    const response = { jobRunID: req.id || '' } as Response
    createRequest(req)
      .then(({ statusCode, data }) => {
        response.status = 'success'
        response.data = data
        response.statusCode = statusCode
        resolve(response)
      })
      .catch((err) => {
        logError(err)
        if (err.stack) {
          logError(`stack: ${err.stack}`)
        }

        const { statusCode, data } = err
        response.status = 'errored'
        response.error = data
        response.statusCode = statusCode

        resolve(response)
      })
  })
}

// createRequest() wrapper for GCP
const gcpservice = async (req: any = {}, res: any): Promise<any> => {
  const response = await requestWrapper(req.body as JobRequest)
  res.status(response.statusCode).send(response)
}

// createRequest() wrapper for AWS Lambda
const handler = async (
  event: JobRequest,
  context: any = {},
  callback: (error: any, result: any) => void,
): Promise<any> => {
  callback(null, await requestWrapper(event))
}

export {handler, gcpservice, requestWrapper, createRequest}
