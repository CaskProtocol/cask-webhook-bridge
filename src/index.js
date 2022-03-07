const WebhookBridge = require('./WebhookBridge');

const bridge = new WebhookBridge(
    process.env.WEBSOCKET_PROVIDER,
    process.env.WALLET_ADDRESS,
    process.env.WEBHOOK_ENDPOINT);

bridge.run();
