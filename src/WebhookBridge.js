// const Web3 = require('web3');
const { createAlchemyWeb3 } = require("@alch/alchemy-web3");
const axios = require('axios');
const { createClient } = require('redis');
const { CaskSDK } = require('@caskprotocol/sdk');

class WebhookBridge {

    constructor(wssProvider, environment='development') {
        this.wssProvider = wssProvider;
        this.environment = environment;

        this.endpointMap = {};

        this.chain = CaskSDK.defaultChains[environment];
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

    async getProviderEndpoint(provider) {
        let endpoint = this.endpointMap[provider];
        if (!endpoint && this.redis) {
            endpoint = await this.redis.hGet(this.redisKey, provider);
        }
        return endpoint;
    }

    initWeb3() {
        console.log(`Starting web3 websocket at ${this.wssProvider}.`);

        // this.web3 = new Web3(this.wssProvider, {
        //     timeout: 30000,
        //     clientConfig: {
        //         keepalive: true,
        //         keepaliveInterval: 30000,
        //     },
        //     reconnect: {
        //         auto: true,
        //         delay: 5000,
        //         onTimeout: true
        //     }
        // });

        this.web3 = createAlchemyWeb3(this.wssProvider);

        this.startWeb3Listeners();
    }

    async startWeb3Listeners() {

        const filter = {provider: this.providerAddresses}

        console.log(`Starting web3 contract event listeners with filter: ${JSON.stringify(filter)}.`);

        this.CaskSubscriptions = new this.web3.eth.Contract(
            CaskSDK.abi.CaskSubscriptions[this.environment],
            CaskSDK.deployments.CaskSubscriptions[this.environment][this.chain.chainId]);

        this.CaskSubscriptions.events.SubscriptionCreated({filter: filter})
            .on('data', async (event) => {
                if (this.verbose()) {
                    console.log(`SubscriptionCreated: ${JSON.stringify(event)}`);
                }
                await this.handleSubscriptionCreated(event);
            });

        this.CaskSubscriptions.events.SubscriptionChangedPlan({filter: filter})
            .on('data', async (event) => {
                if (this.verbose()) {
                    console.log(`SubscriptionChangedPlan: ${JSON.stringify(event)}`);
                }
                await this.handleSubscriptionCreated(event);
            });

        this.CaskSubscriptions.events.SubscriptionPendingChangePlan({filter: filter})
            .on('data', async (event) => {
                if (this.verbose()) {
                    console.log(`SubscriptionPendingChangePlan: ${JSON.stringify(event)}`);
                }
                await this.handleSubscriptionPendingChangePlan(event);
            });

        this.CaskSubscriptions.events.SubscriptionPaused({filter: filter})
            .on('data', async (event) => {
                if (this.verbose()) {
                    console.log(`SubscriptionPaused: ${JSON.stringify(event)}`);
                }
                await this.handleSubscriptionPaused(event);
            });

        this.CaskSubscriptions.events.SubscriptionResumed({filter: filter})
            .on('data', async (event) => {
                if (this.verbose()) {
                    console.log(`SubscriptionResumed: ${JSON.stringify(event)}`);
                }
                await this.handleSubscriptionResumed(event);
            });

        this.CaskSubscriptions.events.SubscriptionPendingCancel({filter: filter})
            .on('data', async (event) => {
                if (this.verbose()) {
                    console.log(`SubscriptionPendingCancel: ${JSON.stringify(event)}`);
                }
                await this.handleSubscriptionPendingCancel(event);
            });

        this.CaskSubscriptions.events.SubscriptionCanceled({filter: filter})
            .on('data', async (event) => {
                if (this.verbose()) {
                    console.log(`SubscriptionCanceled: ${JSON.stringify(event)}`);
                }
                await this.handleSubscriptionCanceled(event);
            });

        this.CaskSubscriptions.events.SubscriptionRenewed({filter: filter})
            .on('data', async (event) => {
                if (this.verbose()) {
                    console.log(`SubscriptionRenewed: ${JSON.stringify(event)}`);
                }
                await this.handleSubscriptionRenewed(event);
            });

        this.CaskSubscriptions.events.SubscriptionTrialEnded({filter: filter})
            .on('data', async (event) => {
                if (this.verbose()) {
                    console.log(`SubscriptionTrialEnded: ${JSON.stringify(event)}`);
                }
                await this.handleSubscriptionTrialEnded(event);
            });

        this.CaskSubscriptions.events.SubscriptionPastDue({filter: filter})
            .on('data', async (event) => {
                if (this.verbose()) {
                    console.log(`SubscriptionPastDue: ${JSON.stringify(event)}`);
                }
                await this.handleSubscriptionPastDue(event);
            });
    }

    async handleSubscriptionCreated(event) {
        const payload = await this.webhookPayload(
            event.event,
            {
                consumer: event.returnValues.consumer,
                provider: event.returnValues.provider,
                subscriptionId: this.web3.utils.numberToHex(event.returnValues.subscriptionId),
                ref: event.returnValues.ref,
                planId: event.returnValues.planId,
                discountId: event.returnValues.discountId
            },
            event
        );
        this.sendWebhook(event.returnValues.provider, payload);
    }

    async handleSubscriptionChangedPlan(event)
    {
        const payload = await this.webhookPayload(
            event.event,
            {
                consumer: event.returnValues.consumer,
                provider: event.returnValues.provider,
                subscriptionId: this.web3.utils.numberToHex(event.returnValues.subscriptionId),
                ref: event.returnValues.ref,
                prevPlanId: event.returnValues.prevPlanId,
                planId: event.returnValues.planId,
                discountId: event.returnValues.discountId
            },
            event
        );
        this.sendWebhook(event.returnValues.provider, payload);
    }

    async handleSubscriptionPendingChangePlan(event) {
        const payload = await this.webhookPayload(
            event.event,
            {
                consumer: event.returnValues.consumer,
                provider: event.returnValues.provider,
                subscriptionId: this.web3.utils.numberToHex(event.returnValues.subscriptionId),
                ref: event.returnValues.ref,
                prevPlanId: event.returnValues.prevPlanId,
                planId: event.returnValues.planId
            },
            event
        );
        this.sendWebhook(event.returnValues.provider, payload);
    }

    async handleSubscriptionChangedDiscount(event) {
        const payload = await this.webhookPayload(
            event.event,
            {
                consumer: event.returnValues.consumer,
                provider: event.returnValues.provider,
                subscriptionId: this.web3.utils.numberToHex(event.returnValues.subscriptionId),
                ref: event.returnValues.ref,
                planId: event.returnValues.planId,
                discountId: event.returnValues.discountId
            },
            event
        );
        this.sendWebhook(event.returnValues.provider, payload);
    }

    async handleSubscriptionPaused(event) {
        const payload = await this.webhookPayload(
            event.event,
            {
                consumer: event.returnValues.consumer,
                provider: event.returnValues.provider,
                subscriptionId: this.web3.utils.numberToHex(event.returnValues.subscriptionId),
                ref: event.returnValues.ref,
                planId: event.returnValues.planId
            },
            event
        );
        this.sendWebhook(event.returnValues.provider, payload);
    }

    async handleSubscriptionResumed(event) {
        const payload = await this.webhookPayload(
            event.event,
            {
                consumer: event.returnValues.consumer,
                provider: event.returnValues.provider,
                subscriptionId: this.web3.utils.numberToHex(event.returnValues.subscriptionId),
                ref: event.returnValues.ref,
                planId: event.returnValues.planId
            },
            event
        );
        this.sendWebhook(event.returnValues.provider, payload);
    }

    async handleSubscriptionPendingCancel(event) {
        const payload = await this.webhookPayload(
            event.event,
            {
                consumer: event.returnValues.consumer,
                provider: event.returnValues.provider,
                subscriptionId: this.web3.utils.numberToHex(event.returnValues.subscriptionId),
                ref: event.returnValues.ref,
                planId: event.returnValues.planId
            },
            event
        );
        this.sendWebhook(event.returnValues.provider, payload);
    }

    async handleSubscriptionCanceled(event) {
        const payload = await this.webhookPayload(
            event.event,
            {
                consumer: event.returnValues.consumer,
                provider: event.returnValues.provider,
                subscriptionId: this.web3.utils.numberToHex(event.returnValues.subscriptionId),
                ref: event.returnValues.ref,
                planId: event.returnValues.planId
            },
            event
        );
        this.sendWebhook(event.returnValues.provider, payload);
    }

    async handleSubscriptionRenewed(event) {
        const payload = await this.webhookPayload(
            event.event,
            {
                consumer: event.returnValues.consumer,
                provider: event.returnValues.provider,
                subscriptionId: this.web3.utils.numberToHex(event.returnValues.subscriptionId),
                ref: event.returnValues.ref,
                planId: event.returnValues.planId
            },
            event
        );
        this.sendWebhook(event.returnValues.provider, payload);
    }

    async handleSubscriptionTrialEnded(event) {
        const payload = await this.webhookPayload(
            event.event,
            {
                consumer: event.returnValues.consumer,
                provider: event.returnValues.provider,
                subscriptionId: this.web3.utils.numberToHex(event.returnValues.subscriptionId),
                ref: event.returnValues.ref,
                planId: event.returnValues.planId
            },
            event
        );
        this.sendWebhook(event.returnValues.provider, payload);
    }

    async handleSubscriptionPastDue(event) {
        const payload = await this.webhookPayload(
            event.event,
            {
                consumer: event.returnValues.consumer,
                provider: event.returnValues.provider,
                subscriptionId: this.web3.utils.numberToHex(event.returnValues.subscriptionId),
                ref: event.returnValues.ref,
                planId: event.returnValues.planId
            },
            event
        );
        this.sendWebhook(event.returnValues.provider, payload);
    }

    async webhookPayload(name, args, blockchainEvent) {
        return {
            event: name,
            args: args,
            block: {
                number: blockchainEvent.blockNumber,
                hash: blockchainEvent.blockHash,
            },
            transactionHash: blockchainEvent.transactionHash,
            chainId: this.chain.chainId,
        }
    }

    async sendWebhook(provider, payload) {
        try {
            const endpoint = await this.getProviderEndpoint(provider);
            if (!endpoint) {
                console.log(`No endpoint mapped for provider ${provider}`);
                return;
            }

            if (this.verbose()) {
                console.log(`Sending webhook to endpoint ${endpoint} for event ${payload.event}`);
            }
            const response = await axios.post(endpoint, payload);
            if (response.status >= 200 && response.status < 400) {
                if (this.verbose()) {
                    console.log(`Successful webhook post`);
                }
            } else {
                console.log(`Error from remote endpoint ${endpoint}: ${response.status}`);
            }
        } catch (e) {
            console.log(`Error sending webhook: ${e.message}`);
        }
    }

    verbose() {
        return process.env.VERBOSE === '1';
    }

    async runSingle(providerAddress, endpoint) {
        console.log(`Starting webhook bridge for environment ${this.environment} (using chain ${this.chain.chainId})`);

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
        console.log(`Starting multi-tenant webhook bridge for environment ${this.environment} (using chain ${this.chain.chainId})`);

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