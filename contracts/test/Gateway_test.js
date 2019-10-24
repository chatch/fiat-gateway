// eslint-disable-next-line @typescript-eslint/no-var-requires
const h = require('chainlink').helpers
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { expectRevert, time } = require('openzeppelin-test-helpers')

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

  const url =
    'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,EUR,JPY'
  const path = 'USD'
  const times = 100

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


  describe.only('#dealerRegister', () => {
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

  // describe('#createRequest', () => {
  //   context('without LINK', () => {
  //     it('reverts', async () => {
  //       await expectRevert.unspecified(
  //         gate.createRequestTo(oracle.address, jobIdHex, payment, url, path, times, {
  //           from: seller,
  //         }),
  //       )
  //     })
  //   })

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

  // describe('#cancelRequest', () => {
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
  //   })

  //   context('before the expiration time', () => {
  //     it('cannot cancel a request', async () => {
  //       await expectRevert(
  //         gate.cancelRequest(
  //           request.id,
  //           request.payment,
  //           request.callbackFunc,
  //           request.expiration,
  //           { from: seller },
  //         ),
  //         'Request is not expired',
  //       )
  //     })
  //   })

  //   context('after the expiration time', () => {
  //     beforeEach(async () => {
  //       await time.increase(300)
  //     })

  //     context('when called by a non-owner', () => {
  //       it('cannot cancel a request', async () => {
  //         await expectRevert.unspecified(
  //           gate.cancelRequest(
  //             request.id,
  //             request.payment,
  //             request.callbackFunc,
  //             request.expiration,
  //             { from: dealer },
  //           ),
  //         )
  //       })
  //     })

  //     context('when called by an owner', () => {
  //       it('can cancel a request', async () => {
  //         await gate.cancelRequest(
  //           request.id,
  //           request.payment,
  //           request.callbackFunc,
  //           request.expiration,
  //           { from: seller },
  //         )
  //       })
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
