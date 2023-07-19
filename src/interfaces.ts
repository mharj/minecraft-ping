/**
 * Object with hostname and port
 * @example
 * {hostname: 'localhost', port: 25565}
 */
export interface IAddress {
	/**
	 * Hostname of the server
	 */
	hostname: string;
	/**
	 * Port of the server
	 */
	port: number;
}

/**
 * Server handshake JSON payload
 */
export interface IHandshakeData {
	description: {
		text: string;
		extra?: {
			color?: string;
			text: string;
			bold?: boolean;
			strikethrough?: boolean;
			extra?: {
				color: string;
				text: string;
			}[];
		}[];
	};
	players: {
		online: number;
		max: number;
		sample?: {name: string; id: string}[];
	};
	version: {name: string; protocol: number};
	ping: number;
	modinfo?: {type: string; modList: string[]};
	favicon?: string;
}

export interface IMinecraftData extends IHandshakeData {
	ping: number;
}
