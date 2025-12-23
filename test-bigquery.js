// backend/test-bigquery.js
const { BigQuery } = require('@google-cloud/bigquery');

async function testConnection() {
    const bigquery = new BigQuery();
    
    try {
        // Consulta simples para testar
        const [datasets] = await bigquery.getDatasets();
        console.log('✅ Conectado ao BigQuery!');
        console.log(`📊 Projeto: ${bigquery.projectId}`);
        console.log(`📁 Datasets disponíveis: ${datasets.map(d => d.id).join(', ')}`);
        
        // Testar acesso ao dataset específico
        const dataset = bigquery.dataset('viabilidade');
        const [tables] = await dataset.getTables();
        console.log(`📋 Tabelas no dataset 'viabilidade': ${tables.map(t => t.id).join(', ')}`);
        
        return true;
    } catch (error) {
        console.error('❌ Erro na conexão:', error.message);
        console.log('\n🔧 Solução de problemas:');
        console.log('1. Verifique se a conta de serviço tem as permissões corretas');
        console.log('2. Verifique se o arquivo JSON está no caminho correto');
        console.log('3. Verifique o nome do projeto e dataset');
        return false;
    }
}

testConnection();