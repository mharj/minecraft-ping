/* eslint-disable no-unused-expressions */
import 'mocha';
import {ping, pingUri} from '../src';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import dotenv from 'dotenv';

const expect = chai.expect;

dotenv.config();
const ifWeHaveEnv = process.env.MINECRAFT_SERVER && process.env.MINECRAFT_SERVER_PORT ? it : it.skip;
chai.use(chaiAsPromised);

describe('minecraft', () => {
	ifWeHaveEnv('connect and get data', async function () {
		this.timeout(10000);
		const {MINECRAFT_SERVER, MINECRAFT_SERVER_PORT} = process.env;
		const data = await ping({hostname: MINECRAFT_SERVER, port: MINECRAFT_SERVER_PORT ? parseInt(MINECRAFT_SERVER_PORT, 10) : undefined});
		expect(data).not.to.be.null;
		expect(data).to.have.all.keys('description', 'players', 'version', 'ping', 'enforcesSecureChat');
		expect(data.description).to.have.all.keys('text');
		expect(data.players).to.contain.keys('online', 'max');
		expect(data.version).to.have.all.keys('name', 'protocol');
	});
	ifWeHaveEnv('connect and get data with uri', async () => {
		const {MINECRAFT_SERVER, MINECRAFT_SERVER_PORT} = process.env;
		const url = new URL('minecraft://' + MINECRAFT_SERVER + (MINECRAFT_SERVER_PORT ? ':' + parseInt(MINECRAFT_SERVER_PORT, 10) : ''));
		const data = await pingUri(Promise.resolve(url));
		expect(data).not.to.be.null;
		expect(data).to.have.all.keys('description', 'players', 'version', 'ping', 'enforcesSecureChat');
		expect(data.description).to.have.all.keys('text');
		expect(data.players).to.contain.keys('online', 'max');
		expect(data.version).to.have.all.keys('name', 'protocol');
	});
	it.skip('should connect eu.mineplex.com', async () => {
		const data = await pingUri(Promise.resolve('minecraft://eu.mineplex.com'));
		expect(data).not.to.be.null;
		expect(data).to.have.all.keys('description', 'players', 'version', 'ping', 'favicon', 'modinfo');
		expect(data.description).to.have.all.keys('text', 'extra');
		expect(data.players).to.have.all.keys('online', 'max', 'sample');
		expect(data.version).to.have.all.keys('name', 'protocol');
	});
	it('should connect play.royallegacy.net', async () => {
		const data = await pingUri(() => 'minecraft://play.royallegacy.net');
		expect(data).not.to.be.null;
		expect(data).to.have.all.keys('description', 'players', 'version', 'ping', 'favicon', 'modinfo');
		expect(data.description).to.have.all.keys('text', 'extra');
		expect(data.players).to.have.all.keys('online', 'max');
		expect(data.version).to.have.all.keys('name', 'protocol');
	});
	it.skip('should connect etherlands.com', async () => {
		const data = await pingUri(() => Promise.resolve('minecraft://etherlands.com'));
		expect(data).not.to.be.null;
		expect(data).to.have.all.keys('description', 'players', 'version', 'ping', 'favicon');
		expect(data.description).to.have.all.keys('text');
		expect(data.players).to.have.all.keys('online', 'max');
		expect(data.version).to.have.all.keys('name', 'protocol');
	});
	it('should not connect', async () => {
		await expect(ping({hostname: 'localhost', port: 26262})).to.eventually.be.rejectedWith(Error);
	}).timeout(5000);
	it('should not connect with small timeout', async () => {
		await expect(ping({hostname: 'google.com', port: 26262}, {timeout: 100})).to.eventually.be.rejectedWith(Error);
	}).timeout(1000);
});
