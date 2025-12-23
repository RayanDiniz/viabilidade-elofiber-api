// backend/services/bigquery.service.js
const BigQueryConfig = require('../config/bigquery.config');

class BigQueryService {
    constructor() {
        this.config = BigQueryConfig;
        this.bigquery = this.config.bigquery;
        this.views = this.config.getViews();
    }

    /**
     * Consulta CTOs próximas usando a nova view vw_viabilidade
     * @param {number} latitude 
     * @param {number} longitude 
     * @param {number} radius 
     * @returns {Promise<Array>}
     */
    async checkCTOsProximity(latitude, longitude, radius = 300) {
        // Extrai coordenadas do campo geometry
        const query = `
            WITH cliente_location AS (
                SELECT ST_GEOGPOINT(@longitude, @latitude) as point
            ),
            cto_locations AS (
                SELECT 
                    nome,
                    descricao,
                    -- Extrai coordenadas do campo geometry
                    ST_GEOGPOINT(
                        geometry.coordinates[OFFSET(0)],  -- longitude
                        geometry.coordinates[OFFSET(1)]   -- latitude
                    ) as cto_location,
                    geometry.coordinates[OFFSET(0)] as longitude_cto,
                    geometry.coordinates[OFFSET(1)] as latitude_cto
                FROM ${this.config.getFullTableName(this.views.VIABILIDADE)}
                WHERE geometry.coordinates IS NOT NULL
                  AND ARRAY_LENGTH(geometry.coordinates) >= 2
            )
            SELECT 
                nome as cto_id,
                nome,
                descricao as endereco,
                ST_DISTANCE(cl.point, ct.cto_location) as distancia_metros,
                ct.longitude_cto,
                ct.latitude_cto,
                -- Capacidade padrão (ajustar conforme seus dados)
                48 as capacidade_total,
                24 as capacidade_disponivel,  -- Exemplo
                'ATIVA' as status
            FROM cto_locations ct, cliente_location cl
            WHERE ST_DWITHIN(cl.point, ct.cto_location, @radius)
            ORDER BY distancia_metros
            LIMIT 20;
        `;

        const options = {
            query: query,
            params: {
                latitude: latitude,
                longitude: longitude,
                radius: radius
            },
            location: this.config.location
        };

        try {
            const [job] = await this.bigquery.createQueryJob(options);
            const [rows] = await job.getQueryResults();
            
            // Adiciona classificação de viabilidade
            return rows.map(row => ({
                ...row,
                viabilidade: this.classificarViabilidade(row.distancia_metros, row.capacidade_disponivel)
            }));
        } catch (error) {
            console.error('Erro na consulta de CTOs:', error);
            throw new Error(`Falha ao consultar CTOs: ${error.message}`);
        }
    }

    /**
     * Consulta detalhada da CTO mais próxima
     */
    async getCTOMaisProxima(latitude, longitude) {
        const query = `
            SELECT 
                nome as cto_id,
                nome,
                descricao as endereco,
                geometry.coordinates[OFFSET(0)] as longitude,
                geometry.coordinates[OFFSET(1)] as latitude,
                geometry.type as tipo_geometria
            FROM ${this.config.getFullTableName(this.views.VIABILIDADE)}
            WHERE geometry.coordinates IS NOT NULL
            ORDER BY ST_DISTANCE(
                ST_GEOGPOINT(@longitude, @latitude),
                ST_GEOGPOINT(
                    geometry.coordinates[OFFSET(0)],
                    geometry.coordinates[OFFSET(1)]
                )
            )
            LIMIT 1;
        `;

        const options = {
            query: query,
            params: { latitude, longitude },
            location: this.config.location
        };

        const [job] = await this.bigquery.createQueryJob(options);
        const [rows] = await job.getQueryResults();
        return rows[0] || null;
    }

    /**
     * Consulta todas as CTOs em uma área (para mapa)
     */
    async getCTOsPorArea(bounds) {
        // bounds = { north, south, east, west }
        const query = `
            SELECT 
                nome as cto_id,
                nome,
                descricao as endereco,
                geometry.coordinates[OFFSET(0)] as longitude,
                geometry.coordinates[OFFSET(1)] as latitude,
                geometry.type as tipo_geometria
            FROM ${this.config.getFullTableName(this.views.VIABILIDADE)}
            WHERE geometry.coordinates IS NOT NULL
              AND geometry.coordinates[OFFSET(1)] BETWEEN @south AND @north
              AND geometry.coordinates[OFFSET(0)] BETWEEN @west AND @east
            LIMIT 100;
        `;

        const options = {
            query: query,
            params: {
                north: bounds.north,
                south: bounds.south,
                east: bounds.east,
                west: bounds.west
            },
            location: this.config.location
        };

        const [job] = await this.bigquery.createQueryJob(options);
        const [rows] = await job.getQueryResults();
        return rows;
    }

    /**
     * Estatísticas das CTOs
     */
    async getEstatisticasCTOs() {
        const query = `
            SELECT 
                COUNT(*) as total_ctos,
                COUNT(DISTINCT nome) as cto_unicas,
                -- Média de coordenadas válidas
                AVG(CASE 
                    WHEN geometry.coordinates IS NOT NULL 
                    AND ARRAY_LENGTH(geometry.coordinates) >= 2 
                    THEN 1 ELSE 0 
                END) * 100 as percentual_com_coordenadas
            FROM ${this.config.getFullTableName(this.views.VIABILIDADE)};
        `;

        const [job] = await this.bigquery.createQueryJob({
            query: query,
            location: this.config.location
        });
        
        const [rows] = await job.getQueryResults();
        return rows[0];
    }

    /**
     * Busca CTOs por nome ou descrição
     */
    async buscarCTOsPorTexto(texto) {
        const query = `
            SELECT 
                nome as cto_id,
                nome,
                descricao as endereco,
                geometry.coordinates[OFFSET(0)] as longitude,
                geometry.coordinates[OFFSET(1)] as latitude
            FROM ${this.config.getFullTableName(this.views.VIABILIDADE)}
            WHERE (LOWER(nome) LIKE LOWER(@texto) 
                   OR LOWER(descricao) LIKE LOWER(@texto))
              AND geometry.coordinates IS NOT NULL
            LIMIT 20;
        `;

        const options = {
            query: query,
            params: { texto: `%${texto}%` },
            location: this.config.location
        };

        const [job] = await this.bigquery.createQueryJob(options);
        const [rows] = await job.getQueryResults();
        return rows;
    }

    classificarViabilidade(distancia, capacidadeDisponivel) {
        if (distancia <= 300 && capacidadeDisponivel > 0) {
            return 'ALTA - Dentro do raio e com capacidade';
        } else if (distancia <= 300 && capacidadeDisponivel === 0) {
            return 'MÉDIA - Dentro do raio mas sem capacidade';
        } else if (distancia <= 500 && capacidadeDisponivel > 0) {
            return 'MÉDIA - Fora do raio padrão, com capacidade';
        } else {
            return 'BAIXA - Fora do raio ou sem capacidade';
        }
    }
}

module.exports = new BigQueryService();