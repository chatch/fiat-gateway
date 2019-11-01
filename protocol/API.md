* [Gateway](#gateway)
  * [ChainlinkCancelled](#event-chainlinkcancelled)
  * [ChainlinkFulfilled](#event-chainlinkfulfilled)
  * [ChainlinkRequested](#event-chainlinkrequested)
  * [LogGatewayBuyCryptoOrderCreated](#event-loggatewaybuycryptoordercreated)
  * [LogGatewayFiatPaymentMethodAdded](#event-loggatewayfiatpaymentmethodadded)
  * [LogGatewayMakerRegister](#event-loggatewaymakerregister)
  * [LogGatewayMakerRegisterFulfilled](#event-loggatewaymakerregisterfulfilled)
  * [LogGatewaySellCryptoCompleted](#event-loggatewaysellcryptocompleted)
  * [LogGatewaySellCryptoOrder](#event-loggatewaysellcryptoorder)
  * [OwnershipTransferred](#event-ownershiptransferred)
  * [ETH_ADDRESS](#function-eth_address)
  * [addFiatPaymentMethod](#function-addfiatpaymentmethod)
  * [buyCryptoOrderCreate](#function-buycryptoordercreate)
  * [buyOrders](#function-buyorders)
  * [cancelRequest](#function-cancelrequest)
  * [escrows](#function-escrows)
  * [fiatPaymentMethods](#function-fiatpaymentmethods)
  * [fulfillBuyCryptoOrder](#function-fulfillbuycryptoorder)
  * [fulfillMakerRegister](#function-fulfillmakerregister)
  * [fulfillSellCryptoOrder](#function-fulfillsellcryptoorder)
  * [getChainlinkToken](#function-getchainlinktoken)
  * [isOwner](#function-isowner)
  * [makerRegister](#function-makerregister)
  * [makers](#function-makers)
  * [owner](#function-owner)
  * [sellCryptoOrder](#function-sellcryptoorder)
  * [sellOrders](#function-sellorders)
  * [transferOwnership](#function-transferownership)
  * [withdrawLink](#function-withdrawlink)
* [Chainlink](#chainlink)
* [ChainlinkClient](#chainlinkclient)
  * [ChainlinkCancelled](#event-chainlinkcancelled)
  * [ChainlinkFulfilled](#event-chainlinkfulfilled)
  * [ChainlinkRequested](#event-chainlinkrequested)
* [ChainlinkRequestInterface](#chainlinkrequestinterface)
  * [cancelOracleRequest](#function-canceloraclerequest)
  * [oracleRequest](#function-oraclerequest)
* [ENSInterface](#ensinterface)
  * [NewOwner](#event-newowner)
  * [NewResolver](#event-newresolver)
  * [NewTTL](#event-newttl)
  * [Transfer](#event-transfer)
  * [owner](#function-owner)
  * [resolver](#function-resolver)
  * [setOwner](#function-setowner)
  * [setResolver](#function-setresolver)
  * [setSubnodeOwner](#function-setsubnodeowner)
  * [setTTL](#function-setttl)
  * [ttl](#function-ttl)
* [LinkTokenInterface](#linktokeninterface)
  * [allowance](#function-allowance)
  * [approve](#function-approve)
  * [balanceOf](#function-balanceof)
  * [decimals](#function-decimals)
  * [decreaseApproval](#function-decreaseapproval)
  * [increaseApproval](#function-increaseapproval)
  * [name](#function-name)
  * [symbol](#function-symbol)
  * [totalSupply](#function-totalsupply)
  * [transfer](#function-transfer)
  * [transferAndCall](#function-transferandcall)
  * [transferFrom](#function-transferfrom)
* [PointerInterface](#pointerinterface)
  * [getAddress](#function-getaddress)
* [Buffer](#buffer)
* [CBOR](#cbor)
* [ENSResolver](#ensresolver)
  * [addr](#function-addr)
* [Ownable](#ownable)
  * [OwnershipTransferred](#event-ownershiptransferred)
  * [isOwner](#function-isowner)
  * [owner](#function-owner)
  * [transferOwnership](#function-transferownership)
* [SafeMath](#safemath)

# Gateway


## *event* ChainlinkCancelled

Gateway.ChainlinkCancelled(id) `e1fe3afa`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | id | indexed |

## *event* ChainlinkFulfilled

Gateway.ChainlinkFulfilled(id) `7cc135e0`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | id | indexed |

## *event* ChainlinkRequested

Gateway.ChainlinkRequested(id) `b5e6e01e`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | id | indexed |

## *event* LogGatewayBuyCryptoOrderCreated

Gateway.LogGatewayBuyCryptoOrderCreated(taker, orderId, crypto, fiat, fiatPaymentMethodIdx, amount) `75bf5061`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | taker | indexed |
| *bytes32* | orderId | indexed |
| *address* | crypto | not indexed |
| *string* | fiat | not indexed |
| *uint256* | fiatPaymentMethodIdx | not indexed |
| *uint256* | amount | not indexed |

## *event* LogGatewayFiatPaymentMethodAdded

Gateway.LogGatewayFiatPaymentMethodAdded(methodIdx, name, oracle) `0271b694`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | methodIdx | indexed |
| *string* | name | indexed |
| *address* | oracle | indexed |

## *event* LogGatewayMakerRegister

Gateway.LogGatewayMakerRegister(makerId, makerAddr, crypto, fiat) `6098c068`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | makerId | indexed |
| *address* | makerAddr | indexed |
| *address* | crypto | not indexed |
| *string* | fiat | not indexed |

## *event* LogGatewayMakerRegisterFulfilled

Gateway.LogGatewayMakerRegisterFulfilled(makerId, activated) `c4618143`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | makerId | indexed |
| *bool* | activated | not indexed |

## *event* LogGatewaySellCryptoCompleted

Gateway.LogGatewaySellCryptoCompleted(orderId, result) `2dabdde4`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | orderId | indexed |
| *bool* | result | not indexed |

## *event* LogGatewaySellCryptoOrder

Gateway.LogGatewaySellCryptoOrder(orderId, seller, crypto, fiat, fiatPaymentMethodIdx, amount) `b7c51f76`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | orderId | indexed |
| *address* | seller | indexed |
| *address* | crypto | not indexed |
| *string* | fiat | not indexed |
| *uint256* | fiatPaymentMethodIdx | not indexed |
| *uint256* | amount | not indexed |

## *event* OwnershipTransferred

Gateway.OwnershipTransferred(previousOwner, newOwner) `8be0079c`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | previousOwner | indexed |
| *address* | newOwner | indexed |


## *function* ETH_ADDRESS

Gateway.ETH_ADDRESS() `view` `a734f06e`





## *function* addFiatPaymentMethod

Gateway.addFiatPaymentMethod(_displayName, _oracleAddr, _newMakerJobId, _buyCryptoOrderJobId, _buyCryptoOrderPayedJobId, _sellCryptoOrderJobId) `nonpayable` `8139082d`

**Add a fiat payment method to the gateway.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *string* | _displayName | A display name. eg. 'WeChat Pay' |
| *address* | _oracleAddr | Address of oracle with bridge to gateway |
| *string* | _newMakerJobId | New maker job |
| *string* | _buyCryptoOrderJobId | buyCryptoOrder job |
| *string* | _buyCryptoOrderPayedJobId | buyCryptoOrderPayed job |
| *string* | _sellCryptoOrderJobId | sellCryptoOrder job |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | methodIdx | undefined |

## *function* buyCryptoOrderCreate

Gateway.buyCryptoOrderCreate(_crypto, _fiat, _amount, _fiatPaymentMethodIdx) `nonpayable` `8f52fe29`

**Taker places an order for a pair**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _crypto | ERC20 address or ETH_ADDRESS of crypto token |
| *string* | _fiat | ISO 4217 currency code |
| *uint256* | _amount | Amount of crypto to buy (in wei if ETH or in decimals()                for an ERC20 token) |
| *uint256* | _fiatPaymentMethodIdx | Index into fiatPaymentMethods |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | orderId | undefined |

## *function* buyOrders

Gateway.buyOrders() `view` `041d40c1`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* |  | undefined |


## *function* cancelRequest

Gateway.cancelRequest(_requestId, _payment, _callbackFunctionId, _expiration) `nonpayable` `ec65d0f8`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | _requestId | undefined |
| *uint256* | _payment | undefined |
| *bytes4* | _callbackFunctionId | undefined |
| *uint256* | _expiration | undefined |


## *function* escrows

Gateway.escrows() `view` `477230b2`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* |  | undefined |


## *function* fiatPaymentMethods

Gateway.fiatPaymentMethods() `view` `261721e3`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* |  | undefined |


## *function* fulfillBuyCryptoOrder

Gateway.fulfillBuyCryptoOrder(_requestId, _orderId) `nonpayable` `79d31888`

**Called by the Oracle when buyCryptoOrder has been fulfilled.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | _requestId | Chainlink request id to verify |
| *bytes32* | _orderId | Buy order id or 0x0 on failure |


## *function* fulfillMakerRegister

Gateway.fulfillMakerRegister(_requestId, _makerId) `nonpayable` `9da75481`

**Called by the Oracle when newMaker has been fulfilled.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | _requestId | Chainlink request id to verify |
| *bytes32* | _makerId | Id of the maker. |


## *function* fulfillSellCryptoOrder

Gateway.fulfillSellCryptoOrder(_requestId, _makerId) `nonpayable` `e67c2598`

**Called by the Oracle when sellCryptoOrder has been fulfilled.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | _requestId | Chainlink request id to verify |
| *bytes32* | _makerId | Maker who filled the order or 0 if failed |


## *function* getChainlinkToken

Gateway.getChainlinkToken() `view` `165d35e1`





## *function* isOwner

Gateway.isOwner() `view` `8f32d59b`

> Returns true if the caller is the current owner.




## *function* makerRegister

Gateway.makerRegister(_fiatPaymentMethodIdx, _crypto, _fiat, _destination, _ipfsHash) `nonpayable` `15e1723c`

**Maker registers to provide liquidity for a pair and fiat payment method.**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *uint256* | _fiatPaymentMethodIdx | Index into fiatPaymentMethods |
| *address* | _crypto | ERC20 address or ETH_ADDRESS of crypto token |
| *string* | _fiat | ISO 4217 currency code |
| *string* | _destination | Payment destination on the fiatPaymentMethod network |
| *string* | _ipfsHash | Hash of file on ipfs holding encrypted API                  credentials for this maker |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | makerId | undefined |

## *function* makers

Gateway.makers() `view` `32c01469`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* |  | undefined |


## *function* owner

Gateway.owner() `view` `8da5cb5b`

> Returns the address of the current owner.




## *function* sellCryptoOrder

Gateway.sellCryptoOrder(_crypto, _fiat, _fiatPaymentMethodIdx, _destinationIpfsHash) `payable` `c5ddcd3c`

**Taker places an order to sell crypto for fiat**


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | _crypto | ERC20 address or ETH_ADDRESS of crypto token |
| *string* | _fiat | ISO 4217 currency code |
| *uint256* | _fiatPaymentMethodIdx | Index into fiatPaymentMethods |
| *string* | _destinationIpfsHash | Hash of file on ipfs with encrypted destination         Encrypted with the external adapters ethcrypto key |

Outputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | orderId | undefined |

## *function* sellOrders

Gateway.sellOrders() `view` `efe6bfa3`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* |  | undefined |


## *function* transferOwnership

Gateway.transferOwnership(newOwner) `nonpayable` `f2fde38b`

> Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | newOwner | undefined |


## *function* withdrawLink

Gateway.withdrawLink() `nonpayable` `8dc654a2`





---
# Chainlink


---
# ChainlinkClient

## *event* ChainlinkCancelled

ChainlinkClient.ChainlinkCancelled(id) `e1fe3afa`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | id | indexed |

## *event* ChainlinkFulfilled

ChainlinkClient.ChainlinkFulfilled(id) `7cc135e0`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | id | indexed |

## *event* ChainlinkRequested

ChainlinkClient.ChainlinkRequested(id) `b5e6e01e`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | id | indexed |


---
# ChainlinkRequestInterface


## *function* cancelOracleRequest

ChainlinkRequestInterface.cancelOracleRequest(requestId, payment, callbackFunctionId, expiration) `nonpayable` `6ee4d553`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | requestId | undefined |
| *uint256* | payment | undefined |
| *bytes4* | callbackFunctionId | undefined |
| *uint256* | expiration | undefined |


## *function* oracleRequest

ChainlinkRequestInterface.oracleRequest(sender, requestPrice, serviceAgreementID, callbackAddress, callbackFunctionId, nonce, dataVersion, data) `nonpayable` `40429946`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | sender | undefined |
| *uint256* | requestPrice | undefined |
| *bytes32* | serviceAgreementID | undefined |
| *address* | callbackAddress | undefined |
| *bytes4* | callbackFunctionId | undefined |
| *uint256* | nonce | undefined |
| *uint256* | dataVersion | undefined |
| *bytes* | data | undefined |


---
# ENSInterface

## *event* NewOwner

ENSInterface.NewOwner(node, label, owner) `ce0457fe`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | node | indexed |
| *bytes32* | label | indexed |
| *address* | owner | not indexed |

## *event* NewResolver

ENSInterface.NewResolver(node, resolver) `335721b0`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | node | indexed |
| *address* | resolver | not indexed |

## *event* NewTTL

ENSInterface.NewTTL(node, ttl) `1d4f9bbf`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | node | indexed |
| *uint64* | ttl | not indexed |

## *event* Transfer

ENSInterface.Transfer(node, owner) `d4735d92`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | node | indexed |
| *address* | owner | not indexed |


## *function* owner

ENSInterface.owner(node) `view` `02571be3`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | node | undefined |


## *function* resolver

ENSInterface.resolver(node) `view` `0178b8bf`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | node | undefined |


## *function* setOwner

ENSInterface.setOwner(node, _owner) `nonpayable` `5b0fc9c3`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | node | undefined |
| *address* | _owner | undefined |


## *function* setResolver

ENSInterface.setResolver(node, _resolver) `nonpayable` `1896f70a`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | node | undefined |
| *address* | _resolver | undefined |


## *function* setSubnodeOwner

ENSInterface.setSubnodeOwner(node, label, _owner) `nonpayable` `06ab5923`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | node | undefined |
| *bytes32* | label | undefined |
| *address* | _owner | undefined |


## *function* setTTL

ENSInterface.setTTL(node, _ttl) `nonpayable` `14ab9038`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | node | undefined |
| *uint64* | _ttl | undefined |


## *function* ttl

ENSInterface.ttl(node) `view` `16a25cbd`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | node | undefined |


---
# LinkTokenInterface


## *function* allowance

LinkTokenInterface.allowance(owner, spender) `nonpayable` `dd62ed3e`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | owner | undefined |
| *address* | spender | undefined |


## *function* approve

LinkTokenInterface.approve(spender, value) `nonpayable` `095ea7b3`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | spender | undefined |
| *uint256* | value | undefined |


## *function* balanceOf

LinkTokenInterface.balanceOf(owner) `nonpayable` `70a08231`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | owner | undefined |


## *function* decimals

LinkTokenInterface.decimals() `nonpayable` `313ce567`





## *function* decreaseApproval

LinkTokenInterface.decreaseApproval(spender, addedValue) `nonpayable` `66188463`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | spender | undefined |
| *uint256* | addedValue | undefined |


## *function* increaseApproval

LinkTokenInterface.increaseApproval(spender, subtractedValue) `nonpayable` `d73dd623`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | spender | undefined |
| *uint256* | subtractedValue | undefined |


## *function* name

LinkTokenInterface.name() `nonpayable` `06fdde03`





## *function* symbol

LinkTokenInterface.symbol() `nonpayable` `95d89b41`





## *function* totalSupply

LinkTokenInterface.totalSupply() `nonpayable` `18160ddd`





## *function* transfer

LinkTokenInterface.transfer(to, value) `nonpayable` `a9059cbb`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | to | undefined |
| *uint256* | value | undefined |


## *function* transferAndCall

LinkTokenInterface.transferAndCall(to, value, data) `nonpayable` `4000aea0`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | to | undefined |
| *uint256* | value | undefined |
| *bytes* | data | undefined |


## *function* transferFrom

LinkTokenInterface.transferFrom(from, to, value) `nonpayable` `23b872dd`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | from | undefined |
| *address* | to | undefined |
| *uint256* | value | undefined |


---
# PointerInterface


## *function* getAddress

PointerInterface.getAddress() `view` `38cc4831`





---
# Buffer


---
# CBOR


---
# ENSResolver


## *function* addr

ENSResolver.addr(node) `view` `3b3b57de`


Inputs

| **type** | **name** | **description** |
|-|-|-|
| *bytes32* | node | undefined |


---
# Ownable


## *event* OwnershipTransferred

Ownable.OwnershipTransferred(previousOwner, newOwner) `8be0079c`

Arguments

| **type** | **name** | **description** |
|-|-|-|
| *address* | previousOwner | indexed |
| *address* | newOwner | indexed |


## *function* isOwner

Ownable.isOwner() `view` `8f32d59b`

> Returns true if the caller is the current owner.




## *function* owner

Ownable.owner() `view` `8da5cb5b`

> Returns the address of the current owner.




## *function* transferOwnership

Ownable.transferOwnership(newOwner) `nonpayable` `f2fde38b`

> Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.

Inputs

| **type** | **name** | **description** |
|-|-|-|
| *address* | newOwner | undefined |


---
# SafeMath


---