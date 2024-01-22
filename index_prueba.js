/****************** Obtener url de imagenes con Fetch ******************/

// Peticion fetch de tipo get a TwTube.app
fetch(`https://twtube.app/es/download?url=${post['post']}`, {
    method: 'GET'
})
    .then(response => response.text())
    .then(data => console.log(data))
    .catch(error => console.error('Error:', error));

/****************** Captura de Pantalla con Puppeteer ******************/

import puppeteer from "puppeteer";

async function captureScreenshot() {

    // Configuracion de pupeeteer
    const browser = await puppeteer.launch({
        headless: 'true', // Si quieres que Puppeteer se ejecute en modo sin cabeza (es decir, sin interfaz del navegador).
    });
    const page = await browser.newPage();
    await page.goto('https://twitter.com/ilonqueen/status/1462859657408487425');
    await page.waitForSelector('[data-testid="tweetPhoto"]'); // Asegúrate de reemplazar esto con el selector de CSS correcto.

    // Tomar captura de pantalla
    await page.screenshot({ path: 'example.png' });

    // Cerrar navegador de pupeeteer
    await browser.close();
}
captureScreenshot();
