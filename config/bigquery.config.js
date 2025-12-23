// backend/config/bigquery.config.js - VERSÃO UNIVERSAL
const { BigQuery } = require('@google-cloud/bigquery');

class BigQueryConfig {
    constructor() {
        // Carrega dotenv apenas em desenvolvimento local
        if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
            require('dotenv').config();
        }
        
        this.projectId = this.getEnv('GCP_PROJECT_ID', 'elofiber');
        this.datasetId = this.getEnv('BIGQUERY_DATASET', 'viabilidade');
        this.location = this.getEnv('BIGQUERY_REGION', 'US'); // Default US
        
        console.log('🔧 Configuração BigQuery:');
        console.log(`   Projeto: ${this.projectId}`);
        console.log(`   Dataset: ${this.datasetId}`);
        console.log(`   Região: ${this.location}`);
        console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
        
        this.bigquery = this.initializeBigQuery();
    }

    // Método seguro para pegar variáveis de ambiente
    getEnv(key, defaultValue) {
        // Prioridade: Variável de ambiente > .env file
        const value = process.env[key];
        
        if (value === undefined || value === null || value === '') {
            console.log(`⚠️  Variável ${key} não encontrada, usando default: ${defaultValue}`);
            return defaultValue;
        }
        
        return value;
    }

    initializeBigQuery() {
        console.log('🔌 Inicializando BigQuery...');
        
        // OPÇÃO 1: Vercel (GOOGLE_APPLICATION_CREDENTIALS_JSON)
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
            console.log('📁 Usando GOOGLE_APPLICATION_CREDENTIALS_JSON (Vercel)');
            try {
                const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
                console.log(`✅ Credenciais parseadas. Projeto: ${credentials.project_id}`);
                
                return new BigQuery({
                    projectId: credentials.project_id || this.projectId,
                    credentials: credentials,
                    location: this.location
                });
            } catch (error) {
                console.error('❌ Erro ao parsear GOOGLE_APPLICATION_CREDENTIALS_JSON:', error.message);
                console.error('Primeiros 100 chars do JSON:', 
                    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.substring(0, 100));
                throw error;
            }
        }
        
        // OPÇÃO 2: Desenvolvimento local (GOOGLE_APPLICATION_CREDENTIALS)
        if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.log('📁 Usando GOOGLE_APPLICATION_CREDENTIALS (arquivo local)');
            console.log(`Caminho: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
            
            return new BigQuery({
                projectId: this.projectId,
                keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                location: this.location
            });
        }
        
        // OPÇÃO 3: ADC (Application Default Credentials)
        console.log('⚠️  Usando Application Default Credentials');
        console.log('   (Cloud Run, Compute Engine, ou gcloud auth local)');
        
        return new BigQuery({
            projectId: this.projectId,
            location: this.location
        });
    }

    // Teste de conexão
    async testConnection() {
        try {
            console.log('🔍 Testando conexão com BigQuery...');
            const [datasets] = await this.bigquery.getDatasets();
            
            console.log('✅ Conexão bem-sucedida!');
            console.log(`   Projeto: ${this.projectId}`);
            console.log(`   Dataset atual: ${this.datasetId}`);
            console.log(`   Região: ${this.location}`);
            console.log(`   Total de datasets: ${datasets.length}`);
            
            // Verificar se o dataset específico existe
            const targetDataset = datasets.find(d => d.id === this.datasetId);
            if (targetDataset) {
                console.log(`✅ Dataset '${this.datasetId}' encontrado!`);
            } else {
                console.log(`⚠️  Dataset '${this.datasetId}' NÃO encontrado`);
            }
            
            return true;
        } catch (error) {
            console.error('❌ Falha na conexão com BigQuery:', error.message);
            console.error('Detalhes:', error);
            return false;
        }
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