import express, { Request, Response, Express } from 'express';

const app: Express = express();

app.get('/', (req: Request, res: Response) => {
    res.end('Application works!');
});

app.get('/test', (req: Request, res: Response) => {
    res.end('test connect open project to github');
});

app.listen(3000, () => {
    console.log('Application started on http://localhost:3000');
});