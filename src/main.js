#!/usr/bin/env bun

import { createApp } from './app.js';
import { DeviceProtector } from './core/protector.js';
import { Logger } from './utils/logger.js';
import { Config } from './config/settings.js';
import chalk from 'chalk';

const logger = new Logger('Main');

class SnehDeviceProtector {
    constructor() {
        this.config = new Config();
        this.protector = new DeviceProtector(this.config);
        this.app = null;
        
        this.setupGracefulShutdown();
    }

    async initialize() {
        try {
            logger.info('🚀 Starting Sneh Creation Device Protector');
            logger.info(`📱 Version: 1.0.0`);
            logger.info(`👤 User: ${process.env.USERNAME || 'Unknown'}`);
            logger.info(`📅 Date: ${new Date().toISOString()}`);

            // Create Express app
            this.app = createApp(this.protector, this.config);

            // Start protection monitoring
            this.protector.start();

            // Start web server
            const port = this.config.get('port', 3847);
            this.app.listen(port, () => {
                logger.info(`🌐 Web interface available at http://localhost:${port}`);
            });

            logger.info('✅ Device Protector initialized successfully');

        } catch (error) {
            logger.error('❌ Failed to initialize Device Protector:', error);
            process.exit(1);
        }
    }

    async shutdown() {
        try {
            logger.info('🛑 Shutting down Device Protector...');

            // Stop monitoring
            if (this.protector) {
                this.protector.stop();
            }

            logger.info('✅ Device Protector shutdown complete');

        } catch (error) {
            logger.error('❌ Error during shutdown:', error);
        }
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            logger.info(`📥 Received ${signal}, shutting down gracefully...`);
            await this.shutdown();
            process.exit(0);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGQUIT', () => shutdown('SIGQUIT'));

        // Windows-specific events
        process.on('SIGHUP', () => shutdown('SIGHUP'));

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('❌ Uncaught exception:', error);
            shutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
            shutdown('unhandledRejection');
        });
    }
}

async function main() {
    try {
        console.log(chalk.cyan('🛡️  Sneh Creation Device Protector'));
        console.log(chalk.gray('   Enterprise Device Security Solution'));
        console.log('');

        const deviceProtector = new SnehDeviceProtector();
        await deviceProtector.initialize();

    } catch (error) {
        console.error(chalk.red('❌ Failed to start Device Protector:'), error);
        process.exit(1);
    }
}

main();
