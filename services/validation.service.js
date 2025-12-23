// backend/services/validation.service.js
class ValidationService {
    validateCoordinates(lat, lng) {
        const errors = [];
        
        if (!lat || !lng) {
            errors.push('Latitude e longitude são obrigatórios');
            return { isValid: false, errors };
        }
        
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        
        if (isNaN(latNum) || isNaN(lngNum)) {
            errors.push('Coordenadas devem ser números válidos');
        }
        
        if (latNum < -90 || latNum > 90) {
            errors.push('Latitude deve estar entre -90 e 90 graus');
        }
        
        if (lngNum < -180 || lngNum > 180) {
            errors.push('Longitude deve estar entre -180 e 180 graus');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            coordinates: { lat: latNum, lng: lngNum }
        };
    }

    validateRadius(radius) {
        const defaultRadius = 300;
        const maxRadius = 2000;
        
        if (!radius) return { isValid: true, radius: defaultRadius };
        
        const radiusNum = parseInt(radius);
        
        if (isNaN(radiusNum) || radiusNum <= 0) {
            return { 
                isValid: false, 
                radius: defaultRadius, 
                error: 'Raio deve ser um número positivo' 
            };
        }
        
        if (radiusNum > maxRadius) {
            return { 
                isValid: false, 
                radius: defaultRadius, 
                error: `Raio máximo permitido é ${maxRadius}m` 
            };
        }
        
        return { isValid: true, radius: radiusNum };
    }
    
    validateBounds(north, south, east, west) {
        const errors = [];
        
        if (north <= south) {
            errors.push('North deve ser maior que south');
        }
        
        if (east <= west) {
            errors.push('East deve ser maior que west');
        }
        
        if (north > 90 || south < -90) {
            errors.push('Coordenadas de latitude fora do intervalo válido (-90 a 90)');
        }
        
        if (east > 180 || west < -180) {
            errors.push('Coordenadas de longitude fora do intervalo válido (-180 a 180)');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

module.exports = new ValidationService();