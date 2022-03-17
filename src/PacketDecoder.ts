import internal, {Writable} from 'stream';
import {decode, encodingLength} from 'varint';

enum PackageType {
	HANDSHAKE = 0,
	PING = 1,
}

interface IHeader {
	id: PackageType;
	length: number;
	offset: number;
}

export class PacketDecoder extends Writable {
	private packetInfo: IHeader | undefined;
	private buffer: Buffer;

	constructor(options?: internal.WritableOptions | undefined) {
		super(options);
		this.buffer = Buffer.alloc(0);
	}

	public oncePromise<T>(event: string): Promise<T> {
		return new Promise((resolve) => {
			this.once(event, resolve);
		});
	}

	public async _write(chunk: Buffer, _encoding: BufferEncoding, callback: () => void): Promise<void> {
		const {getPayload, decodeHandshake, decodePong} = this;
		if (!this.packetInfo) {
			this.packetInfo = this.decodeHeader(chunk);
		}
		this.buffer = Buffer.concat([this.buffer, chunk]);

		if (this.packetInfo) {
			if (this.buffer.length < this.packetInfo.length) {
				// do we still need to read more?
				return callback();
			}
			if (this.buffer.length > this.packetInfo.length) {
				throw new Error('we did overrun expected data size!');
			}
		}
		try {
			if (this.packetInfo) {
				switch (this.packetInfo.id) {
					case PackageType.HANDSHAKE: {
						this.emit('handshake', decodeHandshake(getPayload(this.packetInfo, this.buffer)));
						break;
					}
					case PackageType.PING: {
						this.emit('pong', decodePong(getPayload(this.packetInfo, this.buffer)));
						break;
					}
					default:
						this.emit('error', new Error('Unknown packet id: ' + this.packetInfo.id));
				}
			}
			this.buffer = Buffer.alloc(0);
			this.packetInfo = undefined;
		} catch (err) {
			this.emit('error', err);
		}
		callback();
	}

	private decodeHeader(buffer: Buffer): IHeader {
		const length = decode(buffer);
		return {
			id: buffer.readUInt8(encodingLength(length)),
			length: length + encodingLength(length),
			offset: encodingLength(length) + 1,
		};
	}

	private getPayload(header: IHeader, data: Buffer) {
		return data.slice(header.offset, data.length);
	}

	private decodeHandshake(buffer: Buffer): Record<string, unknown> {
		const length = decode(buffer);
		const data = buffer.slice(encodingLength(length), encodingLength(length) + length);
		return JSON.parse(data.toString());
	}

	private decodePong(data: Buffer): number {
		const pongData = data.readBigUInt64BE(0);
		return Number(BigInt(Date.now()) - pongData);
	}
}
