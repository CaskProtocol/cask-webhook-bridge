const ethers = require('ethers');
const Web3WsProvider = require('web3-providers-ws');
const axios = require('axios');
const cask = require('@caskprotocol/sdk');

class WebhookBridge {

    constructor(wssProvider, providerAddress, endpoint, environment='development') {
        this.environment = environment;
        this.providerAddress = providerAddress;
        this.endpoint = endpoint;
        this.chain = cask.core.defaultChains[environment];
        this.provider =
            new ethers.providers.Web3Provider(
                new Web3WsProvider(wssProvider, {
                    clientConfig: {
                        keepalive: true,
                        keepaliveInterval: 30000,
                    },
                    reconnect: {
                        auto: true,
                        delay: 5000,
                        maxAttempts: 5,
                        onTimeout: true
                    }
                }),
            )
    }

    contractListener() {

        let providerAddresses;

        if (this.providerAddress.includes(',')) {
            providerAddresses = this.providerAddress.split(',');
        } else {
            providerAddresses = this.providerAddress;
        }

        const CaskSubscriptions = new ethers.Contract(
            cask.core.deployments.CaskSubscriptions[this.environment][this.chain],
            cask.core.abi.CaskSubscriptions[this.environment],
            this.provider);

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionCreated(null, providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, discountId, event) => {
                this.handleSubscriptionCreated(consumer, provider, subscriptionId, ref, planId, discountId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionChangedPlan(null, providerAddresses),
            (consumer, provider, subscriptionId, ref, prevPlanId, planId, discountId, event) => {
                this.handleSubscriptionChangedPlan(consumer, provider, subscriptionId, ref, prevPlanId,
                    planId, discountId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionPendingChangePlan(null, providerAddresses),
            (consumer, provider, subscriptionId, ref, prevPlanId, planId, event) => {
                this.handleSubscriptionPendingChangePlan(consumer, provider, subscriptionId, ref, prevPlanId,
                    planId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionChangedDiscount(null, providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, discountId, event) => {
                this.handleSubscriptionChangedDiscount(consumer, provider, subscriptionId, ref, planId,
                    discountId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionPaused(null, providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, event) => {
                this.handleSubscriptionPaused(consumer, provider, subscriptionId, ref, planId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionResumed(null, providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, event) => {
                this.handleSubscriptionResumed(consumer, provider, subscriptionId, ref, planId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionPendingCancel(null, providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, event) => {
                this.handleSubscriptionPendingCancel(consumer, provider, subscriptionId, ref, planId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionCanceled(null, providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, event) => {
                this.handleSubscriptionCanceled(consumer, provider, subscriptionId, ref, planId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionRenewed(null, providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, discountId, event) => {
                this.handleSubscriptionRenewed(consumer, provider, subscriptionId, ref, planId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionTrialEnded(null, providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, discountId, event) => {
                this.handleSubscriptionTrialEnded(consumer, provider, subscriptionId, ref, planId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionPastDue(null, providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, discountId, event) => {
                this.handleSubscriptionPastDue(consumer, provider, subscriptionId, ref, planId, event);
            });

    }

    async handleSubscriptionCreated(consumer, provider, subscriptionId, ref, planId, discountId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId, discountId},
            event
        );
        this.sendWebhook(payload);
    }

    async handleSubscriptionChangedPlan(consumer, provider, subscriptionId, ref, prevPlanId,
                                        planId, discountId, event)
    {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, prevPlanId, planId, discountId},
            event
        );
        this.sendWebhook(payload);
    }

    async handleSubscriptionPendingChangePlan(consumer, provider, subscriptionId, ref, prevPlanId, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, prevPlanId, planId},
            event
        );
        this.sendWebhook(payload);
    }

    async handleSubscriptionChangedDiscount(consumer, provider, subscriptionId, ref, planId, discountId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId, discountId},
            event
        );
        this.sendWebhook(payload);
    }

    async handleSubscriptionPaused(consumer, provider, subscriptionId, ref, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        this.sendWebhook(payload);
    }

    async handleSubscriptionResumed(consumer, provider, subscriptionId, ref, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        this.sendWebhook(payload);
    }

    async handleSubscriptionPendingCancel(consumer, provider, subscriptionId, ref, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        this.sendWebhook(payload);
    }

    async handleSubscriptionCanceled(consumer, provider, subscriptionId, ref, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        this.sendWebhook(payload);
    }

    async handleSubscriptionRenewed(consumer, provider, subscriptionId, ref, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        this.sendWebhook(payload);
    }

    async handleSubscriptionTrialEnded(consumer, provider, subscriptionId, ref, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        this.sendWebhook(payload);
    }

    async handleSubscriptionPastDue(consumer, provider, subscriptionId, ref, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        this.sendWebhook(payload);
    }


    async webhookPayload(name, args, blockchainEvent) {
        const block = await blockchainEvent.getBlock();
        const txn = await blockchainEvent.getTransaction();
        return {
            event: name,
            args: args,
            block: {
                number: block.number,
                hash: block.hash,
                parentHash: block.parentHash,
                timestamp: block.timestamp,
                difficulty: block.difficulty,
            },
            transactionHash: txn.hash,
            chainId: txn.chainId,
        }
    }

    async sendWebhook(payload) {
        try {
            if (process.env.VERBOSE) {
                console.log(`Sending webhook for event ${payload.event}`);
            }
            const response = await axios.post(this.endpoint, payload);
            if (response.status >= 200 && response.status < 400) {
                if (process.env.VERBOSE) {
                    console.log(`Successful webhook post`);
                }
            } else {
                console.log(`Error from remote endpoint: ${response.status}`);
            }
        } catch (e) {
            console.log(`Error sending webhook: ${e.message}`);
        }
    }


    async run() {
        console.log(`Starting bridge for environment ${this.environment} (using chain ${this.chain})`);

        this.contractListener();

    }
}

module.exports = WebhookBridge;