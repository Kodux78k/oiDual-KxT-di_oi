/**
 * DUAL SYSTEM // APPS READER MODULE
 * Leitura passiva da base de dados unificada do Fusion OS.
 */
function getDualSystemApps() {
    // Chave Mestra Unificada
    const STORAGE_KEY = 'DI_SYSTEM_DUAL_APPS';
    
    try {
        const rawData = localStorage.getItem(STORAGE_KEY);
        if (!rawData) {
            console.log("Dual System: Nenhum banco de dados encontrado.");
            return [];
        }
        
        const parsedData = JSON.parse(rawData);
        
        // Retorna a lista de instalados ou array vazio
        return parsedData.installed || [];
        
    } catch (error) {
        console.error("Dual System Error: Falha ao ler apps.", error);
        return [];
    }
}

// Exemplo de uso:
// const meusApps = getDualSystemApps();
// console.log(meusApps);
