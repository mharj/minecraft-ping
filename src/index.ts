import {toBufferBE} from 'bigint-buffer';
import {resolveSrv} from 'dns';
import {createConnection, isIP} from 'net';
import * as url from 'url';
import {encode, encodingLength} from 'varint';
import {IAddress, IHandshakeData, IMinecraftData} from './interfaces';
import {PacketDecoder} from './PacketDecoder';

const PROTOCOL_VERSION = 335; // Minecraft 1.12

/**
 * ping with URI
 * @param uri minecraft://server[:port]
 */
export const pingUri = async (uri: string) => {
	const {protocol, hostname, port} = url.parse(uri);
	if (!hostname || !protocol || protocol !== 'minecraft:') {
		throw new TypeError('not correct minecraft URI');
	}
	return ping(hostname, port ? parseInt(port, 10) : undefined);
};

/**
 * ping with hostname and port
 * @param hostname hostname
 * @param port port number (defaults 25565)
 */
export const ping = async (hostname: string = 'localhost', port: number = 25565): Promise<IMinecraftData> => {
	let address: IAddress = {hostname, port};
	try {
		address = await checkSrvRecord(address.hostname);
	} catch (err) {
		// ignore
	}
	return openConnection(address);
};

const checkSrvRecord = (hostname: string): Promise<IAddress> => {
	return new Promise((resolve, reject) => {
		if (isIP(hostname) !== 0) {
			reject(new Error('Hostname is an IP address'));
		} else {
			resolveSrv('_minecraft._tcp.' + hostname, (error, result) => {
				if (error) {
					reject(error);
				} else {
					if (!resolve[0]) {
						reject(new Error('dns: no srv found with name'));
					}
					resolve({
						hostname: result[0].name,
						port: result[0].port,
					});
				}
			});
		}
	});
};

const openConnection = (address: IAddress): Promise<IMinecraftData> => {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	return new Promise((resolve, reject) => {
		const socket = createConnection(address.port, address.hostname, async () => {
			const packetDecoder = new PacketDecoder();
			socket.pipe(packetDecoder);
			packetDecoder.once('error', (error) => {
				socket.destroy();
				if (timeout) {
					clearTimeout(timeout);
				}
				reject(error);
			});
			// handshake
			socket.write(createHandshakePacket(address));
			const handshakeData = await packetDecoder.oncePromise<IHandshakeData>('handshake');
			// ping
			socket.write(createPingPacket(BigInt(Date.now())));
			const pingData = await packetDecoder.oncePromise<number>('pong');
			if (timeout) {
				clearTimeout(timeout);
			}
			socket.end();

			resolve({
				...handshakeData,
				ping: pingData,
			});
		});
		// Destroy on error
		socket.once('error', (error) => {
			socket.destroy();
			if (timeout) {
				clearTimeout(timeout);
			}
			reject(error);
		});

		// Destroy on timeout
		socket.once('timeout', () => {
			socket.destroy();
			if (timeout) {
				clearTimeout(timeout);
			}
			reject(new Error('Timed out'));
		});

		// Packet timeout (10 seconds)
		timeout = setTimeout(() => {
			socket.end();
			reject(new Error('Timed out (10 seconds passed)'));
		}, 10000);
	});
};

const createHandshakePacket = (address: IAddress): Buffer => {
	const portBuffer = Buffer.allocUnsafe(2);
	portBuffer.writeUInt16BE(address.port, 0);
	// Return hansdhake packet with request packet
	return Buffer.concat([
		createPacket(
			0,
			Buffer.concat([
				Buffer.from(encode(PROTOCOL_VERSION)),
				Buffer.from(encode(address.hostname.length)),
				Buffer.from(address.hostname, 'utf8'),
				portBuffer,
				Buffer.from(encode(1)),
			]),
		),
		createPacket(0, Buffer.alloc(0)),
	]);
};

const createPingPacket = (timestamp: bigint) => {
	return createPacket(1, toBufferBE(timestamp, 8));
};

const createPacket = (packetId: number, data: Buffer): Buffer => {
	return Buffer.concat([Buffer.from(encode(encodingLength(packetId) + data.length)), Buffer.from(encode(packetId)), data]);
};
