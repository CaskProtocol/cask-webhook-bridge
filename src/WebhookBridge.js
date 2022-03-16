const ethers = require('ethers');
const Web3WsProvider = require('web3-providers-ws');
const axios = require('axios');
const { createClient } = require('redis');
const cask = require('@caskprotocol/sdk');

class WebhookBridge {

    constructor(wssProvider, environment='development') {
        this.wssProvider = wssProvider;
        this.environment = environment;

        this.endpointMap = {};

        this.chain = cask.core.defaultChains[environment];
    }

    enableRedis(redisUrl) {
        this.redis = createClient({url: redisUrl});
        this.redisKey = process.env.REDIS_PROVIDER_MAP_KEY || 'CaskProviderMap';

        this.redis.on('error', (err) => {
            console.log('Redis Client Error', err)
        });

        return this.redis.connect();
    }

    mapProviderToEndpoint(provider, endpoint) {
        this.endpointMap[provider] = endpoint;
    }

    handleError(error) {
        console.log("Error from web3 subsystem", error);
        // this.initWeb3(); // reinitialize web3?
    }

    async getProviderEndpoint(provider) {
        let endpoint = this.endpointMap[provider];
        if (!endpoint && this.redis) {
            endpoint = await this.redis.hGet(this.redisKey, provider);
        }
        return endpoint;
    }

