import express from 'express';
import { createServer } from 'http';
import Bundler from 'parcel-bundler';
import IO from 'socket.io';

const bundler = new Bundler(__dirname + '/src/index.html', {});
const app = express();
const http = createServer(app);
const io = IO(http);

app.use(bundler.middleware());

io.on('connection', socket => {
	socket.on('new-message', msg => {
		io.emit('new-message', msg);
	});
});

http.listen(3000, function() {
	console.log('server running');
});
