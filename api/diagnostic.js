// backend/api/diagnostic.js
const express = require('express');
const BigQueryConfig = require('../config/bigquery.config');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        // Testar conexão
        const connectionOk = await BigQueryConfig.testConnection();
        
        // Informações seguras (sem credenciais)
        const envInfo = {
            node_env: process.env.NODE_ENV,
            vercel: process.env.VERCEL ? true : false,
            vercel_env: process.env.VERCEL_ENV,
            gcp_project_id: process.env.GCP_PROJECT_ID ? '✅' : '❌',
            bigquery_dataset: process.env.BIGQUERY_DATASET ? '✅' : '❌',
            bigquery_region: process.env.BIGQUERY_REGION ? '✅' : '❌',
            google_creds_json: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ? '✅' : '❌',
            google_creds_file: process.env.GOOGLE_APPLICATION_CREDENTIALS ? '✅' : '❌',
            frontend_url: process.env.FRONTEND_URL || '❌',
            server_time: new Date().toISOString(),
            uptime: process.uptime()
        };
        
        res.json({
            status: connectionOk ? 'healthy' : 'degraded',
            message: connectionOk 
                ? 'API operacional com conexão ao BigQuery' 
                : 'API operacional MAS sem conexão ao BigQuery',
            environment: envInfo,
            bigquery_config: {
                project: BigQueryConfig.projectId,
                dataset: BigQueryConfig.datasetId,
                location: BigQueryConfig.location
            },
            endpoints: {
                viability: '/api/viability?lat=-23.55052&lng=-46.633308',
                search: '/api/buscar?q=CTO',
                stats: '/api/estatisticas',
                health: '/health'
            }
        });
        
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            environment: {
                node_env: process.env.NODE_ENV,
                vercel: !!process.env.VERCEL
            }
        });
    }
});

module.exports = router;