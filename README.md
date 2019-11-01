# Crypto Fiat Gateway on Ethereum using Chainlink Oracles

## Overview

This fiat gateway provides a fast and decentralized way to sell crypto for fiat and vice versa.

Any number of fiat payment networks can be supported. Each must provide a ChainLink external adapter implementation to handle paying out and checking payments in.

A pool of Makers provide fiat and crypto liquidity to the system. They receive a fee for each trade. The fee is the same for all Makers.

A Taker buys crypto for fiat or fiat for crypto. They get the current market price minus a fixed Makers fee.

An alternative to localethereum amd centralized fiat payment gateways like my own CoinHatch Australia:
..... TODO: fill in differences here

## Features

- [x] ETH to Fiat / Fiat to ETH
- [ ] ERC20 to Fiat / Fiat to ERC20
- [x] Paypal Fiat Payments
- [ ] WeChat Pay Fiat Payments
- [ ] SEPA Fiat Payments
- [x] Encrypted fiat payment destination

## How it Works

### Register Fiat Payment Method and Trade Pair

The Gateway smart contract keeps a registry of each market. A market is the combination of fiat payment method (eg. Paypal, SEPA, etc.) and a fiat / crypto pair (eg. ETH/USD).

The contract administrator adds new markets by calling addFiatPaymentMethod on the contract. After this makers may register liquidity with the market.

### Maker Registration

Any one can register as a Maker to provide liquidity for a given market / fiat method. To do so a Maker will:

- encrypt their api credentials for the fiat network and store them on ipfs
- encrypt their payment destination address for the fiat network and store it on ipfs
- call registerMaker on the Gateway contract sending:
  - crypto currency to be locked up for trades
  - ipfs hash of their encrypted fiat api credentials
    The Gateway smart contract keeps a registry of each ### Sell Crypto for Fiat
  - ipfs hash of their destination address

The smart contract keeps a record of the Maker in the contract then passes details to the Fiat Payments external adapter via a ChainLink Oracle call.

### Sell Crypto for Fiat

Sells are a one step process for the Taker. They make a call to sellCryptoOrder on the Gateway contract sending:

- currency to buy
- crypto to sell which is held in escrow
- ipfs hash of encrypted fiat payment destination

sellCryptoOrder will call the ChainLink Oracle with the details. The adapter will choose a maker and send the fiat payment. On fulfillment of the fiat payment fulfillSellCryptoOrder is called on the Gateway contract with id of the maker whose liquidity was used to make the payment. The crypto is then sent to that makers Ethereum address.

### Buy Crypto for Fiat

Buys are a two step process for the Taker.

First they make a call to buyCryptoOrderCreate to register their interest to buy crypto for fiat. They send:

- the currencies to trade
- an number amount in crypto
- ipfs hash of encrypted fiat payment destination

buyCryptoOrderCreate will call the ChainLink Oracle with the details. The adapter will choose a maker and return the makers fiat payment account.

The Taker makes the payment on the fiat payment network then calls buyCryptoOrderPayed to finalise the order. Again an Oracle call is made to the adapter. It checks the payment was received and returns success. The contract then releases the crypto to the taker from the Makers reserve.

## Actors

### Maker

Makers are liquidity providers.

They must register their fiat payment network credentials with the Oracle (for crypto sell orders) and stake their crypto in the Gateway contract (for crypto buy orders) in order for the FiatGateway system to execute orders on their behalf.

The Maker earns a fee from each order executed using their liquidity.

In this version Makers are not competitive as:

- maker selection is simply round robin
- exchange prices are not set but taken from a feed price
- fees for providing liquidity are set at the same rate for all

### Taker

Takers are those buying or selling crypto. This can be anyone.

### Administrator

Is the owner of the Gateway smart contract.

Administrators add FiatPayment network / tradeable pairs (eg. Paypal - USD/ETH, SEPA - AUD/DAI etc.) to the system by:

- hosting an External adapter that handles the Fiat payment network
- connecting the External adapter to a Chainlink node
- call addFiatPaymentMethod on Gateway to register the payment method / oracle / tradeable pair

## Orders

### Prices

The current aggregated market price is used for all trades and a Makers fee (percentage) is take from each order.

## Matching

A simple round robin system is used to match a Taker with a Maker.

This could later be replaced with a competitive Maker selection system with reputation and variable fees.

## Trust

The gateway attempts to be as trustless as possible. When ChainLink supports TEE and system actors have a guarantee that a specific version of the Fiat payment adapter code is running it will be virtually trustless. Until then actors must trust that the external adapter (currently running as a serverless function on AWS) is running without modification.

## Privacy

Fiat payment network account details are not revealed to anyone but the external adapter. This is achieved by encrypting the account destination with the external adapters public key. It is stored on IPFS and the IPFS hash is sent with the order so the adapter can decrypt it before filling the order.
