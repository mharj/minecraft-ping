import {createConnection, isIP, type Socket} from 'net';
import type {ILoggerLike} from '@avanio/logger-like';
import {Err, type IResult, Ok} from '@luolapeikko/result-option';
import {srvRecordResult} from './dnsSrv.mjs';
import type {IAddress, IHandshakeData, IMinecraftData} from './interfaces.mjs';
import {createHandshakePacket, createPingPacket} from './minecraftPackets.mjs';
import {PacketDecoder} from './PacketDecoder.mjs';
export * from './interfaces.mjs';
export * from './minecraftPackets.mjs';
export * from './PacketDecoder.mjs';
export * from './dnsSrv.mjs';

const defaultAddress: IAddress = {
	hostname: 'localhost',
	port: 25565,
};

/**
 * Type to get value directly, from promise or from function
 * @template T type of value
 */
export type Loadable<T> = T | Promise<T> | (() => T | Promise<T>);

/**
 * Build Loadable Address type
 */
export type LoadableAddress = Loadable<Partial<IAddress>>;

/**
 * Build Loadable URL type
 */
export type LoadableUrl = Loadable<URL | string>;

/**
 * Ensure that we have Error object
 */
function ensureError(error: unknown): Error {
	if (error instanceof Error) {
		return error;
	}
	if (typeof error === 'string') {
		return new Error(error);
	}
	return new Error(`unknown error: ${JSON.stringify(error)}`);
}

/**
 * Options for ping
 * @interface Options
 * @property {number=} timeout timeout in milliseconds
 */
export interface CommonOptions {
	/** connection timeout in milliseconds, default is 10000 */
	timeout?: number;
	logger?: ILoggerLike;
}

/**
 * Check SRV record and return hostname and port (IAddress)
 * @param {string} hostname
 * @returns {Promise<IAddress | undefined>} Promise that resolves to IAddress or undefined
 */
async function checkSrvRecord(hostname: string, options: CommonOptions): Promise<IAddress | undefined> {
	// if hostname is IP, return undefined
	if (isIP(hostname) !== 0) {
		options.logger?.debug(`checkSrvRecord: ${hostname} is IP, returning undefined`);
		return undefined;
	}
	const dnsResult = await srvRecordResult(`_minecraft._tcp.${hostname}`);
	if (dnsResult.isErr) {
		options.logger?.debug(`checkSrvRecord: ${hostname} has no SRV record, returning undefined`);
		return undefined;
	}
	const {name, port} = dnsResult.ok();
	return {
		hostname: name,
		port,
	};
}

function urlToAddress(uri: URL | string, options: CommonOptions): Partial<IAddress> {
	const address: Partial<IAddress> = {};
	const {protocol, hostname, port} = typeof uri === 'string' ? new URL(uri) : uri;
	if (!hostname || !protocol || protocol !== 'minecraft:') {
		throw new TypeError('not correct minecraft URI');
	}
	const realPort = port ? parseInt(port, 10) : undefined;
	if (realPort && isNaN(realPort)) {
		throw new TypeError('not correct minecraft URI');
	}
	if (hostname) {
		address.hostname = hostname;
	}
	if (realPort) {
		address.port = realPort;
	}
	options.logger?.debug(`urlToAddress: ${uri.toString()} => ${JSON.stringify(address)}`);
	return address;
}

/**
 * ping with URI
 * @param {LoadableUrl} uriArg minecraft://server[:port]
 * @param {CommonOptions=} options options
 * @return {Promise<IMinecraftData>}
 */
export async function pingUri(uriArg: LoadableUrl, options: CommonOptions = {}): Promise<IMinecraftData> {
	const uri = await (typeof uriArg === 'function' ? uriArg() : uriArg);
	return ping(urlToAddress(uri, options), options);
}

/**
 * ping with URI, return result object
 * @param {LoadableUrl} uriArg minecraft://server[:port]
 * @param {CommonOptions=} options options
 * @return {Promise<Result<IMinecraftData, Error>>}
 */
export async function pingUriResult(uriArg: LoadableUrl, options: CommonOptions = {}): Promise<IResult<IMinecraftData, Error>> {
	try {
		return Ok(await pingUri(uriArg, options));
	} catch (err) {
		return Err(ensureError(err));
	}
}

/**
 * ping with hostname and port
 * @param {LoadableAddress=} addressArg address object (defaults {hostname: 'localhost', port: 25565})
 * @param {CommonOptions=} options options
 * @returns {Promise<IMinecraftData>}
 */
export async function ping(addressArg?: LoadableAddress, options: CommonOptions = {}): Promise<IMinecraftData> {
	let address: IAddress = Object.assign({}, defaultAddress, await (typeof addressArg === 'function' ? addressArg() : addressArg));
	if (address.hostname !== 'localhost') {
		const dnsAddress = await checkSrvRecord(address.hostname, options);
		if (dnsAddress) {
			address = dnsAddress;
		}
	}
	options.logger?.info(`ping: ${address.hostname}:${address.port.toString()}`);
	return openConnection(address, options);
}

/**
 * ping with hostname and port, return result object
 * @param {LoadableAddress=} addressArg address object (defaults {hostname: 'localhost', port: 25565})
 * @param {CommonOptions=} options options
 * @returns {Promise<Result<IMinecraftData>>}
 */
export async function pingResult(addressArg?: LoadableAddress, options: CommonOptions = {}): Promise<IResult<IMinecraftData, Error>> {
	try {
		return Ok(await ping(addressArg, options));
	} catch (err) {
		return Err(ensureError(err));
	}
}

function openConnection(address: IAddress, options: CommonOptions): Promise<IMinecraftData> {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	return new Promise((resolve, reject) => {
		const handleError = (error: Error, thisSocket: Socket) => {
			thisSocket.destroy();
			if (timeout) {
				clearTimeout(timeout);
			}
			options.logger?.error(`openConnection: error: ${error.message}`);
			reject(error);
		};
		const socket = createConnection(address.port, address.hostname, async () => {
			options.logger?.debug(`openConnection: connected to ${address.hostname}:${address.port.toString()}`);
			const packetDecoder = new PacketDecoder();
			socket.pipe(packetDecoder); // attach decoder
			packetDecoder.once('error', (error) => handleError(error, socket));
			// send handshake
			options.logger?.debug(`openConnection: => sending handshake`);
			socket.write(createHandshakePacket(address));
			// wait for handshake data
			const handshakeData = await packetDecoder.oncePromise<IHandshakeData>('handshake');
			options.logger?.debug(`openConnection: <= received handshake data`);
			// send ping
			options.logger?.debug(`openConnection: => sending ping`);
			socket.write(createPingPacket(BigInt(Date.now())));
			// wait for pong
			const pingData = await packetDecoder.oncePromise<number>('pong');
			options.logger?.debug(`openConnection: <= received pong`);
			if (timeout) {
				clearTimeout(timeout);
			}
			socket.end();
			options.logger?.debug(`openConnection: end`);

			resolve({
				...handshakeData,
				ping: pingData,
			});
		});
		// Destroy on error
		socket.once('error', (error) => handleError(error, socket));
		// Destroy on timeout
		socket.once('timeout', () => {
			socket.destroy();
			if (timeout) {
				clearTimeout(timeout);
			}
			options.logger?.debug(`openConnection: timeout`);
			reject(new Error('Timed out'));
		});
		// Packet timeout
		const timeoutValue = options.timeout ?? 10000;
		timeout = setTimeout(() => {
			socket.end();
			reject(new Error(`Timed out (${timeoutValue.toString()} ms)`));
		}, timeoutValue);
	});
}
