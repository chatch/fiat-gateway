import EthCrypto, { Encrypted } from 'eth-crypto'
import IPFS from 'ipfs-http-client'
import * as paypal from 'paypal-rest-sdk'

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
  fiat_currency: string
  token: string
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
  fiat_currency: string
  token: string
}

export class BuyCryptoOrderPayedRequest extends Request {
  order_id: string
  maker_id: string
  price: string
  buyer_address: string
  payout_id: string // TODO: should be sent encrypted
}

const {CLIENT_ID, CLIENT_SECRET, STAGE} = process.env

// Store makers in memory for now - map of makerId to Maker
// TODO: persist it
const makers = {}

paypal.configure({
  mode: STAGE === 'live' ? 'live' : 'sandbox',
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
})

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
            currency: data.currency || 'USD',
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

const newMaker = async (data: NewMakerRequest) => {
  return new Promise(async (resolve, reject) => {
    const ipfs = IPFS('ipfs.infura.io', '5001', {protocol: 'https'})
    const ipfsRsp = await ipfs.get(data.api_creds_ipfs_hash)
    const apiCredsBuf = ipfsRsp[0].content
    const apiCredsEncrypted = JSON.parse(apiCredsBuf.toString())
    console.log(`got encrypted creds: ${JSON.stringify(apiCredsEncrypted)}`)

    // const encryptedStr = EthCrypto.cipher.stringify(apiCredsEncrypted)
    const privateKey = process.env.PRIVATE_KEY as string
    const apiCredsStr = await EthCrypto.decryptWithPrivateKey(
      privateKey,
      apiCredsEncrypted,
    )
    const apiCreds = JSON.parse(apiCredsStr)

    const maker: Maker = {...data, api_creds: apiCreds}
    console.log(`Adding maker: ${JSON.stringify(maker, null, 2)}`)
    makers[maker.maker_id] = maker

    return resolve({ statusCode: 201, data: {makerId: data.maker_id} })
  })
}

const buyCryptoOrder = async (data: BuyCryptoOrderRequest) => {
  return new Promise((resolve, reject) => {
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
}

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

const createRequest = async (input: JobRequest) => {
  console.log(`input: ${JSON.stringify(input, null, 2)}`)

  return new Promise((resolve, reject) => {
    const data = input.data
    const method = data.method || ''

    const handlePayoutResponse = (response: any) => {
      console.log(
      `${method} response: ${JSON.stringify(response, null, 2)}`,
        )
      response.data.result =
        response.data.batch_header.payout_batch_id || ''
      return resolve(response)
    }

    const handleResponse = (response: any) => {
      console.log(
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
        console.error(`createRequest failure: ${err.message}`)
        console.error(`stack: ${err.stack}`)

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
