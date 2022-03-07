require('dotenv').config();

const WebhookBridge = require('./WebhookBridge');

const bridge = new WebhookBridge(
    process.env.WEBSOCKET_PROVIDER,
    process.env.WALLET_ADDRESS,
    process.env.WEBHOOK_ENDPOINT,
    process.env.CASK_ENVIRONMENT);

bridge.run();
