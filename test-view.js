// backend/test-view.js
const BigQueryService = require('./services/bigquery.service');

async function testNovaView() {
    console.log('🧪 Testando nova view vw_viabilidade...\n');
    
    try {
        // 1. Testar consulta de viabilidade
        console.log('1. Testando consulta de viabilidade...');
        const ctoResults = await BigQueryService.checkCTOsProximity(
            -23.550520, // Exemplo: São Paulo
            -46.633308,
            300
        );
        
        console.log(`   ✅ Encontradas ${ctoResults.length} CTOs`);
        if (ctoResults.length > 0) {
            console.log(`   Primeira CTO: ${ctoResults[0].nome} (${ctoResults[0].distancia_metros}m)`);
        }
        
        // 2. Testar estatísticas
        console.log('\n2. Testando estatísticas...');
        const stats = await BigQueryService.getEstatisticasCTOs();
        console.log(`   ✅ Total de CTOs: ${stats.total_ctos}`);
        console.log(`   ✅ CTOs únicas: ${stats.cto_unicas}`);
        console.log(`   ✅ Com coordenadas: ${stats.percentual_com_coordenadas}%`);
        
        // 3. Testar busca por texto
        console.log('\n3. Testando busca por texto...');
        const buscaResults = await BigQueryService.buscarCTOsPorTexto('CTO');
        console.log(`   ✅ Resultados na busca: ${buscaResults.length}`);
        
        // 4. Testar CTO mais próxima
        console.log('\n4. Testando CTO mais próxima...');
        const maisProxima = await BigQueryService.getCTOMaisProxima(
            -23.550520,
            -46.633308
        );
        console.log(`   ✅ CTO mais próxima: ${maisProxima ? maisProxima.nome : 'Nenhuma encontrada'}`);
        
        console.log('\n🎉 Todos os testes passaram!');
        
    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        console.error('Detalhes:', error);
    }
}

// Executar teste
testNovaView();