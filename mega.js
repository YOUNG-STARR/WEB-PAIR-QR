const mega = require("megajs");

// ⚠️ Remplace par tes vraies informations MEGA
const auth = {
    email: process.env.MEGA_EMAIL || 'your_mega_email@example.com',
    password: process.env.MEGA_PASSWORD || 'your_mega_password',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
};

/**
 * Upload un fichier (stream) sur MEGA
 * @param {ReadableStream} data - Le stream du fichier à envoyer
 * @param {string} name - Le nom du fichier sur MEGA
 * @returns {Promise<string>} - URL de téléchargement du fichier
 */
const upload = (data, name) => {
    return new Promise((resolve, reject) => {
        if (!auth.email || !auth.password) {
            return reject(new Error("❌ Email ou mot de passe MEGA manquant."));
        }

        const storage = new mega.Storage(auth, () => {
            const uploader = storage.upload({ name });

            data.pipe(uploader);

            uploader.on('complete', (file) => {
                file.link((err, url) => {
                    storage.close();
                    if (err) return reject(err);
                    return resolve(url);
                });
            });

            uploader.on('error', (err) => {
                storage.close();
                reject(err);
            });
        });

        storage.on('error', reject);
    });
};

module.exports = { upload };
