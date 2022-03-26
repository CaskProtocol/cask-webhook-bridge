# Webhook Bridge

The Cask Webhook Bridge is an application the service provider/merchant can run that will translate on-chain events
about subscriptions to the provider's services into traditional webhooks.

Webhooks are triggered when on-chain events happen (such as new subscriptions, cancellations, renewals, etc...)
against the providers address and are delivered  via an HTTP `POST` request with a `json` body describing the event.


## Setup

The webhook bridge is available at [https://github.com/CaskProtocol/cask-webhook-bridge](https://github.com/CaskProtocol/cask-webhook-bridge) and as a docker image, which can be ran using the docker command:

```shell
docker run --name mybridge -e WEBSOCKET_PROVIDER=... -e WALLET_ADDRESS=0x... -e WEBHOOK_ENDPOINT=https://.... -d caskprotocol/webhook-bridge:latest
```


## Environment Variables

The following environment variables are used to configure the webhook bridge. If running the webhook bridge directly
(instead of via docker), you can create a file called `.env` in the root of the project folder containing the
environment variables.

| Name               |                                                          Description                                                          |
|--------------------|:-----------------------------------------------------------------------------------------------------------------------------:|
| WEBSOCKET_PROVIDER | Websocket URL to a web3 provider, such as infura or alchemy. Use a websocket (ws:// or wss://) URL, and not a json/https URL. |
| WALLET_ADDRESS     |                        Wallet address of the service provider/merchant, that is associated with Cask.                         |
| WEBHOOK_ENDPOINT   |                                               URL in which to deliver webhooks.                                               |
| CASK_ENVIRONMENT   |                     Valid values are `testnet` and `production`, if not specified, assumes `production`.                      |
| VERBOSE            |                              Set to `1` to enable verbose logging for troubleshooting purposes.                               |



## Webhook Event List


| Event Name                                                      |                                  Description                                   |
|-----------------------------------------------------------------|:------------------------------------------------------------------------------:|
| [SubscriptionCreated](#subscriptioncreated)                     |                        A new subscription has been created                     |
| [SubscriptionChangedPlan](#subscriptionchangedplan)             |                   An existing subscription has changed plans                   |
| [SubscriptionPendingChangePlan](#subscriptionpendingchangeplan) |      An existing subscription has scheduled a plan change at next renewal      |
| [SubscriptionChangedDiscount](#subscriptionchangeddiscount)     |                  An existing subscription applied a discount                   |
| [SubscriptionPaused](#subscriptionpaused)                       |                           A subscription was paused                            |
| [SubscriptionResumed](#subscriptionresumed)                     |                           A subscription was resumed                           |
| [SubscriptionPendingCancel](#subscriptionpendingcancel)         |         A subscription was scheduled for cancellation at next renewal          |
| [SubscriptionCanceled](#subscriptioncanceled)                   |                          A subscription was canceled                           |
| [SubscriptionRenewed](#subscriptionrenewed)                     |               A subscription renewal was successfully processed                |
| [SubscriptionTrialEnded](#subscriptiontrialended)               |   A subscription that was in a trial ended the trial and converted to active   |
| [SubscriptionPastDue](#subscriptionpastdue)                     | A subscription renewal was attempted but insufficient funds were able to renew |


## JSON Format

All event webhooks follow the following format:

```json
{
  "event": "<EVENT NAME>",
  "args": {
    "<ARG NAME 1>": "<VALUE>",
    "<ARG NAME 2>": "<VALUE>"
  },
  "block": {
    "number": <BLOCK NUMBER>,
    "hash": "<BLOCK HASH>"
  },
  "transactionHash": "<TRANSACTION HASH>",
  "chainId": <CHAIN ID>
}
```

| Name              |                                                  Description                                                  |
|-------------------|:-------------------------------------------------------------------------------------------------------------:|
| EVENT NAME        |                             The event name as specified in the Event List above.                              |
| ARG NAME X        |                              Argument name as detailed in the following section.                              |
| BLOCK NUMBER      |             The block number of the block that included the transaction that generated the event.             |
| BLOCK HASH        |                    The block hash identifier of the block that contained the transaction.                     |
| TRANSACTION HASH  | The transaction identifier of the transaction that generated the event. Useful to look up on block explorers. |
| CHAIN ID          |                                 Which blockchain the transaction occurred on.                                 |


## Argument Formatting

The following are details about the meaning of each possible argument. Not all arguments are present in every event,
so look at the event-specific section to see which arguments are included in that event.

### Addresses

Addresses such as `consumer` and `provider` are the 42-character hexadecimal address.

### Subscription ID

The `subscriptionId` field is a unique 32 byte hexadecimal value representing the subscription instance. It is also
the NFT tokenId of the subscription, and in some online tools will be formatted as a uint256 value instead of a hexadecimal
value.

This ID can be used to fetch the active subscription state from the blockchain directly.

### ref

The `ref` field is a 32 byte hexadecimal value that can be provided by the service provider/merchant at subscription
creation time via the [Javascript Checkout Widget](https://github.com/CaskProtocol/cask-widgets) `ref` parameter. The value must be supplied in hexadecimal format and always
be a full 32-byte value. There are several utilities provided in the `@caskprotocol/sdk` package to encode/decode strings,
numbers and UUIDs into this value. If no value was provided via the widget, the ref value will be the zero value
`0x0000000000000000000000000000000000000000000000000000000000000000`.

### Plan ID

The `planId` field is the numeric identifier for the plan that is the currently active plan of the subscription.

### Previous Plan ID

The `prevPlanId` field denotes the previous plan when the event is indicating a plan change, such as a
`SubscriptionChangedPlan` which indicates the plan was changed immediately, or a `SubscriptionPendingChangePlan` which
indicates a change at the next renewal.

### Discount ID

The `discountId` field contains the hash ID of the discount code that is applied to the subscription. This
value can be used to look up the discount from the provider profile IPFS data which uses the same hash ID. If
the subscription has no discount, the value is `0x0000000000000000000000000000000000000000000000000000000000000000`.

### Block

The `block` object contains details about the block in which the on-chain event was processed.


### Transaction Hash

The `transactionHash` field is the on-chain transaction ID which generated the event and can be used to look up the
event on blockchain explorers.

### Chain ID

The `chainId` field contains the blockchain ID for which blockchain originated the event.

## SubscriptionCreated

The `SubscriptionCreated` event is triggered when a consumer creates a subscription.

### Arguments

* consumer
* provider
* subscriptionId
* ref
* planId
* discountId

## SubscriptionChangedPlan

The `SubscriptionChangedPlan` event is triggered when a consumer creates a subscription.

### Arguments

* consumer
* provider
* subscriptionId
* ref
* prevPlanId
* planId
* discountId

## SubscriptionPendingChangePlan

The `SubscriptionPendingChangePlan` event is triggered when a consumer creates a subscription.

### Arguments

* consumer
* provider
* subscriptionId
* ref
* prevPlanId
* planId
* discountId

## SubscriptionChangedDiscount

The `SubscriptionPendingChangePlan` event is triggered when a consumer creates a subscription.

### Arguments

* consumer
* provider
* subscriptionId
* ref
* planId
* discountId

## SubscriptionPaused

The `SubscriptionPaused` event is triggered when a subscription is paused.

### Arguments

* consumer
* provider
* subscriptionId
* ref
* planId

## SubscriptionResumed

The `SubscriptionResumed` event is triggered when a subscription is resumed.

### Arguments

* consumer
* provider
* subscriptionId
* ref
* planId

## SubscriptionPendingCancel

The `SubscriptionPendingCancel` event is triggered when a subscription is scheduled to be canceled.

### Arguments

* consumer
* provider
* subscriptionId
* ref
* planId

## SubscriptionCanceled

The `SubscriptionCanceled` event is triggered when a subscription is canceled. Once a subscription is canceled, it
can never be restarted.

### Arguments

* consumer
* provider
* subscriptionId
* ref
* planId

## SubscriptionRenewed

The `SubscriptionRenewed` event is triggered when a subscription is renewed and the normal period payment has
successfully processed.

### Arguments

* consumer
* provider
* subscriptionId
* ref
* planId

## SubscriptionTrialEnded

The `SubscriptionTrialEnded` event is triggered when a subscription trial has ended and the initial period
charge has been successfully processed.

### Arguments

* consumer
* provider
* subscriptionId
* ref
* planId

## SubscriptionPastDue

The `SubscriptionPastDue` event is triggered when a subscription charge has failed. Reattempts to process the payment
will continue throughout the plan's `gracePeriod` setting, at which point, if a successful charge has not been
possible, the subscription will transition to canceled.

### Arguments

* consumer
* provider
* subscriptionId
* ref
* planId


## Example Webhook Body

```json
{
  "event": "SubscriptionCreated",
  "args": {
    "consumer": "0xab60a9037EdA0F517125dd9f87CC5621D77a10b8",
    "provider": "0xf3d6495662b71212c9De76a15e6666E199a64B97",
    "subscriptionId": "0xb6f30c97fc59a64dea2384bbaf54cd61306e462266e76dc280feabe5016b7fd3",
    "ref": "0xa1c2b8080ed4b6f56211e0295659ef87dd454b0a884198c10384f230525d4ee8",
    "planId": 100,
    "discountId": "0x0000000000000000000000000000000000000000000000000000000000000000"
  },
  "block": {
    "number": 169,
    "hash": "0x824b7d46b4ce79fa8b8dd8ba0520c2c5364439a3f696da7007c0c696fc6d5c11"
  },
  "transactionHash": "0xf32f03ee2212188ac010a2efe0d3f2226b0a354dfe74f5ccf1584da9ecbffe9d",
  "chainId": 137
}
```

