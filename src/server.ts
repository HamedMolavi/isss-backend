import express from 'express';
import { Request, Response } from 'express';

const app = express();

app.get('/', (req: Request, res: Response) => {
    res.send('Application works!');
});

app.get('/test', (req: Request, res: Response) => {
    res.send('test connect open project to github');
});

app.listen(3000, () => {
    console.log('Application started on http://localhost:3000');
});