import type {IAddress} from './interfaces.mjs';
import varInt from 'varint';

const PROTOCOL_VERSION = 736; // Minecraft 1.16.1

export enum MinecraftPackageType {
	HANDSHAKE = 0,
	PING = 1,
}

/**
 * Wrapper for creating Minecraft packets
 * @param {MinecraftPackageType} packetId - packet id
 * @param {Buffer} data - packet data
 * @returns {Buffer} packet buffer data
 */
function createPacket(packetId: MinecraftPackageType, data: Buffer): Buffer {
	return Buffer.concat([Buffer.from(varInt.encode(varInt.encodingLength(packetId) + data.length)), Buffer.from(varInt.encode(packetId)), data]);
}

/**
 * Create Minecraft handshake packet
 * @param {IAddress} address
 * @returns {Buffer} handshake packet buffer data
 */
export function createHandshakePacket(address: IAddress): Buffer {
	const portBuffer = Buffer.allocUnsafe(2);
	portBuffer.writeUInt16BE(address.port, 0);
	// Return hansdhake packet with request packet
	return Buffer.concat([
		createPacket(
			MinecraftPackageType.HANDSHAKE,
			Buffer.concat([
				Buffer.from(varInt.encode(PROTOCOL_VERSION)),
				Buffer.from(varInt.encode(address.hostname.length)),
				Buffer.from(address.hostname, 'utf8'),
				portBuffer,
				Buffer.from(varInt.encode(1)),
			]),
		),
		createPacket(0, Buffer.alloc(0)),
	]);
}

/**
 * Create ping packet
 * @param {bigint} timestamp
 * @returns {Buffer} ping packet buffer data
 */
export function createPingPacket(timestamp: bigint): Buffer {
	const pingBuffer = Buffer.allocUnsafe(8);
	pingBuffer.writeBigUInt64BE(timestamp);
	return createPacket(MinecraftPackageType.PING, pingBuffer);
}
