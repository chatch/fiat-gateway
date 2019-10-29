const Gateway = artifacts.require('Gateway')
const Oracle = artifacts.require('Oracle')
const LinkToken = artifacts.require('LinkToken')

// const LinkTokenJSON = require('../abi/LinkTokenv4.json')

// const contractHandle = (web3, contractJSON) => {
//   const contractInstance = new web3.eth.Contract(contractJSON.abi)
//   if (contractJSON.bytecode) {
//     contractInstance.options.data = contractJSON.bytecode
//   }
//   return contractInstance
// }

module.exports = async (deployer, network) => {
  if (network.startsWith('live')) {
    // For live networks, use the 0 address to allow the ChainlinkRegistry
    // contract automatically retrieve the correct address for you
    deployer.deploy(Gateway, '0x0000000000000000000000000000000000000000')

  } else if (network.startsWith('ropsten')) {
    const ropstenLINK = '0x20fe562d797a42dcb3399062ae9546cd06f63280'
    return deployer.deploy(Oracle, ropstenLINK).then(() =>
      deployer.deploy(Gateway, ropstenLINK)
    )

  } else {
    // Local (development) networks need their own deployment of the LINK
    // token and the Oracle contract

    // Previously deploying manually as a v4 / v5 workaround but don't need
    // this with a hack in the development contract in place for now ...

    // console.log(`Deploying LinkToken manually ...`)
    // const accounts = await web3.eth.getAccounts()
    // const LinkToken = contractHandle(web3, LinkTokenJSON)
    // const link = await LinkToken.deploy().send({from: accounts[0], gas: 2000000})
    // const linkAddr = link.options.address
    // console.log(`Deployed to ${linkAddr}`)

    return deployer.deploy(LinkToken).then(link => {
      return deployer.deploy(Oracle, link.address).then(() =>
        deployer.deploy(Gateway, link.address)
      )
    })
  }
}
