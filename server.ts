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

	io.emit('clients', { clients });

	socket.on('message', msg => {
		io.emit('message', { nick: clients[socket.id].name, message: msg.message });
	});

	socket.on('pip', async msg => {
		const permissions = await auth0.getUserPermissions({ id: clients[socket.id].id });
		const found = permissions.find(item => item.permission_name === 'write:pip');
		if (found) {
			io.emit('pip', { pip: msg.pip });
		} else {
			socket.emit('message', { message: `No tienes permisos suficientes para compartir PiP.` });
		}
	});

	socket.on('name', async msg => {
		try {
			await auth0.updateUser({ id: clients[socket.id].id }, { name: msg.name });
		} catch (error) {
			socket.emit('message', { message: `Ocurrió un error al cambiar el nombre, intenta mas tarde.` });
			return;
		}

		const oldName = clients[socket.id].name;
		clients[socket.id].name = msg.name;

		io.emit('message', { message: `${oldName} es ahora ${msg.name}`, clients });
	});

	socket.on('disconnect', () => {
		const nick = clients[socket.id].name;
		const { [socket.id]: disconnected, ...connectedClients } = clients;
		clients = connectedClients;

		io.emit('clients', { clients });
	});
});

http.listen(process.env.PORT ?? 3000, function() {
	console.log('server running');
});
