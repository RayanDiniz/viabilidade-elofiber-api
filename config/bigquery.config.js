// backend/config/bigquery.config.js - VERSÃO VERCEL
const { BigQuery } = require('@google-cloud/bigquery');

class BigQueryConfig {
    constructor() {
        // Configurações do Vercel
        this.projectId = process.env.GCP_PROJECT_ID || 'elofiber';
        this.datasetId = process.env.BIGQUERY_DATASET || 'viabilidade';
        this.location = process.env.BIGQUERY_REGION || 'US';
        
        // Inicializar BigQuery de acordo com o ambiente
        this.bigquery = this.initializeBigQuery();
    }

    initializeBigQuery() {
        // Ambiente Vercel - usa JSON string
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
            try {
                console.log('🔧 Configurando BigQuery com GOOGLE_APPLICATION_CREDENTIALS_JSON');
                
                const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
                
                return new BigQuery({
                    projectId: credentials.project_id || this.projectId,
                    credentials: credentials,
                    keyFilename: null, // Importante!
                });
            } catch (error) {
                console.error('❌ Erro ao parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:', error.message);
                throw error;
            }
        }
        
        // Ambiente local com arquivo
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.log('🔧 Configurando BigQuery com GOOGLE_APPLICATION_CREDENTIALS');
            return new BigQuery({
                projectId: this.projectId,
                keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
            });
        }
        
        // ADC (Application Default Credentials) - Cloud Run, etc.
        console.log('⚠️  Usando Application Default Credentials');
        return new BigQuery({
            projectId: this.projectId
        });
    }

    async testConnection() {
        try {
            const [datasets] = await this.bigquery.getDatasets();
            console.log(`✅ Conectado ao BigQuery! Projeto: ${this.projectId}`);
            console.log(`📊 Dataset atual: ${this.datasetId}`);
            console.log(`📍 Região: ${this.location}`);
            return true;
        } catch (error) {
            console.error('❌ Falha na conexão com BigQuery:', error.message);
            
            // Log detalhado para debug
            console.log('🔍 Debug informações:');
            console.log('- NODE_ENV:', process.env.NODE_ENV);
            console.log('- GCP_PROJECT_ID:', process.env.GCP_PROJECT_ID);
            console.log('- BIGQUERY_DATASET:', process.env.BIGQUERY_DATASET);
            console.log('- GOOGLE_APPLICATION_CREDENTIALS_JSON existe?', !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
            
            return false;
        }
    }

    getDataset() {
        return this.datasetId;
    }

    getFullTableName(tableName) {
        return `\`${this.projectId}.${this.datasetId}.${tableName}\``;
    }

    getViews() {
        return {
            VIABILIDADE: 'vw_viabilidade'
        };
    }
}

module.exports = new BigQueryConfig();