require('dotenv').config();

const WebhookBridge = require('./WebhookBridge');

const bridge = new WebhookBridge(process.env.WEBSOCKET_PROVIDER, process.env.CASK_ENVIRONMENT, process.env.CASK_CHAIN);

if (process.env.REDIS_URL) {
    bridge.runMulti(process.env.REDIS_URL);
} else {
    bridge.runSingle(process.env.WALLET_ADDRESS, process.env.WEBHOOK_ENDPOINT);
}


