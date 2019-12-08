import { ManagementClient } from 'auth0';
import express from 'express';
import { createServer } from 'http';
import Bundler from 'parcel-bundler';
import request from 'request';
import IO from 'socket.io';
import { promisify } from 'util';
import { client_id, client_secret, domain } from './.auth0-server';

const app = express();
const auth0 = new ManagementClient({
	domain,
	clientId: client_id,
	clientSecret: client_secret,
	scope: 'read:users update:users',
});
const http = createServer(app);
const io = IO(http);
const bundler = new Bundler(__dirname + '/src/index.html', {});
const req = promisify(request);

app.use(bundler.middleware());

let clients: { [key: string]: { name: string; id: string } } = {};

io.on('connection', async socket => {
	const {
		body: { name, sub },
	} = await req({
		url: `https://${domain}/userinfo`,
		method: 'get',
		json: true,
		headers: {
			Authorization: `Bearer ${socket.handshake.query.token}`,
		},
	});

	clients[socket.id] = { name, id: sub };

	io.emit('new-message', { message: `${clients[socket.id].name} se ha conectado`, clients });

	socket.on('new-message', msg => {
		io.emit('new-message', { nick: clients[socket.id].name, message: msg.message });
	});

	socket.on('new-name', async msg => {
		try {
			await auth0.updateUser({ id: clients[socket.id].id }, { name: msg.name });
		} catch (error) {
			socket.emit('new-message', { message: `Ocurrió un error al cambiar el nombre, intenta mas tarde.` });
			return;
		}

		const oldName = clients[socket.id].name;
		clients[socket.id].name = msg.name;

		io.emit('new-message', { message: `${oldName} es ahora ${msg.name}`, clients });
	});

	socket.on('disconnect', () => {
		const nick = clients[socket.id].name;
		const { [socket.id]: disconnected, ...connectedClients } = clients;
		clients = connectedClients;

		io.emit('new-message', { message: `${nick} se ha desconectado`, clients });
	});
});

http.listen(3000, function() {
	console.log('server running');
});
