import express, { Express, Request, Response } from 'express';

const app: Express = express();

app.get('/', (req: Request, res: Response) => {
    res.send('Application works!');
});

app.get('/github', (req: Request, res: Response) => {
    res.send('Github works!');
});

app.get('/test', (req: Request, res: Response) => {
    res.send('Test works!');
});

app.listen(3000, () => {
    console.log('Application started on http://localhost:3000');
});