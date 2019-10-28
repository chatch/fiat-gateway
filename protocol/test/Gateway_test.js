// eslint-disable-next-line @typescript-eslint/no-var-requires
const h = require('chainlink').helpers
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {expectRevert, time} = require('openzeppelin-test-helpers')

const BN = web3.utils.BN

// const GatewayJSON = require('../build/contracts/Gateway.json')
// const LinkTokenJSON = require('../build/contracts/LinkToken.json')
// const OracleJSON = require('../build/contracts/Oracle.json')

const PAYPAL_RECEIVER = 'sb-mtemn430137@personal.example.com'
const PRICE_ADJUSTER = new BN('10').pow(new BN('10'))

const priceEthAud = new BN('238.61').mul(PRICE_ADJUSTER)

/**
 * Construct a web3 contract handler for a deployed contract.
 */
// const contractHandle = (web3, contractJSON, address) => {
//   const contractInstance = new web3.eth.Contract(
//     contractJSON.abi,
//     address,
//     {
//       from: web3.eth.defaultAccount
//     }
//   )

//   if (contractJSON.bytecode) {
//     contractInstance.options.data = contractJSON.bytecode
//   }

//   return contractInstance
// }

contract('Gateway', accounts => {
  const LinkToken = artifacts.require('LinkToken.sol')
  const Oracle = artifacts.require('Oracle.sol')
  const Gateway = artifacts.require('Gateway.sol')

  const defaultAccount = accounts[0]
  const nodeAddr = accounts[1] // chainlink node
  const makerAddr = accounts[2]
  const buyerAddr = accounts[3]
  const sellerAddr = accounts[4]

  const jobIdStr1 = '4c7b7ffb66b344fbaa64995af81e355a'
  const jobIdStr2 = 'c9ff45d9c0724505a79d6c8df8611b79'
  const jobIdStr3 = '3dabbd2a14604aef8719fa8762542137'

  const jobIdHex1 = web3.utils.toHex(jobIdStr1)
  const jobIdHex2 = web3.utils.toHex(jobIdStr2)
  const jobIdHex3 = web3.utils.toHex(jobIdStr3)

  // Represents 1 LINK for testnet requests
  const payment = web3.utils.toWei('1')

  let link, oracle, gate
  let linkAddr, oracleAddr, gateAddr

  beforeEach(async () => {
    web3.eth.defaultAccount = defaultAccount

    // link = contractHandle(web3, LinkTokenJSON, LinkToken.address)
    // oracle = contractHandle(web3, OracleJSON, Oracle.address)
    // gate = contractHandle(web3, GatewayJSON, Gateway.address)

    link = await LinkToken.new()
    oracle = await Oracle.new(link.address, {from: defaultAccount})
    gate = await Gateway.new(link.address, {from: defaultAccount})

    linkAddr = link.address
    oracleAddr = oracle.address
    gateAddr = gate.address

    // Gives the chainlink node permission to fulfill requests in the Oracle
    await oracle.setFulfillmentPermission(nodeAddr, true, {
      from: defaultAccount,
    })
  })

  describe.only('#addFiatPaymentMethod', () => {
    it('success', async () => {
      const paymentMethodName = 'WeChat'

      const tx = await gate.addFiatPaymentMethod(
        paymentMethodName,
        oracle.address,
        jobIdHex1,
        jobIdHex2,
        jobIdHex3,
        {
          from: defaultAccount,
        }
      )

      const methodIdx = tx.logs[0].args.methodIdx
      const methodRec = await gate.fiatPaymentMethods.call(methodIdx)

      assert.equal(methodRec.displayName, paymentMethodName, 'method name')
      assert.equal(methodRec.oracleAddr, oracleAddr, 'method oracleAddr')
      assert.equal(methodRec.newMakerJobId, jobIdHex1, 'method newMakerJobId')
      assert.equal(methodRec.buyCryptoOrderJobId, jobIdHex2, 'method buyCryptoOrderJobId')
      assert.equal(methodRec.buyCryptoOrderPayedJobId, jobIdHex3, 'method buyCryptoOrderPayedJobId')
    })
  })

  describe('#makerRegister', () => {
    it('success', async () => {

      /// @param _fiatPaymentMethodIdx Index into fiatPaymentMethods
      /// @param _crypto ERC20 address or ETH_ADDRESS of crypto token
      /// @param _fiat ISO 4217 currency code
      /// @param _destination Payment destination on the fiatPaymentMethod network
      /// @param _ipfsHash Hash of file on ipfs holding encrypted API
      ///                  credentials for this maker

      const tx = await gate.makerRegister(nodeAddr, jobIdHex1, {
        from: makerAddr,
      })
      const makerId = tx.logs[0].args.makerId

      const makerRec = await gate.makers.call(makerId)
      console.log(makerRec)

      assert.equal(makerRec.ethAddr, makerAddr, 'maker should be admin')
      assert.equal(makerRec.oracleAddr, nodeAddr, 'maker oracleAddr')
      assert.equal(web3.utils.hexToString(makerRec.jobId), jobIdStr, 'maker jobId')
      assert.isTrue(makerRec.active, 'maker active')
    })
  })

  describe('#makerBuyCryptoOfferCreate', () => {
    it('success', async () => {
      // register maker
      const tx1 = await gate.makerRegister(nodeAddr, jobIdHex1, {
        from: makerAddr,
      })
      const makerId = tx1.logs[0].args.makerId

      // create an offer
      const tx2 = await gate.makerBuyCryptoOfferCreate(priceEthAud, {
        from: makerAddr,
      })
      const offerId = tx2.logs[0].args.offerId
      console.log(offerId)

      // assert.equal(makerRec.ethAddr, maker, 'maker should be admin')
      // assert.equal(makerRec.oracleAddr, oracleAddr, 'maker oracleAddr')
      // assert.equal(web3.utils.hexToString(makerRec.jobId), jobIdStr, 'maker jobId')
      // assert.isTrue(makerRec.active, 'maker active')
    })
  })

  describe('#sellCrypto', () => {
    it('success', async () => {
      // register maker
      const tx1 = await gate.makerRegister(nodeAddr, jobIdHex1, {
        from: makerAddr,
      })
      const makerId = tx1.logs[0].args.makerId

      // create an offer
      const tx2 = await gate.makerBuyCryptoOfferCreate(priceEthAud, {
        from: makerAddr,
      })
      const offerId = tx2.logs[0].args.offerId
      console.log(offerId)

      // sell
      const ethAmount = new BN(1)
      const tx3 = await gate.sellCrypto(
        makerId,
        offerId,
        ethAmount,
        PAYPAL_RECEIVER,
        {
          from: sellerAddr
        }
      )

      console.log(JSON.stringify(tx3, null, 2))
    })
  })

  // describe('#placeOrder', () => {
  //   context('with LINK', () => {
  //     let request

  //     beforeEach(async () => {
  //       await link.transfer(gate.address, web3.utils.toWei('1', 'ether'))
  //     })

  //     context('sending a request to a specific oracle contract address', () => {
  //       it('triggers a log event in the new Oracle contract', async () => {
  //         const tx = await gate.createRequestTo(
  //           oracle.address,
  //           jobIdHex,
  //           payment,
  //           url,
  //           path,
  //           times,
  //           { from: seller },
  //         )
  //         request = h.decodeRunRequest(tx.receipt.rawLogs[3])
  //         assert.equal(oracle.address, tx.receipt.rawLogs[3].address)
  //         assert.equal(
  //           request.topic,
  //           web3.utils.keccak256(
  //             'OracleRequest(bytes32,address,bytes32,uint256,address,bytes4,uint256,uint256,bytes)',
  //           ),
  //         )
  //       })
  //     })
  //   })
  // })

  // describe('#fulfill', () => {
  //   const expected = 50000
  //   const response = web3.utils.toHex(expected)
  //   let request

  //   beforeEach(async () => {
  //     await link.transfer(gate.address, web3.utils.toWei('1', 'ether'))
  //     const tx = await gate.createRequestTo(
  //       oracle.address,
  //       jobIdHex,
  //       payment,
  //       url,
  //       path,
  //       times,
  //       { from: seller },
  //     )
  //     request = h.decodeRunRequest(tx.receipt.rawLogs[3])
  //     await h.fulfillOracleRequest(oracle, request, response, { from: oracleAddr })
  //   })

  //   it('records the data given to it by the oracle', async () => {
  //     const currentPrice = await gate.data.call()
  //     assert.equal(
  //       web3.utils.toHex(currentPrice),
  //       web3.utils.padRight(expected, 64),
  //     )
  //   })

  //   context('when my contract does not recognize the request ID', () => {
  //     const otherId = web3.utils.toHex('otherId')

  //     beforeEach(async () => {
  //       request.id = otherId
  //     })

  //     it('does not accept the data provided', async () => {
  //       await expectRevert.unspecified(
  //         h.fulfillOracleRequest(oracle, request, response, {
  //           from: oracleAddr,
  //         }),
  //       )
  //     })
  //   })

  //   context('when called by anyone other than the oracle contract', () => {
  //     it('does not accept the data provided', async () => {
  //       await expectRevert.unspecified(
  //         gate.fulfill(request.id, response, { from: maker }),
  //       )
  //     })
  //   })
  // })

  describe('#withdrawLink', () => {
    beforeEach(async () => {
      await link.transfer(gate.address, web3.utils.toWei('1', 'ether'))
    })

    context('when called by a non-owner', () => {
      it('cannot withdraw', async () => {
        await expectRevert.unspecified(gate.withdrawLink({from: makerAddr}))
      })
    })

    context('when called by the owner', () => {
      it('transfers LINK to the owner', async () => {
        const beforeBalance = await link.balanceOf(sellerAddr)
        assert.equal(beforeBalance, '0')
        await gate.withdrawLink({from: sellerAddr})
        const afterBalance = await link.balanceOf(sellerAddr)
        assert.equal(afterBalance, web3.utils.toWei('1', 'ether'))
      })
    })
  })
})