    initWeb3() {

        this.provider = new ethers.providers.Web3Provider(
            new Web3WsProvider(this.wssProvider, {
                timeout: 30000,
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
        );

        const CaskSubscriptions = new ethers.Contract(
            cask.core.deployments.CaskSubscriptions[this.environment][this.chain],
            cask.core.abi.CaskSubscriptions[this.environment],
            this.provider);

        CaskSubscriptions.on('error', (err) => {
            this.handleError(err);
        });

        if (process.env.VERBOSE) {
            console.log(`Listening for contract events for providers: ${this.providerAddresses}`);
        }

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionCreated(null, this.providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, discountId, event) => {
                this.handleSubscriptionCreated(consumer, provider, subscriptionId, ref, planId, discountId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionChangedPlan(null, this.providerAddresses),
            (consumer, provider, subscriptionId, ref, prevPlanId, planId, discountId, event) => {
                this.handleSubscriptionChangedPlan(consumer, provider, subscriptionId, ref, prevPlanId,
                    planId, discountId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionPendingChangePlan(null, this.providerAddresses),
            (consumer, provider, subscriptionId, ref, prevPlanId, planId, event) => {
                this.handleSubscriptionPendingChangePlan(consumer, provider, subscriptionId, ref, prevPlanId,
                    planId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionChangedDiscount(null, this.providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, discountId, event) => {
                this.handleSubscriptionChangedDiscount(consumer, provider, subscriptionId, ref, planId,
                    discountId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionPaused(null, this.providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, event) => {
                this.handleSubscriptionPaused(consumer, provider, subscriptionId, ref, planId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionResumed(null, this.providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, event) => {
                this.handleSubscriptionResumed(consumer, provider, subscriptionId, ref, planId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionPendingCancel(null, this.providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, cancelAt, event) => {
                this.handleSubscriptionPendingCancel(consumer, provider, subscriptionId, ref, planId, cancelAt, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionCanceled(null, this.providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, event) => {
                this.handleSubscriptionCanceled(consumer, provider, subscriptionId, ref, planId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionRenewed(null, this.providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, discountId, event) => {
                this.handleSubscriptionRenewed(consumer, provider, subscriptionId, ref, planId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionTrialEnded(null, this.providerAddresses),
            (consumer, provider, subscriptionId, ref, planId, discountId, event) => {
                this.handleSubscriptionTrialEnded(consumer, provider, subscriptionId, ref, planId, event);
            });

        CaskSubscriptions.on(
            CaskSubscriptions.filters.SubscriptionPastDue(null, this.providerAddresses),
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
        const endpoint = await this.getProviderEndpoint(provider);
        if (endpoint) {
            this.sendWebhook(endpoint, payload);
        } else {
            console.log(`No endpoint mapped for provider ${provider}`);
        }
    }

    async handleSubscriptionChangedPlan(consumer, provider, subscriptionId, ref, prevPlanId,
                                        planId, discountId, event)
    {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, prevPlanId, planId, discountId},
            event
        );
        const endpoint = await this.getProviderEndpoint(provider);
        if (endpoint) {
            this.sendWebhook(endpoint, payload);
        } else {
            console.log(`No endpoint mapped for provider ${provider}`);
        }
    }

    async handleSubscriptionPendingChangePlan(consumer, provider, subscriptionId, ref, prevPlanId, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, prevPlanId, planId},
            event
        );
        const endpoint = await this.getProviderEndpoint(provider);
        if (endpoint) {
            this.sendWebhook(endpoint, payload);
        } else {
            console.log(`No endpoint mapped for provider ${provider}`);
        }
    }

    async handleSubscriptionChangedDiscount(consumer, provider, subscriptionId, ref, planId, discountId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId, discountId},
            event
        );
        const endpoint = await this.getProviderEndpoint(provider);
        if (endpoint) {
            this.sendWebhook(endpoint, payload);
        } else {
            console.log(`No endpoint mapped for provider ${provider}`);
        }
    }

    async handleSubscriptionPaused(consumer, provider, subscriptionId, ref, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        const endpoint = await this.getProviderEndpoint(provider);
        if (endpoint) {
            this.sendWebhook(endpoint, payload);
        } else {
            console.log(`No endpoint mapped for provider ${provider}`);
        }
    }

    async handleSubscriptionResumed(consumer, provider, subscriptionId, ref, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        const endpoint = await this.getProviderEndpoint(provider);
        if (endpoint) {
            this.sendWebhook(endpoint, payload);
        } else {
            console.log(`No endpoint mapped for provider ${provider}`);
        }
    }

    async handleSubscriptionPendingCancel(consumer, provider, subscriptionId, ref, planId, cancelAt, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        const endpoint = await this.getProviderEndpoint(provider);
        if (endpoint) {
            this.sendWebhook(endpoint, payload);
        } else {
            console.log(`No endpoint mapped for provider ${provider}`);
        }
    }

    async handleSubscriptionCanceled(consumer, provider, subscriptionId, ref, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        const endpoint = await this.getProviderEndpoint(provider);
        if (endpoint) {
            this.sendWebhook(endpoint, payload);
        } else {
            console.log(`No endpoint mapped for provider ${provider}`);
        }
    }

    async handleSubscriptionRenewed(consumer, provider, subscriptionId, ref, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        const endpoint = await this.getProviderEndpoint(provider);
        if (endpoint) {
            this.sendWebhook(endpoint, payload);
        } else {
            console.log(`No endpoint mapped for provider ${provider}`);
        }
    }

    async handleSubscriptionTrialEnded(consumer, provider, subscriptionId, ref, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        const endpoint = await this.getProviderEndpoint(provider);
        if (endpoint) {
            this.sendWebhook(endpoint, payload);
        } else {
            console.log(`No endpoint mapped for provider ${provider}`);
        }
    }

    async handleSubscriptionPastDue(consumer, provider, subscriptionId, ref, planId, event) {
        const payload = await this.webhookPayload(
            event.event,
            {consumer, provider, subscriptionId: subscriptionId.toHexString(), ref, planId},
            event
        );
        const endpoint = await this.getProviderEndpoint(provider);
        if (endpoint) {
            this.sendWebhook(endpoint, payload);
        } else {
            console.log(`No endpoint mapped for provider ${provider}`);
        }
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

    async sendWebhook(endpoint, payload) {
        try {
            if (process.env.VERBOSE) {
                console.log(`Sending webhook to endpoint ${endpoint} for event ${payload.event}`);
            }
            const response = await axios.post(endpoint, payload);
            if (response.status >= 200 && response.status < 400) {
                if (process.env.VERBOSE) {
                    console.log(`Successful webhook post`);
                }
            } else {
                console.log(`Error from remote endpoint ${endpoint}: ${response.status}`);
            }
        } catch (e) {
            console.log(`Error sending webhook: ${e.message}`);
        }
    }


    async runSingle(providerAddress, endpoint) {
        console.log(`Starting webhook bridge for environment ${this.environment} (using chain ${this.chain})`);

        if (providerAddress.includes(',')) {
            const providerAddresses = providerAddress.split(',');
            providerAddresses.forEach((provider) => {
                this.mapProviderToEndpoint(provider, endpoint);
            });
            this.providerAddresses = providerAddresses;
        } else {
            this.mapProviderToEndpoint(providerAddress, endpoint);
            this.providerAddresses = providerAddress;
        }

        this.initWeb3();
    }

    async runMulti(redisUrl) {
        console.log(`Starting multi-tenant webhook bridge for environment ${this.environment} (using chain ${this.chain})`);

        await this.enableRedis(redisUrl);

        const mapping = await this.redis.hGetAll(this.redisKey);

        let providerAddresses = Object.keys(mapping);
        if (providerAddresses.length === 1) {
            this.providerAddresses = providerAddresses[0];
        } else {
            this.providerAddresses = providerAddresses;
        }

        this.initWeb3();
    }
}

module.exports = WebhookBridge;