// backend/app.js - VERSÃO ATUALIZADA
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importar rotas
const viabilityRouter = require('./api/viability');
const healthRouter = require('./api/health');

const app = express();

// ============================================
// MIDDLEWARES DE SEGURANÇA E CONFIGURAÇÃO
// ============================================

// Helmet para headers de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configurado para o seu frontend
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 horas
};
app.use(cors(corsOptions));

// Rate Limiting - previne abuso da API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limites diferentes para dev/prod
  message: {
    error: 'Muitas requisições deste IP. Tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Parser de JSON
app.use(express.json({ limit: '10mb' }));

// ============================================
// ROTAS DA API
// ============================================

// Health Check (importante para monitoramento)
app.use('/health', healthRouter);

// API principal
app.use('/api', viabilityRouter);

// ============================================
// ROTA RAIZ - DOCUMENTAÇÃO DA API
// ============================================

app.get('/', (req, res) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  
  res.json({
    service: 'API de Viabilidade FTTH - CTOs',
    version: '2.0.0',
    description: 'API para consulta de viabilidade técnica baseada em proximidade de CTOs',
    environment: process.env.NODE_ENV || 'development',
    documentation: {
      endpoints: {
        viabilidade: {
          url: `${baseUrl}/api/viability?lat={latitude}&lng={longitude}&radius={metros}`,
          method: 'GET',
          description: 'Consulta CTOs em um raio específico',
          parameters: {
            lat: 'Latitude do ponto de consulta (obrigatório)',
            lng: 'Longitude do ponto de consulta (obrigatório)',
            radius: 'Raio em metros (opcional, padrão: 300)'
          }
        },
        busca: {
          url: `${baseUrl}/api/buscar?q={termo}`,
          method: 'GET',
          description: 'Busca CTOs por nome ou descrição',
          parameters: {
            q: 'Termo de busca (mínimo 3 caracteres)'
          }
        },
        area: {
          url: `${baseUrl}/api/area?north={lat}&south={lat}&east={lng}&west={lng}`,
          method: 'GET',
          description: 'Lista CTOs dentro de uma área do mapa',
          parameters: {
            north: 'Latitude norte do retângulo',
            south: 'Latitude sul do retângulo',
            east: 'Longitude leste do retângulo',
            west: 'Longitude oeste do retângulo'
          }
        },
        estatisticas: {
          url: `${baseUrl}/api/estatisticas`,
          method: 'GET',
          description: 'Estatísticas gerais das CTOs'
        }
      },
      health: {
        url: `${baseUrl}/health`,
        method: 'GET',
        description: 'Verifica saúde da API e conexão com BigQuery'
      }
    },
    links: {
      frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
      github: 'https://github.com/seu-repositorio/ftth-viabilidade',
      documentation: 'https://docs.seu-dominio.com/api'
    },
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// MIDDLEWARE DE LOG DE REQUISIÇÕES
// ============================================

app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// ============================================
// MIDDLEWARE DE ERRO PADRÃO
// ============================================

app.use((err, req, res, next) => {
  console.error('❌ Erro na API:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  // Erro de validação
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Erro de validação',
      details: err.errors
    });
  }
  
  // Erro de BigQuery
  if (err.message && err.message.includes('BigQuery')) {
    return res.status(503).json({
      success: false,
      error: 'Serviço de dados temporariamente indisponível',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Tente novamente mais tarde'
    });
  }
  
  // Erro padrão
  res.status(err.status || 500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Entre em contato com o administrador',
    requestId: req.headers['x-request-id'] || Math.random().toString(36).substr(2, 9)
  });
});

// ============================================
// MIDDLEWARE 404 - ROTA NÃO ENCONTRADA
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    suggestion: 'Verifique a documentação em /',
    requestedUrl: req.originalUrl,
    availableEndpoints: [
      '/api/viability',
      '/api/buscar',
      '/api/area',
      '/api/estatisticas',
      '/health'
    ]
  });
});

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Função para inicialização segura
async function startServer() {
 try {
    console.log('🔧 Iniciando configuração...');
    
    // Testar conexão com BigQuery
    const BigQueryConfig = require('./config/bigquery.config');
    const isConnected = await BigQueryConfig.testConnection();
    
    if (!isConnected) {
      console.error('❌ Não foi possível conectar ao BigQuery. Verifique as credenciais.');
      
      // No Vercel, continuamos mesmo com erro para ver logs
      if (process.env.NODE_ENV === 'production') {
        console.log('⚠️  Continuando em modo degradado...');
      } else {
        throw new Error('Falha na conexão com BigQuery');
      }
    }

    // Verificar variáveis de ambiente críticas
    if (!process.env.GCP_PROJECT_ID && NODE_ENV === 'production') {
      console.warn('⚠️  GCP_PROJECT_ID não configurado');
    }
    
    if (!process.env.BIGQUERY_DATASET && NODE_ENV === 'production') {
      console.warn('⚠️  BIGQUERY_DATASET não configurado');
    }
    
    app.listen(PORT, () => {
      console.log(`
🚀 API FTTH Viabilidade iniciada com sucesso!
      
📊 Informações:
   • Ambiente: ${NODE_ENV}
   • Porta: ${PORT}
   • URL: http://localhost:${PORT}
   • Health Check: http://localhost:${PORT}/health
   • Documentação: http://localhost:${PORT}/
      
🔧 Configurações:
   • Projeto GCP: ${process.env.GCP_PROJECT_ID || 'Não configurado'}
   • Dataset: ${process.env.BIGQUERY_DATASET || 'Não configurado'}
   • Região: ${process.env.BIGQUERY_REGION || 'southamerica-east1'}
      
📡 Endpoints disponíveis:
   • GET  /api/viability     - Consulta viabilidade
   • GET  /api/buscar        - Busca CTOs
   • GET  /api/area          - CTOs por área
   • GET  /api/estatisticas  - Estatísticas
   • GET  /health            - Health check
      
✅ API pronta para receber requisições!
      `);
    });
    
  } catch (error) {
    console.error('❌ Falha ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Manipulador de sinais para graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔻 Recebido SIGTERM. Encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🔻 Recebido SIGINT. Encerrando servidor...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Erro não tratado:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promise rejeitada não tratada:', reason);
});

// Iniciar servidor
startServer();

module.exports = app; // Para testes