// eslint-disable-next-line @typescript-eslint/no-var-requires
const h = require('chainlink').helpers
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { expectRevert, time } = require('openzeppelin-test-helpers')

const PAYPAL_RECEIVER = 'sb-mtemn430137@personal.example.com'
const BN = web3.utils.BN;
const PRICE_ADJUSTER = new BN('10').pow(new BN('10'))

const priceEthAud = new BN('238.61').mul(PRICE_ADJUSTER)

contract('Gateway', accounts => {
  const LinkToken = artifacts.require('LinkToken.sol')
  const Oracle = artifacts.require('Oracle.sol')
  const Gateway = artifacts.require('Gateway.sol')

  const defaultAccount = accounts[0]
  const oracleAddr = accounts[1]
  const dealer = accounts[2]
  const seller = accounts[3]

  const jobIdStr = '4c7b7ffb66b344fbaa64995af81e355a'
  const jobIdHex = web3.utils.toHex(jobIdStr)

  // Represents 1 LINK for testnet requests
  const payment = web3.utils.toWei('1')

  let link, oracle, gate

  beforeEach(async () => {
    link = await LinkToken.new()
    oracle = await Oracle.new(link.address, { from: defaultAccount })
    gate = await Gateway.new(link.address, { from: seller })
    await oracle.setFulfillmentPermission(oracleAddr, true, {
      from: defaultAccount,
    })
  })

  describe('#dealerRegister', () => {
    it('success', async () => {
      const tx = await gate.dealerRegister(oracleAddr, jobIdHex, {
        from: dealer,
      })
      const dealerId = tx.logs[0].args.dealerId

      const dealerRec = await gate.dealers.call(dealerId)
      console.log(dealerRec)

      assert.equal(dealerRec.adminAddr, dealer, 'dealer should be admin')
      assert.equal(dealerRec.oracleAddr, oracleAddr, 'dealer oracleAddr')
      assert.equal(web3.utils.hexToString(dealerRec.jobId), jobIdStr, 'dealer jobId')
      assert.isTrue(dealerRec.active, 'dealer active')
    })
  })

  describe('#dealerBuyCryptoOfferCreate', () => {
    it('success', async () => {
      // register dealer
      const tx1 = await gate.dealerRegister(oracleAddr, jobIdHex, {
        from: dealer,
      })
      const dealerId = tx1.logs[0].args.dealerId

      // create an offer
      const tx2 = await gate.dealerBuyCryptoOfferCreate(priceEthAud, {
        from: dealer,
      })
      const offerId = tx2.logs[0].args.offerId
      console.log(offerId)

      // assert.equal(dealerRec.adminAddr, dealer, 'dealer should be admin')
      // assert.equal(dealerRec.oracleAddr, oracleAddr, 'dealer oracleAddr')
      // assert.equal(web3.utils.hexToString(dealerRec.jobId), jobIdStr, 'dealer jobId')
      // assert.isTrue(dealerRec.active, 'dealer active')
    })
  })

  describe.only('#sellCrypto', () => {
    it('success', async () => {
      // register dealer
      const tx1 = await gate.dealerRegister(oracleAddr, jobIdHex, {
        from: dealer,
      })
      const dealerId = tx1.logs[0].args.dealerId

      // create an offer
      const tx2 = await gate.dealerBuyCryptoOfferCreate(priceEthAud, {
        from: dealer,
      })
      const offerId = tx2.logs[0].args.offerId
      console.log(offerId)

      // sell
      const ethAmount = new BN(1)
      const tx3 = await gate.sellCrypto(
        dealerId,
        offerId,
        ethAmount,
        PAYPAL_RECEIVER,
        {
          from: seller
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
  //         gate.fulfill(request.id, response, { from: dealer }),
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
        await expectRevert.unspecified(gate.withdrawLink({ from: dealer }))
      })
    })

    context('when called by the owner', () => {
      it('transfers LINK to the owner', async () => {
        const beforeBalance = await link.balanceOf(seller)
        assert.equal(beforeBalance, '0')
        await gate.withdrawLink({ from: seller })
        const afterBalance = await link.balanceOf(seller)
        assert.equal(afterBalance, web3.utils.toWei('1', 'ether'))
      })
    })
  })
})
