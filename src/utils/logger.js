#!/usr/bin/env bun

import winston from 'winston';
import { join } from 'path';

export class Logger {
    constructor(module = 'App') {
        this.module = module;
        this.winston = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.printf(({ timestamp, level, message, stack }) => {
                    return `${timestamp} [${level.toUpperCase()}] [${this.module}] ${message}${stack ? '\n' + stack : ''}`;
                })
            ),
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(
                        winston.format.colorize(),
                        winston.format.simple()
                    )
                }),
                new winston.transports.File({ 
                    filename: join(process.cwd(), 'logs', 'error.log'), 
                    level: 'error' 
                }),
                new winston.transports.File({ 
                    filename: join(process.cwd(), 'logs', 'combined.log') 
                })
            ]
        });
    }
    
    info(message, ...args) {
        this.winston.info(message, ...args);
    }
    
    error(message, ...args) {
        this.winston.error(message, ...args);
    }
    
    warn(message, ...args) {
        this.winston.warn(message, ...args);
    }
    
    debug(message, ...args) {
        this.winston.debug(message, ...args);
    }
    
    verbose(message, ...args) {
        this.winston.verbose(message, ...args);
    }
}
