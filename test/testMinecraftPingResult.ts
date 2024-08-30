/* eslint-disable @typescript-eslint/restrict-plus-operands */
/* eslint-disable no-unused-expressions */
import 'mocha';
import {IMinecraftData, pingResult, pingUriResult} from '../src';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import dotenv from 'dotenv';
import {IResult} from '@luolapeikko/result-option';

const expect = chai.expect;

dotenv.config();
const ifWeHaveEnv = process.env.MINECRAFT_SERVER && process.env.MINECRAFT_SERVER_PORT ? it : it.skip;
chai.use(chaiAsPromised);

describe('minecraft result', () => {
	ifWeHaveEnv('connect and get data', async function () {
		this.timeout(10000);
		const {MINECRAFT_SERVER, MINECRAFT_SERVER_PORT} = process.env;
		const result: IResult<IMinecraftData, Error> = await pingResult({
			hostname: MINECRAFT_SERVER,
			port: MINECRAFT_SERVER_PORT ? parseInt(MINECRAFT_SERVER_PORT, 10) : undefined,
		});
		const data: IMinecraftData = result.unwrap();
		expect(data).not.to.be.null;
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
		expect(data).not.to.be.null;
		expect(data).to.have.all.keys('description', 'players', 'version', 'ping', 'enforcesSecureChat');
		expect(data.description).to.have.all.keys('text');
		expect(data.players).to.contain.keys('online', 'max');
		expect(data.version).to.have.all.keys('name', 'protocol');
	});
	it('should not connect', async () => {
		const res: IResult<IMinecraftData, Error> = await pingResult({hostname: 'localhost', port: 26262});
		expect(res.isErr).to.be.eq(true);
	}).timeout(5000);
	it('should not connect with small timeout', async () => {
		const res: IResult<IMinecraftData, Error> = await pingResult({hostname: 'google.com', port: 26262}, {timeout: 100});
		expect(res.isErr).to.be.eq(true);
	}).timeout(1000);
});
