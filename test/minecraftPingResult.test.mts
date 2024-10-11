/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable no-unused-expressions */
import {describe, expect, it} from 'vitest';
import {type IMinecraftData, pingResult, pingUriResult} from '../src/index.mjs';
import dotenv from 'dotenv';
import {type IResult} from '@luolapeikko/result-option';

dotenv.config();
const ifWeHaveEnv = process.env.MINECRAFT_SERVER && process.env.MINECRAFT_SERVER_PORT ? it : it.skip;

describe('minecraft result', () => {
	ifWeHaveEnv('connect and get data', async function () {
		const {MINECRAFT_SERVER, MINECRAFT_SERVER_PORT} = process.env;
		const result: IResult<IMinecraftData, Error> = await pingResult({
			hostname: MINECRAFT_SERVER,
			port: MINECRAFT_SERVER_PORT ? parseInt(MINECRAFT_SERVER_PORT, 10) : undefined,
		});
		const data: IMinecraftData = result.unwrap();
		expect(data).not.to.be.eq(null);
		expect(data).to.have.all.keys('description', 'players', 'version', 'ping', 'enforcesSecureChat');
		expect(data.description).to.have.all.keys('text');
		expect(data.players).to.contain.keys('online', 'max');
		expect(data.version).to.have.all.keys('name', 'protocol');
	});
	ifWeHaveEnv('connect and get data with uri', async () => {
		const {MINECRAFT_SERVER, MINECRAFT_SERVER_PORT} = process.env;
		const url = new URL('minecraft://' + MINECRAFT_SERVER + (MINECRAFT_SERVER_PORT ? ':' + parseInt(MINECRAFT_SERVER_PORT, 10) : ''));
		const result: IResult<IMinecraftData, Error> = await pingUriResult(Promise.resolve(url));
		const data: IMinecraftData = result.unwrap();
		expect(data).not.to.be.eq(null);
		expect(data).to.have.all.keys('description', 'players', 'version', 'ping', 'enforcesSecureChat');
		expect(data.description).to.have.all.keys('text');
		expect(data.players).to.contain.keys('online', 'max');
		expect(data.version).to.have.all.keys('name', 'protocol');
	});
	it('should not connect', async () => {
		const res: IResult<IMinecraftData, Error> = await pingResult({hostname: 'localhost', port: 26262});
		expect(res.isErr).to.be.eq(true);
	});
	it('should not connect with small timeout', async () => {
		const res: IResult<IMinecraftData, Error> = await pingResult({hostname: 'google.com', port: 26262}, {timeout: 100});
		expect(res.isErr).to.be.eq(true);
	});
});
