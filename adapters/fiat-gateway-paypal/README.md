# Crypto Fiat Gateway Paypal External Adapter

See also:

- [FiatGateway docs](https://github.com/chatch/fiat-gateway/blob/master/README.md)

## Overview

See FiatGateway docs for full details of the project.

This folder provides the external adapter for interfacing with the Paypal payments network.

To support more payment networks more of these external adapters can be built.

## Deployment

This adapter is configured to use the Serverless Framework. It deploys to AWS Lambda out of the box however other cloud providers can be configured, see [here](https://serverless.com/framework/docs/providers/). You can also manually deploy by uploading a zip of the project folder.

ChainLink node job specs for connecting to each adapter call are defined in [chainlink-job-specs.json](https://github.com/chatch/fiat-gateway/blob/master/adapters/fiat-gateway-paypal/chainlink-job-specs.json)

### Deploy function

```
yarn run build
yarn run deploy-staging
```

### Configure ChainLink node

Follow the docs for specific steps. You will need to:

- create a new Bridge that points to the functions URL (the URL can be seen in the output from the serverless deploy)
- create a job for each job in the [chainlink-job-specs.json](https://github.com/chatch/fiat-gateway/blob/master/adapters/fiat-gateway-paypal/chainlink-job-specs.json)
- register the adapter with Gateway.sol by calling addFiatPaymentMethod and passing the job ids

## Build

```
yarn install
yarn run build
yarn run lint
```

## Test

```
yarn test
```
