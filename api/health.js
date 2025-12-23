// backend/api/health.js
const express = require('express');
const router = express.Router();
const BigQueryService = require('../services/bigquery.service');

// Health check básico
router.get('/', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        service: 'FTTH Viabilidade API',
        status: 'UP',
        version: process.env.npm_package_version || '1.0.0',
        node_version: process.version,
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
    };
    
    try {
        res.status(200).json(healthcheck);
    } catch (error) {
        healthcheck.status = 'DOWN';
        healthcheck.error = error.message;
        res.status(503).json(healthcheck);
    }
});

// Health check completo (incluindo conexão com BigQuery)
router.get('/detailed', async (req, res) => {
    const healthcheck = {
        timestamp: new Date().toISOString(),
        service: 'FTTH Viabilidade API',
        checks: {
            api: { status: 'UP' },
            bigquery: { status: 'CHECKING' }
        }
    };
    
    try {
        // Testa conexão com BigQuery
        const query = 'SELECT 1 as test';
        const [job] = await BigQueryService.bigquery.createQueryJob({ query });
        await job.getQueryResults();
        
        healthcheck.checks.bigquery = {
            status: 'UP',
            projectId: BigQueryService.config.projectId,
            dataset: BigQueryService.config.datasetId
        };
        
        res.status(200).json(healthcheck);
    } catch (error) {
        healthcheck.checks.bigquery = {
            status: 'DOWN',
            error: error.message
        };
        res.status(503).json(healthcheck);
    }
});

// Health check simplificado para load balancers
router.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// Health check com métricas
router.get('/metrics', (req, res) => {
    const metrics = {
        timestamp: new Date().toISOString(),
        process: {
            uptime: process.uptime(),
            memory: {
                rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
                heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
                heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
            },
            cpu: process.cpuUsage()
        },
        system: {
            arch: process.arch,
            platform: process.platform
        }
    };
    
    res.status(200).json(metrics);
});

module.exports = router;