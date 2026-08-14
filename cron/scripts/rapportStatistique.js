const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8100';

async function runMonthlyTask() {
    try {
        const res = await fetch(`${BACKEND_URL}/interne/tache-mensuelle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Ajoute un secret partagé si cette route interne doit être protégée
                'X-Internal-Secret': process.env.INTERNAL_SECRET || '',
            },
        });

        if (!res.ok) {
            throw new Error(`Backend a répondu ${res.status}`);
        }

        const data = await res.json();
        console.log('Tâche mensuelle exécutée avec succès:', data);
    } catch (err) {
        console.error('Échec de la tâche mensuelle:', err.message);
        process.exit(1);
    }
}

runMonthlyTask();