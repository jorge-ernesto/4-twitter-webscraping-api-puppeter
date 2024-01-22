import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import puppeteer from 'puppeteer';

import axios from 'axios';
import fs from 'fs';
import path from 'path';

const app = express();
// app.use(express.json());
app.use(express.json({ limit: '10mb' }));
app.use(cors());

app.get('/test', (req, res) => {
    res.send('API funciona correctamente');
});

app.post('/test', (req, res) => {

    // Obtener datos
    const posts = req.body.posts;

    // Respuesta
    res.send({ status: 'success', posts: posts });
});

app.post('/posts', async (req, res) => {

    console.log('', '\n****************** Peticion HTTP ******************\n');

    // Obtener datos
    const username = req.body.username;
    const authToken = req.body.authToken;
    const posts = req.body.posts;
    let dataPosts = [];
    let dataPostsIteracion = [];

    // Debug
    console.log('username', username);
    console.log('authToken', authToken);

    // Crear carpeta si no existe
    const dir = `./uploads/${username}`;
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    // Crear el archivo con el número de elementos
    let cantidad = posts.length;
    fs.writeFileSync(path.join(dir, `cantidad_${cantidad}.txt`), '');

    // Configuracion de pupeeteer
    const browser = await puppeteer.launch({
        headless: 'true', // Si quieres que Puppeteer se ejecute en modo sin cabeza (es decir, sin interfaz del navegador).
        // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' // Ruta al ejecutable de Google Chrome en tu sistema
    });

    // Recorrer posts
    for (let i = 0; i < posts.length; i++) {
        let post = posts[i];
        dataPostsIteracion = [];

        // Debug
        console.log('', '\n******************\n')
        console.log('post', post);
        console.log('Número del elemento:', i);

        // Los posts son imagenes
        if (post['img'].startsWith('https://pbs.twimg.com/media')) {

            /****************** Obtener url de imagenes con Fetch ******************/
            try {

                // Peticion fetch de tipo get a 'https://twtube.app/es/'
                await fetch(`https://twtube.app/es/download?url=${post['post']}`, {
                    method: 'GET'
                })
                    .then(response => response.text())
                    .then(html => {
                        let links = html.match(/<div class="square-box">.*?<a.*?href="(.*?)".*?<\/a>.*?<\/div>/gs).map(a => a.match(/href=['"]([^'"]+)['"]/)[1]);
                        console.log('links', links);
                        dataPosts = dataPosts.concat(links);
                        dataPostsIteracion = dataPostsIteracion.concat(links);
                    })
                    // .catch(error => console.error('Error:', error));

                // Descargar imagen
                await descargarImagen(username, dir, dataPostsIteracion, i);
            } catch (error) {
                console.error('Error al obtener datos:', error);

                /****************** Obtener url de imagenes con Puppeteer ******************/
                try {

                    // Configuracion de pupeeteer
                    const page = await browser.newPage();
                    const cookies = [
                        { name: 'auth_token', value: `${authToken}`, domain: '.twitter.com' },
                    ];
                    await page.setCookie(...cookies);
                    await page.goto(post['post']);
                    // await page.waitForSelector('[data-testid="tweetPhoto"]', { timeout: 5000 }); // Asegúrate de reemplazar esto con el selector de CSS correcto.
                    await page.waitForSelector('[data-testid="tweetPhoto"]'); // Asegúrate de reemplazar esto con el selector de CSS correcto.

                    // Recorrer pagina
                    const data = await page.evaluate(() => {
                        // Obtener datos
                        let article = document.querySelector("article[tabindex='-1']");
                        let images = article.querySelectorAll("img");
                        let urls = [...images].map(img => img.src);

                        // Filtrar urls de imagenes del post
                        let urlsFiltradas = urls.filter(url => {
                            return url.startsWith('https://pbs.twimg.com/media');
                        });

                        // Limpiar urls de imagenes del post
                        let urlsLimpias = urlsFiltradas.map(url => {
                            if (url.startsWith('https://pbs.twimg.com/media')) {
                                return url.split('&name=')[0];
                            } else {
                                return url;
                            }
                        });

                        // Retornar datos de pagina
                        return urlsLimpias;
                    });
                    console.log('data', data);
                    dataPosts = dataPosts.concat(data);
                    dataPostsIteracion = dataPostsIteracion.concat(data);
                    // Cerrar Recorrer pagina

                    // Cerrar pagina
                    await page.close();

                    // Descargar imagen
                    await descargarImagen(username, dir, dataPostsIteracion, i);
                } catch (error) {
                    console.error('Error al obtener datos:', error);

                    // Limpiar urls de imagenes del post
                    if (post['img'].startsWith('https://pbs.twimg.com/media')) {
                        post['img'] = post['img'].split('&name=')[0];
                    } else {
                        post['img'] = post['img'];
                    }
                    console.log('data', post['img']);
                    dataPosts = dataPosts.concat(post['img']);
                    dataPostsIteracion = dataPostsIteracion.concat(post['img']);

                    // Descargar imagen
                    await descargarImagen(username, dir, dataPostsIteracion, i);

                    // Continuar con el siguiente post
                    continue;
                }

                // Continuar con el siguiente post
                continue;
            }
        } else { // Los posts son videos o gif
            console.log('data', post['img'], post['post']);
            dataPosts = dataPosts.concat(post['img'], post['post']);
            dataPostsIteracion = dataPostsIteracion.concat(post['img'], post['post']);

            // Descargar imagen
            await descargarImagen(username, dir, dataPostsIteracion, i);
        }
    }

    // Cerrar navegador de pupeeteer
    await browser.close();

    // Debug
    console.log('', '\n******************\n');
    console.log('dataPosts', dataPosts);

    // Respuesta
    res.send({ status: 'success', posts: dataPosts });
});

async function descargarImagen(username, dir, dataPostsIteracion, i) {

    // Descargar imagen y acceso directo por iteracion del bucle for
    console.log('dataPostsIteracion', dataPostsIteracion);
    const downloadPromises = dataPostsIteracion.map(async (url, i_) => {
        if (url.startsWith('https://pbs.twimg.com/media') || url.startsWith('https://pbs.twimg.com/tweet_video_thumb') || url.startsWith('https://pbs.twimg.com/ext_tw_video_thumb')) {
            // Descargar imagen
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            await new Promise((resolve, reject) => {
                fs.writeFile(path.join(dir, `${username}_${i}_${i_}.png`), response.data, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`Imagen ${i} ${i_} downloading!`);
                        resolve();
                    }
                });
            });
        } else {
            // Crear acceso directo
            await new Promise((resolve, reject) => {
                fs.writeFile(path.join(dir, `${username}_${i}_${i_}.url`), `[InternetShortcut]\nURL=${url}\n`, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log(`Shortcut ${i} ${i_} created!`);
                        resolve();
                    }
                });
            });
        }
    });
    await Promise.all(downloadPromises);
}

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
