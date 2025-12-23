// backend/api/viability.js
const express = require('express');
const router = express.Router();
const BigQueryService = require('../services/bigquery.service');
const ValidationService = require('../services/validation.service');

// Middleware de logging
router.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Endpoint principal - viabilidade por coordenadas
router.get('/viability', async (req, res) => {
    try {
        const { lat, lng, radius = 300 } = req.query;
        
        // Validação
        const coordValidation = ValidationService.validateCoordinates(lat, lng);
        if (!coordValidation.isValid) {
            return res.status(400).json({
                error: 'Coordenadas inválidas',
                details: coordValidation.errors
            });
        }
        
        const radiusValidation = ValidationService.validateRadius(radius);
        if (!radiusValidation.isValid) {
            return res.status(400).json({
                error: 'Parâmetro radius inválido',
                details: radiusValidation.error
            });
        }
        
        const { lat: latitude, lng: longitude } = coordValidation.coordinates;
        const finalRadius = radiusValidation.radius;
        
        // Consulta ao BigQuery
        const ctoResults = await BigQueryService.checkCTOsProximity(
            latitude, 
            longitude, 
            finalRadius
        );
        
        // Busca CTO mais próxima para informações adicionais
        const ctoMaisProxima = await BigQueryService.getCTOMaisProxima(latitude, longitude);
        
        res.json({
            success: true,
            metadata: {
                coordenadas_consulta: { latitude, longitude },
                raio_metros: finalRadius,
                timestamp: new Date().toISOString(),
                total_resultados: ctoResults.length
            },
            cto_mais_proxima: ctoMaisProxima,
            viabilidade_geral: ctoResults.length > 0 ? 'VIÁVEL' : 'NÃO VIÁVEL',
            resultados: ctoResults,
            recomendacoes: this.gerarRecomendacoes(ctoResults)
        });
        
    } catch (error) {
        console.error('Erro no endpoint /viability:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// Endpoint para busca por texto
router.get('/buscar', async (req, res) => {
    try {
        const { q } = req.query;
        
        if (!q || q.trim().length < 3) {
            return res.status(400).json({
                error: 'Termo de busca deve ter pelo menos 3 caracteres'
            });
        }
        
        const resultados = await BigQueryService.buscarCTOsPorTexto(q.trim());
        
        res.json({
            success: true,
            termo_busca: q,
            total_resultados: resultados.length,
            resultados: resultados
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para área do mapa
router.get('/area', async (req, res) => {
    try {
        const { north, south, east, west } = req.query;
        
        // Validação das coordenadas da área
        if (!north || !south || !east || !west) {
            return res.status(400).json({
                error: 'Coordenadas da área são obrigatórias (north, south, east, west)'
            });
        }
        
        const bounds = {
            north: parseFloat(north),
            south: parseFloat(south),
            east: parseFloat(east),
            west: parseFloat(west)
        };
        
        const resultados = await BigQueryService.getCTOsPorArea(bounds);
        
        res.json({
            success: true,
            area: bounds,
            total_ctos: resultados.length,
            ctos: resultados
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint de estatísticas
router.get('/estatisticas', async (req, res) => {
    try {
        const estatisticas = await BigQueryService.getEstatisticasCTOs();
        
        res.json({
            success: true,
            ...estatisticas,
            atualizado_em: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Método auxiliar para gerar recomendações
router.gerarRecomendacoes = (ctoResults) => {
    if (ctoResults.length === 0) {
        return ['Nenhuma CTO encontrada no raio especificado'];
    }
    
    const recomendacoes = [];
    const ctoMaisProxima = ctoResults[0];
    
    if (ctoMaisProxima.distancia_metros <= 300) {
        recomendacoes.push('✅ CTO dentro do raio padrão de 300m');
        if (ctoMaisProxima.capacidade_disponivel > 0) {
            recomendacoes.push('✅ Capacidade disponível para nova instalação');
        } else {
            recomendacoes.push('⚠️ CTO sem capacidade disponível - verificar expansão');
        }
    } else {
        recomendacoes.push('⚠️ CTO mais próxima está a mais de 300m');
        recomendacoes.push('💡 Considerar estudo de viabilidade técnica para extensão');
    }
    
    return recomendacoes;
};

module.exports = router;